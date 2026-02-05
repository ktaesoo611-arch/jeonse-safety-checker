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
  buildingYear?: number;  // Construction/registration year (from 표제부 접수일)

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

  // Set flags from active liens
  result.hasAuction = result.activeLiens.some(l => l.type.includes('경매'));
  result.hasSeizure = result.activeLiens.some(l => l.type === '압류');
  result.hasProvisionalSeizure = result.activeLiens.some(l => l.type === '가압류');
  result.hasProvisionalDisposition = result.activeLiens.some(l => l.type === '가처분');

  // Also detect flags from 주요 등기사항 요약 (summary section) - this is authoritative
  detectFlagsFromSummary(allCells, result);

  console.log('[ExcelParser] Parsing complete:', {
    address: result.address,
    buildingName: result.buildingName,
    area: result.area,
    buildingYear: result.buildingYear,
    currentOwner: result.currentOwner?.name,
    mortgages: result.mortgages.length,
    activeMortgages: result.activeMortgages.length,
    totalMortgage: result.totalMortgageAmount,
    liens: result.liens.length,
    activeLiens: result.activeLiens.length,
    hasAuction: result.hasAuction,
    hasSeizure: result.hasSeizure,
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

  // Extract area (전용면적) - must find the EXCLUSIVE unit area, not building/land area
  // Priority: 1) 전용면적 labeled, 2) 전유부분 section, 3) area after unit number

  // First pass: Look for explicitly labeled 전용면적
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    // Pattern: "전용면적 84.99㎡" or "전용면적: 84.99㎡"
    const exclusiveMatch = cell.match(/전용면적[:\s]*(\d+(?:\.\d+)?)\s*㎡/);
    if (exclusiveMatch) {
      result.area = parseFloat(exclusiveMatch[1]);
      break;
    }
    // Pattern: Cell says "전용면적" and next cell has area
    if (cell.includes('전용면적') && i + 1 < cells.length) {
      const nextCell = cells[i + 1];
      const areaMatch = nextCell.match(/(\d+(?:\.\d+)?)\s*㎡/);
      if (areaMatch) {
        result.area = parseFloat(areaMatch[1]);
        break;
      }
    }
  }

  // Second pass: Look for area in 전유부분 context (unit building section)
  if (result.area === 0) {
    let inJeonyuSection = false;
    for (const cell of cells) {
      if (cell.includes('전유부분') || cell.includes('건물의표시')) {
        inJeonyuSection = true;
      }
      if (cell.includes('대지권') || cell.includes('토지의표시') || cell.includes('갑구') || cell.includes('을구')) {
        inJeonyuSection = false;
      }
      if (inJeonyuSection) {
        const areaMatch = cell.match(/(\d+(?:\.\d+)?)\s*㎡/);
        if (areaMatch) {
          const area = parseFloat(areaMatch[1]);
          // Unit areas are typically 10-300㎡
          if (area > 10 && area < 300) {
            result.area = area;
            break;
          }
        }
      }
    }
  }

  // Third pass: Fallback - find area near unit number pattern (층/호)
  if (result.area === 0) {
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      // Look for cells containing both unit info and area
      if (cell.match(/제?\d+층.*제?\d+호/) || cell.match(/제?\d+호/)) {
        const areaMatch = cell.match(/(\d+(?:\.\d+)?)\s*㎡/);
        if (areaMatch) {
          const area = parseFloat(areaMatch[1]);
          if (area > 10 && area < 300) {
            result.area = area;
            break;
          }
        }
        // Check next few cells for area
        for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
          const nextMatch = cells[j].match(/(\d+(?:\.\d+)?)\s*㎡/);
          if (nextMatch) {
            const area = parseFloat(nextMatch[1]);
            if (area > 10 && area < 300) {
              result.area = area;
              break;
            }
          }
        }
        if (result.area > 0) break;
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

  // Extract building year from 표제부 section
  // The building year is found in the FIRST 접수 (registration) entry in 표제부 section
  // We need to find the earliest registration date, not recent transactions

  // First, find the 표제부 section boundaries (before 갑구)
  let headerSectionStart = 0;
  let headerSectionEnd = cells.length;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    // 표제부 starts after the document header
    if (cell.includes('[표 제 부]') || cell.includes('표제부') || cell.includes('전유부분의 건물의 표시')) {
      headerSectionStart = i;
    }
    // 표제부 ends when 갑구 starts
    if ((cell.includes('갑') && cell.includes('구') && !cell.includes('을')) || cell.includes('[갑 구]')) {
      headerSectionEnd = i;
      break;
    }
  }

  // Within 표제부, find all dates and take the EARLIEST (oldest) one
  // This is the original registration/completion year of the building
  let earliestYear = Infinity;
  const foundYears: number[] = [];

  console.log(`[ExcelParser] Searching for buildingYear in 표제부 section: cells ${headerSectionStart}-${headerSectionEnd}`);

  for (let i = headerSectionStart; i < headerSectionEnd; i++) {
    const cell = cells[i];
    // Look for date patterns (YYYY년 MM월 DD일)
    const dateMatches = cell.match(/(\d{4})년\s*\d{1,2}월\s*\d{1,2}일/g);
    if (dateMatches) {
      for (const dateMatch of dateMatches) {
        const yearMatch = dateMatch.match(/(\d{4})년/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1]);
          // Only accept years in reasonable range and find the EARLIEST
          if (year >= 1900 && year <= new Date().getFullYear()) {
            foundYears.push(year);
            if (year < earliestYear) {
              earliestYear = year;
            }
          }
        }
      }
    }
  }

  console.log(`[ExcelParser] Found years in 표제부: ${foundYears.join(', ')} -> earliest: ${earliestYear === Infinity ? 'none' : earliestYear}`);

  if (earliestYear !== Infinity) {
    result.buildingYear = earliestYear;
  }

  // Fallback: try to find explicit construction year patterns
  if (!result.buildingYear) {
    for (const cell of cells) {
      // Look for explicit building year patterns
      const yearMatch = cell.match(/(?:신축|준공|건축)[^\d]*(\d{4})년/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        if (year >= 1900 && year <= new Date().getFullYear()) {
          result.buildingYear = year;
          break;
        }
      }
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

    // Pattern 1: Full text in one cell - "1번근저당권말소" or "1번근저당권설정등기말소"
    const cancelMatch = cell.match(/(\d+)번근저당권.*말소/);
    if (cancelMatch) {
      cancelledMortgages.add(parseInt(cancelMatch[1]));
      console.log(`[ExcelParser] Detected cancelled mortgage #${cancelMatch[1]} (pattern 1: ${cell})`);
      continue;
    }

    // Pattern 2: Split across cells - "1번근저당권설정등" followed by "기말소"
    const partialMatch = cell.match(/(\d+)번근저당권/);
    if (partialMatch) {
      // Look ahead for "말소" or "기말소"
      for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
        if (cells[j].includes('말소') || cells[j] === '기말소') {
          cancelledMortgages.add(parseInt(partialMatch[1]));
          console.log(`[ExcelParser] Detected cancelled mortgage #${partialMatch[1]} (pattern 2: ${cell} + ${cells[j]})`);
          break;
        }
      }
    }
  }

  console.log(`[ExcelParser] Cancelled mortgages: ${Array.from(cancelledMortgages).join(', ') || 'none'}`);

  // Second pass: parse mortgages
  let inCancellationEntry = false;  // Track if we're inside a cancellation entry

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

    // Skip cancellation entries (말소) - these have their own dates we don't want
    if (cell.includes('근저당권말소') || cell.includes('말소')) {
      inCancellationEntry = true;
      continue;
    }

    // Detect new mortgage entry (설정 = establishment, not 말소 = cancellation)
    if (cell === '근저당권설정' || (cell.includes('근저당권설정') && !cell.includes('말소'))) {
      inCancellationEntry = false;  // New entry, reset cancellation flag

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
      console.log(`[ExcelParser] Found mortgage entry #${mortgageRank}, cancelled=${cancelledMortgages.has(mortgageRank)}`);
      continue;
    }

    if (!currentMortgage) continue;
    if (inCancellationEntry) continue;  // Don't extract data from cancellation entries

    // Extract registration date - flexible pattern with optional spaces
    const dateMatch = cell.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
    if (dateMatch && !currentMortgage.registrationDate) {
      currentMortgage.registrationDate = `${dateMatch[1]}년${dateMatch[2]}월${dateMatch[3]}일`;
      console.log(`[ExcelParser] Mortgage #${currentMortgage.rank} date: ${currentMortgage.registrationDate}`);
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

  console.log(`[ExcelParser] Found ${result.mortgages.length} mortgages:`,
    result.mortgages.map(m => `rank=${m.rank} date=${m.registrationDate} amount=${m.maxAmount} status=${m.status}`));
}

