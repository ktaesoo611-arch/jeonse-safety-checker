/**
 * Excel-based 등기부등본 Parser
 *
 * Parses 등기부등본 data from Excel format downloaded from Apick API.
 * Excel format provides cleaner, more structured data than PDF+OCR.
 */

import * as XLSX from 'xlsx';

export interface OwnerInfo {
  name: string;
  registrationNumber: string;  // 주민등록번호 (masked)
  address: string;
  share: string;  // e.g., "단독소유", "지분 2분의 1"
  registrationDate: string;
  cause: string;  // e.g., "매매", "상속"
  transactionAmount: number | null;  // 거래가액
}

export interface MortgageInfo {
  rank: number;
  registrationDate: string;
  maxAmount: number;  // 채권최고액
  debtor: string;
  creditor: string;
  creditorAddress: string;
  status: 'active' | 'cancelled';
  cancellationDate: string | null;
}

export interface JeonseInfo {
  rank: number;
  registrationDate: string;
  amount: number;
  tenant: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'cancelled';
  cancellationDate: string | null;
  type?: string;  // 전세권설정, 임차권등기, 임차권설정
}

export interface LienInfo {
  type: string;  // 압류, 가압류, 가처분, 경매
  registrationDate: string;
  creditor: string;
  amount: number | null;
  caseNumber: string;
  status: 'active' | 'cancelled';
  cancellationDate: string | null;
}

export interface ExcelDeunggibuData {
  // Basic property info
  propertyType: string;  // 집합건물, 토지, 건물
  address: string;
  fullAddress: string;
  buildingName: string;
  unitNumber: string;  // 동/호
  area: number;  // 전용면적
  buildingStructure: string;
  totalFloors: number | null;

  // Ownership history
  currentOwner: OwnerInfo | null;
  ownerHistory: OwnerInfo[];

  // Mortgages (근저당권) - 을구
  mortgages: MortgageInfo[];
  activeMortgages: MortgageInfo[];

  // Jeonse/Lease rights (전세권) - 을구
  jeonseRights: JeonseInfo[];
  activeJeonseRights: JeonseInfo[];

  // Liens and restrictions (압류, 가압류, 가처분, 경매) - 을구
  liens: LienInfo[];
  activeLiens: LienInfo[];

  // Flags
  hasAuction: boolean;
  hasSeizure: boolean;
  hasProvisionalSeizure: boolean;
  hasProvisionalDisposition: boolean;

  // Calculated totals (active only)
  totalMortgageAmount: number;
  totalEstimatedPrincipal: number;  // 채권최고액 * 0.83 (typical ratio: principal ≈ 83% of 채권최고액)
  totalJeonseAmount: number;

  // Parsing metadata
  parsingMethod: 'excel';
  confidence: number;
  documentDate: string;  // 열람일시
  uniqueNumber: string;  // 고유번호
}

type Section = 'none' | 'header' | 'building' | 'land' | 'unit' | 'gap' | 'eul' | 'summary';

/**
 * Parse 등기부등본 from Excel buffer
 */