/**
 * Parse jeonse rights (전세권) and lease rights (임차권) from 을구
 */
function parseJeonse(cells: string[], result: ExcelDeunggibuData): void {
  let inEulSection = false;
  let currentJeonse: Partial<JeonseInfo> | null = null;
  let jeonseRank = 0;
  const cancelledJeonse = new Set<number>();

  // First pass: find cancelled jeonse/lease rights
  // Support: 전세권, 임차권
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    // Pattern: "1번전세권말소" or "1번임차권말소"
    const cancelMatch = cell.match(/(\d+)번(?:전세권|임차권).*말소/);
    if (cancelMatch) {
      cancelledJeonse.add(parseInt(cancelMatch[1]));
      continue;
    }
    // Split pattern: "1번전세권설정등" followed by "기말소"
    const partialMatch = cell.match(/(\d+)번(?:전세권|임차권)설정등$/);
    if (partialMatch) {
      for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
        if (cells[j].includes('말소') || cells[j] === '기말소') {
          cancelledJeonse.add(parseInt(partialMatch[1]));
          break;
        }
      }
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

    // Detect jeonse/lease entry - support multiple types:
    // 전세권설정 = Jeonse right
    // 임차권등기 = Lease right registration (court-ordered)
    // 임차권설정 = Lease right establishment
    // 주택임차권 = Housing lease right
    let entryType = '';
    if (cell === '전세권설정' || cell.includes('전세권설정')) {
      entryType = '전세권설정';
    } else if (cell === '임차권등기' || cell.includes('임차권등기')) {
      entryType = '임차권등기';
    } else if (cell === '임차권설정' || cell.includes('임차권설정')) {
      entryType = '임차권설정';
    } else if (cell === '주택임차권' || cell.includes('주택임차권')) {
      entryType = '주택임차권';
    }

    if (entryType) {
      if (currentJeonse && (currentJeonse.amount || currentJeonse.type)) {
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
        type: entryType,
      };
      continue;
    }

    if (!currentJeonse) continue;

    // Extract registration date
    const dateMatch = cell.match(/^(\d{4}년\d{1,2}월\d{1,2}일)$/);
    if (dateMatch && !currentJeonse.registrationDate) {
      currentJeonse.registrationDate = dateMatch[1];
      continue;
    }

    // Extract amount - support multiple patterns:
    // 전세금 (jeonse deposit), 보증금 (security deposit), 임차보증금 (lease deposit)
    const amountMatch = cell.match(/(?:전세금|보증금|임차보증금)\s*금?([\d,]+)원/);
    if (amountMatch) {
      currentJeonse.amount = parseInt(amountMatch[1].replace(/,/g, ''));
      continue;
    }

    // Extract tenant - support 전세권자, 임차인, 임차권자
    if (cell === '전세권자' || cell === '임차인' || cell === '임차권자') {
      for (let j = i + 1; j < Math.min(i + 5, cells.length); j++) {
        if (cells[j].match(/^[가-힣]{2,4}(?:\*+)?$/)) {
          currentJeonse.tenant = cells[j];
          break;
        }
      }
      continue;
    }

    // Extract lease period (존속기간)
    const periodMatch = cell.match(/존속기간\s*(\d{4}년\d{1,2}월\d{1,2}일)부터\s*(\d{4}년\d{1,2}월\d{1,2}일)까지/);
    if (periodMatch) {
      currentJeonse.startDate = periodMatch[1];
      currentJeonse.endDate = periodMatch[2];
    }
  }

  if (currentJeonse && (currentJeonse.amount || currentJeonse.type)) {
    result.jeonseRights.push(currentJeonse as JeonseInfo);
  }

  console.log(`[ExcelParser] Found ${result.jeonseRights.length} jeonse/lease rights:`,
    result.jeonseRights.map(j => `${j.type || '전세권'} rank=${j.rank} amount=${j.amount} status=${j.status}`));
}