export function parseDeunggibuExcel(buffer: Buffer): ExcelDeunggibuData {
  console.log('[ExcelParser] Starting Excel parsing...');

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  console.log(`[ExcelParser] Sheets found: ${workbook.SheetNames.join(', ')}`);

  // Initialize result
  const result: ExcelDeunggibuData = {
    propertyType: '',
    address: '',
    fullAddress: '',
    buildingName: '',
    unitNumber: '',
    area: 0,
    buildingStructure: '',
    totalFloors: null,
    currentOwner: null,
    ownerHistory: [],
    mortgages: [],
    activeMortgages: [],
    jeonseRights: [],
    activeJeonseRights: [],
    liens: [],
    activeLiens: [],
    hasAuction: false,
    hasSeizure: false,
    hasProvisionalSeizure: false,
    hasProvisionalDisposition: false,
    totalMortgageAmount: 0,
    totalEstimatedPrincipal: 0,
    totalJeonseAmount: 0,
    parsingMethod: 'excel',
    confidence: 0.95,
    documentDate: '',
    uniqueNumber: '',
  };

  // Collect all cells into a single text stream for parsing
  const allCells: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as any[][];

    // Flatten all cells into a single array
    for (const row of data) {
      if (!row) continue;
      for (const cell of row) {
        if (cell !== null && cell !== undefined && cell !== '') {
          allCells.push(String(cell).trim());
        }
      }
    }
  }

  // Join all text
  const fullText = allCells.join(' ');

  // Extract basic info
  extractBasicInfo(allCells, fullText, result);

  // Parse sections
  parseOwnership(allCells, result);
  parseMortgages(allCells, result);
  parseJeonse(allCells, result);
  parseLiens(allCells, result);

  // Filter active items
  result.activeMortgages = result.mortgages.filter(m => m.status === 'active');
  result.activeJeonseRights = result.jeonseRights.filter(j => j.status === 'active');
  result.activeLiens = result.liens.filter(l => l.status === 'active');

  // Calculate totals
  result.totalMortgageAmount = result.activeMortgages.reduce((sum, m) => sum + m.maxAmount, 0);
  result.totalEstimatedPrincipal = Math.round(result.totalMortgageAmount * 0.83);
  result.totalJeonseAmount = result.activeJeonseRights.reduce((sum, j) => sum + j.amount, 0);

  // Set flags
  result.hasAuction = result.activeLiens.some(l => l.type.includes('경매'));
  result.hasSeizure = result.activeLiens.some(l => l.type === '압류');
  result.hasProvisionalSeizure = result.activeLiens.some(l => l.type === '가압류');
  result.hasProvisionalDisposition = result.activeLiens.some(l => l.type === '가처분');

  console.log('[ExcelParser] Parsing complete:', {
    address: result.address,
    buildingName: result.buildingName,
    area: result.area,
    currentOwner: result.currentOwner?.name,
    mortgages: result.mortgages.length,
    activeMortgages: result.activeMortgages.length,
    totalMortgage: result.totalMortgageAmount,
  });

  return result;
}

/**
 * Extract basic property information
 */
function extractBasicInfo(cells: string[], fullText: string, result: ExcelDeunggibuData): void {
  // Property type
  if (fullText.includes('집합건물')) {
    result.propertyType = '집합건물';
  } else if (fullText.includes('토지')) {
    result.propertyType = '토지';
  } else if (fullText.includes('건물')) {
    result.propertyType = '건물';
  }

  // Find header line with full address
  for (const cell of cells) {
    if (cell.startsWith('[집합건물]') || cell.startsWith('[토지]') || cell.startsWith('[건물]')) {
      result.fullAddress = cell.replace(/^\[[^\]]+\]\s*/, '').trim();

      // Extract building name
      const buildingMatch = cell.match(/([가-힣]+(?:아파트|빌라|오피스텔|맨션|타워|파크|힐스|푸르지오|자이|래미안|롯데캐슬|위브|뷰|스카이|센트럴|파크뷰|e편한세상|센트레빌)[가-힣0-9]*)/);
      if (buildingMatch) {
        result.buildingName = buildingMatch[1];
      }

      // Extract unit number (동/호)
      const unitMatch = cell.match(/제?(\d+)동\s*제?(\d+)층?\s*제?(\d+)호/);
      if (unitMatch) {
        result.unitNumber = `${unitMatch[1]}동 ${unitMatch[3]}호`;
      }
      break;
    }
  }

  // Extract address from 도로명주소
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].includes('[도로명주소]') && i + 1 < cells.length) {
      // Next cell with actual address pattern
      for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
        if (cells[j].match(/[가-힣]+(?:시|도)\s+[가-힣]+(?:구|시|군)/)) {
          result.address = cells[j].trim();
          break;
        }
      }
      break;
    }
  }

  // If no 도로명주소, use address from header
  if (!result.address && result.fullAddress) {
    const addrMatch = result.fullAddress.match(/([가-힣]+(?:시|도)\s+[가-힣]+[^\d]*\d+[^\s]*)/);
    if (addrMatch) {
      result.address = addrMatch[1];
    }
  }

  // Extract area (전용면적)
  for (const cell of cells) {
    // Look for area in 전유부분 section
    const areaMatch = cell.match(/(\d+(?:\.\d+)?)\s*㎡/);
    if (areaMatch && parseFloat(areaMatch[1]) < 500) {  // Likely unit area, not floor area
      const area = parseFloat(areaMatch[1]);
      if (area > 10 && area < 300 && result.area === 0) {
        result.area = area;
      }
    }
  }

  // Extract building structure
  for (const cell of cells) {
    if (cell.includes('철근콘크리트구조') || cell.includes('철골구조')) {
      result.buildingStructure = cell;
    }
    const floorMatch = cell.match(/(\d+)층/);
    if (floorMatch && cell.includes('지붕')) {
      result.totalFloors = parseInt(floorMatch[1]);
    }
  }

  // Extract document date
  for (const cell of cells) {
    const dateMatch = cell.match(/열람일시\s*:\s*(\d{4}년\d{2}월\d{2}일\s*\d{2}시\d{2}분\d{2}초)/);
    if (dateMatch) {
      result.documentDate = dateMatch[1];
      break;
    }
  }

  // Extract unique number
  for (const cell of cells) {
    const uniqueMatch = cell.match(/고유번호\s*(\d{4}-\d{4}-\d+)/);
    if (uniqueMatch) {
      result.uniqueNumber = uniqueMatch[1];
      break;
    }
  }
}

/**
 * Parse ownership (갑구) section
 */
function parseOwnership(cells: string[], result: ExcelDeunggibuData): void {
  let inGapSection = false;
  let currentOwnerEntry: Partial<OwnerInfo> = {};
  let collectingOwner = false;
  let ownerRank = 0;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    // Detect 갑구 section
    if (cell.includes('갑') && cell.includes('구') && !cell.includes('을')) {
      inGapSection = true;
      continue;
    }

    // Exit 갑구 when 을구 starts
    if (cell.includes('을') && cell.includes('구')) {
      inGapSection = false;
      continue;
    }

    if (!inGapSection) continue;

    // Detect new ownership entry
    if (cell === '소유권보존' || cell === '소유권이전' || cell.includes('지분전부')) {
      // Save previous entry if exists
      if (currentOwnerEntry.name) {
        result.ownerHistory.push(currentOwnerEntry as OwnerInfo);
      }
      ownerRank++;
      currentOwnerEntry = {
        name: '',
        registrationNumber: '',
        address: '',
        share: '',
        registrationDate: '',
        cause: '',
        transactionAmount: null,
      };
      collectingOwner = true;

      // Look for cause (매매, 상속, etc.)
      for (let j = i + 1; j < Math.min(i + 10, cells.length); j++) {
        if (cells[j] === '매매' || cells[j] === '상속' || cells[j] === '증여') {
          currentOwnerEntry.cause = cells[j];
          break;
        }
      }
      continue;
    }

    if (!collectingOwner) continue;

    // Extract date
    const dateMatch = cell.match(/^(\d{4}년\d{1,2}월\d{1,2}일)$/);
    if (dateMatch && !currentOwnerEntry.registrationDate) {
      currentOwnerEntry.registrationDate = dateMatch[1];
      continue;
    }

    // Extract owner name and registration number
    const ownerMatch = cell.match(/^(소유자|공유자)\s*([가-힣]{2,4})\s*(\d{6}-\*+)$/);
    if (ownerMatch) {
      currentOwnerEntry.name = ownerMatch[2];
      currentOwnerEntry.registrationNumber = ownerMatch[3];
      currentOwnerEntry.share = ownerMatch[1] === '소유자' ? '단독소유' : '';
      continue;
    }

    // Just name with registration number on next cell
    const nameMatch = cell.match(/^([가-힣]{2,4})\s+(\d{6}-\*+)$/);
    if (nameMatch) {
      currentOwnerEntry.name = nameMatch[1];
      currentOwnerEntry.registrationNumber = nameMatch[2];
      continue;
    }

    // Share info
    if (cell.includes('지분')) {
      currentOwnerEntry.share = cell.trim();
      continue;
    }

    // Transaction amount
    const amountMatch = cell.match(/거래가액\s*금?([\d,]+)원/);
    if (amountMatch) {
      currentOwnerEntry.transactionAmount = parseInt(amountMatch[1].replace(/,/g, ''));
      continue;
    }

    // Address (contains 시/도)
    if (cell.match(/[가-힣]+(?:시|도)\s+[가-힣]+(?:구|시|군)/) && !currentOwnerEntry.address) {
      currentOwnerEntry.address = cell.trim();
    }
  }

  // Save last entry
  if (currentOwnerEntry.name) {
    result.ownerHistory.push(currentOwnerEntry as OwnerInfo);
  }

  // Set current owner (last in history)
  if (result.ownerHistory.length > 0) {
    result.currentOwner = result.ownerHistory[result.ownerHistory.length - 1];
  }
}