/**
 * Parse liens (압류, 가압류, 가처분, 경매) from both 갑구 and 을구
 * Note: Liens can appear in 갑구 (ownership section) as well as 을구
 */
function parseLiens(cells: string[], result: ExcelDeunggibuData): void {
  let inRelevantSection = false;
  const processedIndices = new Set<number>();

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    // Start tracking from 갑구 or 을구 sections
    if ((cell.includes('갑') && cell.includes('구')) ||
        (cell.includes('을') && cell.includes('구'))) {
      inRelevantSection = true;
      continue;
    }

    // Stop at summary section
    if (cell.includes('주요 등기사항 요약')) {
      break;
    }

    if (!inRelevantSection) continue;
    if (processedIndices.has(i)) continue;

    // Check if this entry is cancelled (말소)
    // Look for 말소 in nearby cells or check if the cell itself indicates cancellation
    let isCancelled = false;
    for (let j = Math.max(0, i - 2); j <= Math.min(cells.length - 1, i + 3); j++) {
      if (cells[j].includes('말소')) {
        isCancelled = true;
        break;
      }
    }

    // Detect lien types using includes() for flexible matching
    let lienType = '';

    // Order matters: check 가압류 before 압류 to avoid false matches
    if (cell.includes('경매') || cell.includes('임의경매') || cell.includes('강제경매')) {
      lienType = '경매';
    } else if (cell.includes('가압류')) {
      lienType = '가압류';
    } else if (cell.includes('가처분')) {
      lienType = '가처분';
    } else if (cell.includes('압류') && !cell.includes('가압류')) {
      // Make sure it's 압류 and not 가압류
      lienType = '압류';
    }

    if (lienType) {
      processedIndices.add(i);

      const lien: LienInfo = {
        type: lienType,
        registrationDate: '',
        creditor: '',
        amount: null,
        caseNumber: '',
        status: isCancelled ? 'cancelled' : 'active',
        cancellationDate: null,
      };

      // Look for date nearby
      for (let j = i - 5; j < i + 8 && j < cells.length; j++) {
        if (j < 0) continue;
        const dateMatch = cells[j].match(/(\d{4}년\s*\d{1,2}월\s*\d{1,2}일)/);
        if (dateMatch && !lien.registrationDate) {
          lien.registrationDate = dateMatch[1];
        }
      }

      // Look for case number (사건번호) nearby
      for (let j = i - 3; j < i + 8 && j < cells.length; j++) {
        if (j < 0) continue;
        const caseMatch = cells[j].match(/(\d{4}타[채기]\d+)/);
        if (caseMatch) {
          lien.caseNumber = caseMatch[1];
          break;
        }
      }

      // Look for creditor/applicant nearby
      for (let j = i; j < i + 10 && j < cells.length; j++) {
        if (cells[j].includes('채권자') || cells[j].includes('권리자') || cells[j].includes('신청인')) {
          // Next cell might have the name
          if (j + 1 < cells.length && cells[j + 1].match(/^[가-힣]+$/)) {
            lien.creditor = cells[j + 1];
            break;
          }
        }
      }

      result.liens.push(lien);

      console.log(`[ExcelParser] Found lien: ${lienType}, cancelled: ${isCancelled}, date: ${lien.registrationDate}`);
    }
  }
}

/**
 * Detect legal issue flags from 주요 등기사항 요약 (summary) section
 * This is authoritative and supplements liens array detection
 */
function detectFlagsFromSummary(cells: string[], result: ExcelDeunggibuData): void {
  let inSummarySection = false;

  for (const cell of cells) {
    if (cell.includes('주요 등기사항 요약') || cell.includes('주요등기사항요약')) {
      inSummarySection = true;
      continue;
    }

    if (inSummarySection) {
      // Detect flags from summary text
      // Check for 가압류 first (before 압류 to avoid false match)
      if (cell.includes('가압류') && !cell.includes('없음')) {
        result.hasProvisionalSeizure = true;
        console.log('[ExcelParser] Summary detected: 가압류');
      }
      // Check 압류 only if not part of 가압류
      if (cell.includes('압류') && !cell.includes('가압류') && !cell.includes('없음')) {
        result.hasSeizure = true;
        console.log('[ExcelParser] Summary detected: 압류');
      }
      if (cell.includes('가처분') && !cell.includes('없음')) {
        result.hasProvisionalDisposition = true;
        console.log('[ExcelParser] Summary detected: 가처분');
      }
      if ((cell.includes('경매') || cell.includes('임의경매') || cell.includes('강제경매')) && !cell.includes('없음')) {
        result.hasAuction = true;
        console.log('[ExcelParser] Summary detected: 경매');
      }

      // Also check for explicit "있음" indicators
      if (cell.includes('압류') && cell.includes('있음') && !cell.includes('가압류')) {
        result.hasSeizure = true;
      }
      if (cell.includes('가압류') && cell.includes('있음')) {
        result.hasProvisionalSeizure = true;
      }
      if (cell.includes('가처분') && cell.includes('있음')) {
        result.hasProvisionalDisposition = true;
      }
      if (cell.includes('경매') && cell.includes('있음')) {
        result.hasAuction = true;
      }
    }
  }

  console.log('[ExcelParser] Final flags after summary check:', {
    hasAuction: result.hasAuction,
    hasSeizure: result.hasSeizure,
    hasProvisionalSeizure: result.hasProvisionalSeizure,
    hasProvisionalDisposition: result.hasProvisionalDisposition,
  });
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