/**
 * Parse mortgages (근저당권) from 을구
 */
function parseMortgages(cells: string[], result: ExcelDeunggibuData): void {
  let inEulSection = false;
  let currentMortgage: Partial<MortgageInfo> | null = null;
  let mortgageRank = 0;
  const cancelledMortgages = new Set<number>();

  // First pass: find cancelled mortgages
  // The cancellation text can be split across cells, e.g., "1번근저당권설정등" and "기말소"
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    // Pattern 1: Full text in one cell
    const cancelMatch = cell.match(/(\d+)번근저당권.*말소/);
    if (cancelMatch) {
      cancelledMortgages.add(parseInt(cancelMatch[1]));
      continue;
    }

    // Pattern 2: Split across cells - "1번근저당권설정등" followed by "기말소"
    const partialMatch = cell.match(/(\d+)번근저당권설정등$/);
    if (partialMatch) {
      // Look ahead for "기말소" or just "말소"
      for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
        if (cells[j].includes('말소') || cells[j] === '기말소') {
          cancelledMortgages.add(parseInt(partialMatch[1]));
          break;
        }
      }
    }
  }

  // Second pass: parse mortgages
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    // Detect 을구 section
    if (cell.includes('을') && cell.includes('구')) {
      inEulSection = true;
      continue;
    }

    // Exit on summary section
    if (cell.includes('주요 등기사항 요약')) {
      break;
    }

    if (!inEulSection) continue;

    // Detect new mortgage entry
    if (cell === '근저당권설정') {
      // Save previous mortgage if exists
      if (currentMortgage && currentMortgage.maxAmount) {
        result.mortgages.push(currentMortgage as MortgageInfo);
      }

      mortgageRank++;
      currentMortgage = {
        rank: mortgageRank,
        registrationDate: '',
        maxAmount: 0,
        debtor: '',
        creditor: '',
        creditorAddress: '',
        status: cancelledMortgages.has(mortgageRank) ? 'cancelled' : 'active',
        cancellationDate: null,
      };
      continue;
    }

    if (!currentMortgage) continue;

    // Extract registration date
    const dateMatch = cell.match(/^(\d{4}년\d{1,2}월\d{1,2}일)$/);
    if (dateMatch && !currentMortgage.registrationDate) {
      currentMortgage.registrationDate = dateMatch[1];
      continue;
    }

    // Extract 채권최고액
    const amountMatch = cell.match(/채권최고액\s*금?([\d,]+)원/);
    if (amountMatch) {
      currentMortgage.maxAmount = parseInt(amountMatch[1].replace(/,/g, ''));
      continue;
    }

    // Extract debtor
    if (cell === '채무자') {
      // Look ahead for name
      for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
        if (cells[j].match(/^[가-힣]{2,4}$/)) {
          currentMortgage.debtor = cells[j];
          break;
        }
      }
      continue;
    }

    // Extract creditor (근저당권자)
    if (cell === '근저당권자') {
      // Look ahead for name
      for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
        const creditorCell = cells[j];
        if (creditorCell.match(/[가-힣]+(?:은행|보증|금융|신용|캐피탈|저축|주식회사)/)) {
          currentMortgage.creditor = creditorCell;
          break;
        }
      }
      continue;
    }
  }

  // Save last mortgage
  if (currentMortgage && currentMortgage.maxAmount) {
    result.mortgages.push(currentMortgage as MortgageInfo);
  }
}

/**
 * Parse jeonse rights (전세권) from 을구
 */
function parseJeonse(cells: string[], result: ExcelDeunggibuData): void {
  let inEulSection = false;
  let currentJeonse: Partial<JeonseInfo> | null = null;
  let jeonseRank = 0;
  const cancelledJeonse = new Set<number>();

  // First pass: find cancelled jeonse
  for (const cell of cells) {
    const cancelMatch = cell.match(/(\d+)번전세권.*말소/);
    if (cancelMatch) {
      cancelledJeonse.add(parseInt(cancelMatch[1]));
    }
  }

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    if (cell.includes('을') && cell.includes('구')) {
      inEulSection = true;
      continue;
    }

    if (cell.includes('주요 등기사항 요약')) {
      break;
    }

    if (!inEulSection) continue;

    // Detect jeonse entry
    if (cell === '전세권설정') {
      if (currentJeonse && currentJeonse.amount) {
        result.jeonseRights.push(currentJeonse as JeonseInfo);
      }

      jeonseRank++;
      currentJeonse = {
        rank: jeonseRank,
        registrationDate: '',
        amount: 0,
        tenant: '',
        startDate: '',
        endDate: '',
        status: cancelledJeonse.has(jeonseRank) ? 'cancelled' : 'active',
        cancellationDate: null,
      };
      continue;
    }

    if (!currentJeonse) continue;

    // Extract amount
    const amountMatch = cell.match(/전세금\s*금?([\d,]+)원/);
    if (amountMatch) {
      currentJeonse.amount = parseInt(amountMatch[1].replace(/,/g, ''));
    }
  }

  if (currentJeonse && currentJeonse.amount) {
    result.jeonseRights.push(currentJeonse as JeonseInfo);
  }
}

/**
 * Parse liens (압류, 가압류, 가처분, 경매) from 을구
 */
function parseLiens(cells: string[], result: ExcelDeunggibuData): void {
  let inEulSection = false;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    if (cell.includes('을') && cell.includes('구')) {
      inEulSection = true;
      continue;
    }

    if (cell.includes('주요 등기사항 요약')) {
      break;
    }

    if (!inEulSection) continue;

    // Detect lien types
    let lienType = '';
    if (cell.includes('경매개시결정')) {
      lienType = '경매';
    } else if (cell === '가압류' || cell.includes('가압류결정')) {
      lienType = '가압류';
    } else if (cell === '압류' && !cell.includes('가압류')) {
      lienType = '압류';
    } else if (cell === '가처분' || cell.includes('가처분결정')) {
      lienType = '가처분';
    }

    if (lienType) {
      const lien: LienInfo = {
        type: lienType,
        registrationDate: '',
        creditor: '',
        amount: null,
        caseNumber: '',
        status: 'active',
        cancellationDate: null,
      };

      // Look for date nearby
      for (let j = i - 3; j < i + 5 && j < cells.length; j++) {
        if (j < 0) continue;
        const dateMatch = cells[j].match(/^(\d{4}년\d{1,2}월\d{1,2}일)$/);
        if (dateMatch) {
          lien.registrationDate = dateMatch[1];
          break;
        }
      }

      result.liens.push(lien);
    }
  }
}

/**
 * Extract raw text from Excel for LLM parsing fallback
 */
export function extractTextFromExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const allCells: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<any[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as any[][];

    allCells.push(`=== ${sheetName} ===`);

    for (const row of data) {
      if (!row) continue;
      const nonEmpty = row.filter(cell => cell !== '' && cell !== null && cell !== undefined);
      if (nonEmpty.length > 0) {
        allCells.push(nonEmpty.map(c => String(c).trim()).join('\t'));
      }
    }
  }

  return allCells.join('\n');
}
