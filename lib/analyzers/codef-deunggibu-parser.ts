/**
 * CODEF JSON → ExcelDeunggibuData Parser
 *
 * Maps the actual CODEF API response (nested resRegisterEntriesList structure)
 * to the same ExcelDeunggibuData interface used by the Excel parser.
 *
 * CODEF response structure:
 * - data.resRegisterEntriesList[0].resRegistrationHisList[]
 *   - resType: '표제부' | '갑구' | '을구'
 *   - resContentsList[]: rows with resType2 ('1'=header, '2'=data)
 *     - resDetailList[]: columns with resNumber and resContents
 *
 * Text formatting conventions:
 * - &text& = cancelled/struck-through entry (말소)
 * - 4^, 2^, 6^ = continuation line indents
 * - | = annotation prefix
 * - \n = newline within a cell
 */

import {
  ExcelDeunggibuData,
  OwnerInfo,
  MortgageInfo,
  JeonseInfo,
  LienInfo,
} from './excel-deunggibu-parser';
import { CodefRegistryData, CodefRegistrationSection, CodefContentRow } from '../apis/codef';

/**
 * Parse CODEF registry response into ExcelDeunggibuData format.
 * Confidence is 0.95 since we parse structured but text-based columns.
 */
export function parseCodefRegistryData(data: CodefRegistryData): ExcelDeunggibuData {
  console.log('[CodefParser] Parsing CODEF registry data...');

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

  (result as any).parsingMethod = 'codef';

  const entries = data.resRegisterEntriesList;
  if (!entries || entries.length === 0) {
    console.log('[CodefParser] No register entries found');
    return result;
  }

  const entry = entries[0];

  // Extract property type from resRealty or resDocTitle
  if (entry.resRealty) {
    const typeMatch = entry.resRealty.match(/\[(집합건물|토지|건물)\]/);
    if (typeMatch) {
      result.propertyType = typeMatch[1];
    }
    // Extract address from resRealty
    const addrMatch = entry.resRealty.replace(/\[.*?\]/, '').trim();
    if (addrMatch) {
      result.fullAddress = addrMatch;
      result.address = addrMatch;
    }
  }

  // Process each section
  const sections = entry.resRegistrationHisList || [];
  for (const section of sections) {
    switch (section.resType) {
      case '표제부':
        parseHeaderSection(section, result);
        break;
      case '갑구':
        parseSectionA(section, result);
        break;
      case '을구':
        parseSectionB(section, result);
        break;
    }
  }

  // Combine dong number with unit number if both exist
  const dongNumber = (result as any)._dongNumber;
  if (dongNumber && result.unitNumber) {
    result.unitNumber = `${dongNumber}동 ${result.unitNumber}`;
  } else if (dongNumber && !result.unitNumber) {
    result.unitNumber = `${dongNumber}동`;
  }
  delete (result as any)._dongNumber;

  // Filter active items
  result.activeMortgages = result.mortgages.filter(m => m.status === 'active');
  result.activeJeonseRights = result.jeonseRights.filter(j => j.status === 'active');
  result.activeLiens = result.liens.filter(l => l.status === 'active');

  // Calculate totals
  result.totalMortgageAmount = result.activeMortgages.reduce((sum, m) => sum + m.maxAmount, 0);
  result.totalEstimatedPrincipal = Math.round(result.totalMortgageAmount * 0.77);
  result.totalJeonseAmount = result.activeJeonseRights.reduce((sum, j) => sum + j.amount, 0);

  // Set flags from active liens
  result.hasAuction = result.activeLiens.some(l => l.type.includes('경매'));
  result.hasSeizure = result.activeLiens.some(l => l.type === '압류');
  result.hasProvisionalSeizure = result.activeLiens.some(l => l.type === '가압류');
  result.hasProvisionalDisposition = result.activeLiens.some(l => l.type === '가처분');

  console.log('[CodefParser] Parsing complete:', {
    address: result.address,
    buildingName: result.buildingName,
    area: result.area,
    currentOwner: result.currentOwner?.name,
    mortgages: result.mortgages.length,
    activeMortgages: result.activeMortgages.length,
    totalMortgage: result.totalMortgageAmount,
    jeonseRights: result.jeonseRights.length,
    liens: result.liens.length,
    hasAuction: result.hasAuction,
    hasSeizure: result.hasSeizure,
  });

  return result;
}

// --- Section parsers ---

/** Normalize resType1 by removing all spaces for comparison */
function normalizeResType1(type: string): string {
  return (type || '').replace(/\s+/g, '');
}

/**
 * Parse 표제부 (Title section) for property info
 */
function parseHeaderSection(section: CodefRegistrationSection, result: ExcelDeunggibuData): void {
  const dataRows = getDataRows(section);
  const normalizedType = normalizeResType1(section.resType1);

  if (normalizedType === '전유부분의건물의표시') {
    // Extract unit info (건물번호, 건물내역)
    for (const row of dataRows) {
      const cols = getColumns(row);
      // Column 2 = 건물번호 (e.g., "제1층 제104호")
      if (cols[2] && !result.unitNumber) {
        const text = cleanText(cols[2]);
        // Try different unit number patterns
        const unitMatch = text.match(/제?(\d+)층\s*제?(\d+)호/) ||
                         text.match(/(\d+)층\s*(\d+)호/);
        if (unitMatch) {
          result.unitNumber = `${unitMatch[1]}층 ${unitMatch[2]}호`;
        }
      }
      // Column 3 = 건물내역 (structure + area)
      if (cols[3]) {
        const text = cleanText(cols[3]);
        const areaMatch = text.match(/([\d.]+)㎡/);
        if (areaMatch && !result.area) {
          result.area = parseFloat(areaMatch[1]);
        }
        // Extract structure info
        if (!result.buildingStructure) {
          const structureMatch = text.match(/^([가-힣]+구조)/);
          if (structureMatch) {
            result.buildingStructure = structureMatch[1];
          }
        }
      }
    }
  } else if (normalizedType === '1동의건물의표시') {
    // Extract building name, dong number, and overall structure
    for (const row of dataRows) {
      const cols = getColumns(row);
      // Column 2 = 소재지번,건물명칭및번호
      if (cols[2]) {
        // Split on newlines BEFORE cleaning to preserve line structure
        const rawLines = (cols[2] || '').replace(/&/g, '').split('\n');
        const lines = rawLines.map(l => l.replace(/\d+\^/g, '').replace(/\|/g, '').trim()).filter(Boolean);

        // Extract dong number (e.g., "제1105동")
        for (const line of lines) {
          const dongMatch = line.match(/제?(\d+)동/);
          if (dongMatch && !result.unitNumber) {
            // Store dong temporarily, will be combined with ho later
            (result as any)._dongNumber = dongMatch[1];
          }
        }

        // Look for building/apartment name - try specific keywords first
        for (const line of lines) {
          if (line.match(/아파트|빌라|오피스텔|맨션|타워|빌딩|자이|힐스테이트|래미안|푸르지오|e편한세상|롯데캐슬|SK뷰|더샵|아이파크/) && !result.buildingName) {
            result.buildingName = line.trim();
          }
        }

        // If no building name found with keywords, look for any Korean building-like name
        // Pattern: Korean characters possibly containing numbers, ending with common suffixes
        if (!result.buildingName) {
          for (const line of lines) {
            // Match building names: must be substantial and not just address parts
            if (line.length >= 4 && !line.match(/^\d/) && !line.match(/^[가-힣]{1,2}(시|군|구|읍|면|리|동|로|길)/) && line.match(/[가-힣]$/)) {
              // Check if line looks like a building name (not pure address)
              const isAddress = line.match(/^[가-힣]+(시|군|구)\s/) || line.match(/\d+번지/);
              if (!isAddress) {
                result.buildingName = line.trim();
                break;
              }
            }
          }
        }

        // If no specific building name found, use address parts
        if (!result.buildingName && !result.address) {
          result.address = lines.filter(l => l.includes('시') || l.includes('구') || l.includes('동')).join(' ');
        }
      }
      // Column 3 = 건물내역 (overall building structure)
      if (cols[3] && !result.totalFloors) {
        const text = cleanText(cols[3]);
        const floorMatch = text.match(/(\d+)층/g);
        if (floorMatch) {
          const floors = floorMatch.map(f => parseInt(f)).filter(f => !isNaN(f));
          result.totalFloors = Math.max(...floors);
        }
      }
    }
  } else if (normalizedType === '대지권의목적인토지의표시') {
    // Extract land area
    for (const row of dataRows) {
      const cols = getColumns(row);
      if (cols[1]) {
        const addrText = cleanText(cols[1]);
        if (!result.address) {
          result.address = addrText.replace(/^\d+\./, '').replace(/\d+\^/g, '').trim();
        }
      }
    }
  }
}

/**
 * Parse 갑구 (Section A) - Ownership, liens, seizures, auctions
 */
function parseSectionA(section: CodefRegistrationSection, result: ExcelDeunggibuData): void {
  const dataRows = getDataRows(section);

  for (const row of dataRows) {
    const cols = getColumns(row);
    const purpose = cleanText(cols[1] || '');
    const isCancelled = isRowCancelled(row);

    // Ownership entries
    if (purpose.includes('소유권이전') || purpose.includes('소유권보존')) {
      const owner = parseOwnerFromRow(cols, isCancelled);
      if (owner) {
        result.ownerHistory.push(owner);
      }
      continue;
    }

    // Cancellation entries (e.g., "2번가압류등기말소")
    if (purpose.includes('말소') || purpose.includes('등기말소')) {
      continue; // The cancelled entries are already marked by &...& format
    }

    // Name change entries
    if (purpose.includes('표시변경') || purpose.includes('명의인표시')) {
      continue;
    }

    // Lien/seizure/auction entries
    if (purpose.includes('압류') || purpose.includes('가압류') ||
        purpose.includes('가처분') || purpose.includes('경매')) {
      const lien = parseLienFromRow(cols, purpose, isCancelled);
      if (lien) {
        result.liens.push(lien);
      }
    }
  }

  // Set current owner (last non-cancelled in history)
  const activeOwners = result.ownerHistory.filter(o => !(o as any).cancelled);
  if (activeOwners.length > 0) {
    result.currentOwner = activeOwners[activeOwners.length - 1];
  }
}

/**
 * Parse 을구 (Section B) - Mortgages (근저당권) and Jeonse rights (전세권)
 */
function parseSectionB(section: CodefRegistrationSection, result: ExcelDeunggibuData): void {
  const dataRows = getDataRows(section);
  let mortgageRank = 0;
  let jeonseRank = 0;

  for (const row of dataRows) {
    const cols = getColumns(row);
    const purpose = cleanText(cols[1] || '');
    const isCancelled = isRowCancelled(row);

    // Skip cancellation entries first - must check before mortgage/jeonse patterns
    // "1번근저당권설정등기말소" contains "근저당권설정" but is a cancellation record
    if (purpose.includes('말소')) {
      // Handle cancellation: mark the referenced entry as cancelled
      if (purpose.includes('근저당권')) {
        const rankMatch = purpose.match(/(\d+)번/);
        if (rankMatch) {
          const cancelled = result.mortgages.find(m => m.rank === parseInt(rankMatch[1]));
          if (cancelled) {
            cancelled.status = 'cancelled';
            cancelled.cancellationDate = extractDate(cols[2] || '') || null;
          }
        }
      }
      if (purpose.includes('전세권')) {
        const rankMatch = purpose.match(/(\d+)번/);
        if (rankMatch) {
          const cancelled = result.jeonseRights.find(j => j.rank === parseInt(rankMatch[1]));
          if (cancelled) {
            cancelled.status = 'cancelled';
            cancelled.cancellationDate = extractDate(cols[2] || '') || null;
          }
        }
      }
      continue; // Don't process cancellation rows as new entries
    }

    // Mortgage entries (only new registrations, not cancellations)
    if (purpose.includes('근저당권설정')) {
      mortgageRank++;
      const mortgage = parseMortgageFromRow(cols, mortgageRank, isCancelled);
      if (mortgage) {
        result.mortgages.push(mortgage);
      }
      continue;
    }

    // Jeonse rights (only new registrations, not cancellations)
    if (purpose.includes('전세권설정')) {
      jeonseRank++;
      const jeonse = parseJeonseFromRow(cols, jeonseRank, isCancelled);
      if (jeonse) {
        result.jeonseRights.push(jeonse);
      }
      continue;
    }
  }
}

// --- Row parsers ---

function parseOwnerFromRow(cols: Record<string, string>, isCancelled: boolean): OwnerInfo | null {
  const rightHolder = cleanText(cols[4] || '');

  // Extract owner name - handle masked names (e.g., "소유자이**" or "소유자***")
  let name = '';
  const nameMatch = rightHolder.match(/(?:소유자|공유자)\s*([가-힣]{1,4}(?:\*+[가-힣]*)*)(?:\d|$|\s)/);
  if (nameMatch) {
    // Replace ** with masked indicator, keep the Korean chars
    name = nameMatch[1].replace(/\*+/g, '**');
  }
  if (!name) {
    // Fallback: look for name followed by registration number
    const altMatch = rightHolder.match(/(?:소유자|공유자)\s*([^\d\s]+?)(?:\d{6})/);
    if (altMatch) {
      name = altMatch[1].replace(/\*+/g, '**');
    }
  }

  if (!name) return null;

  const regNumMatch = rightHolder.match(/(\d{6}-\*+)/);

  let share = '단독소유';
  if (rightHolder.includes('지분')) {
    const shareMatch = rightHolder.match(/지분\s*(\d+분의\s*\d+)/);
    share = shareMatch ? `지분 ${shareMatch[1]}` : '공동소유';
  }

  let transactionAmount: number | null = null;
  const amountMatch = rightHolder.match(/거래가액\s*금?([\d,]+)원/);
  if (amountMatch) {
    transactionAmount = parseInt(amountMatch[1].replace(/,/g, ''));
  }

  const owner: OwnerInfo = {
    name,
    registrationNumber: regNumMatch ? regNumMatch[1] : '',
    address: '',
    share,
    registrationDate: extractDate(cols[2] || '') || '',
    cause: cleanText(cols[3] || ''),
    transactionAmount,
  };

  if (isCancelled) {
    (owner as any).cancelled = true;
  }

  return owner;
}

function parseLienFromRow(
  cols: Record<string, string>,
  purpose: string,
  isCancelled: boolean
): LienInfo | null {
  let type = '';
  if (purpose.includes('경매') || purpose.includes('임의경매')) {
    type = '경매';
  } else if (purpose.includes('가압류')) {
    type = '가압류';
  } else if (purpose.includes('가처분')) {
    type = '가처분';
  } else if (purpose.includes('압류')) {
    type = '압류';
  }

  if (!type) return null;

  const rightHolder = cleanText(cols[4] || '');

  // Extract amount
  let amount: number | null = null;
  const amountMatch = rightHolder.match(/(?:청구)?금액?\s*금?([\d,]+)원/);
  if (amountMatch) {
    amount = parseInt(amountMatch[1].replace(/,/g, ''));
  }

  // Extract creditor
  const creditor = extractCreditorName(rightHolder);

  return {
    type,
    registrationDate: extractDate(cols[2] || '') || '',
    creditor,
    amount,
    caseNumber: '',
    status: isCancelled ? 'cancelled' : 'active',
    cancellationDate: null,
  };
}

function parseMortgageFromRow(
  cols: Record<string, string>,
  rank: number,
  isCancelled: boolean
): MortgageInfo | null {
  const rightHolder = cleanText(cols[4] || '');

  // Extract 채권최고액 (max bond amount)
  let maxAmount = 0;
  // Try numeric format first (금123,456,789원)
  const numAmountMatch = rightHolder.match(/채권최고액\s*금?([\d,]+)원/);
  if (numAmountMatch) {
    maxAmount = parseInt(numAmountMatch[1].replace(/,/g, ''));
  } else {
    // Try Korean number format (채권최고액금일천팔백이십만원정)
    const koreanSection = rightHolder.match(/채권최고액\s*(금[가-힣]+원)/);
    if (koreanSection) {
      maxAmount = parseKoreanAmount(koreanSection[1]);
    } else {
      // Fallback: try any 금...원 pattern
      maxAmount = parseKoreanAmount(rightHolder);
    }
  }

  // Extract debtor
  const debtorMatch = rightHolder.match(/채무자\s*([가-힣]{2,4})/);
  const debtor = debtorMatch ? debtorMatch[1] : '';

  // Extract creditor
  const creditorMatch = rightHolder.match(/근저당권자\s*([가-힣]+(?:은행|금융|보증|캐피탈|보험|공사|저축|조합|주식회사)[가-힣]*)/);
  const creditor = creditorMatch ? creditorMatch[1] : extractCreditorName(rightHolder);

  return {
    rank,
    registrationDate: extractDate(cols[2] || '') || '',
    maxAmount,
    debtor,
    creditor,
    creditorAddress: '',
    status: isCancelled ? 'cancelled' : 'active',
    cancellationDate: null,
  };
}

function parseJeonseFromRow(
  cols: Record<string, string>,
  rank: number,
  isCancelled: boolean
): JeonseInfo | null {
  const rightHolder = cleanText(cols[4] || '');

  // Extract jeonse amount
  let amount = 0;
  const amountMatch = rightHolder.match(/전세금\s*금?([\d,]+)원/);
  if (amountMatch) {
    amount = parseInt(amountMatch[1].replace(/,/g, ''));
  } else {
    const koreanAmount = parseKoreanAmount(rightHolder);
    if (koreanAmount > 0) {
      amount = koreanAmount;
    }
  }

  // Extract tenant
  const tenantMatch = rightHolder.match(/전세권자\s*([가-힣]{2,4})/);
  const tenant = tenantMatch ? tenantMatch[1] : '';

  return {
    rank,
    registrationDate: extractDate(cols[2] || '') || '',
    amount,
    tenant,
    startDate: '',
    endDate: '',
    status: isCancelled ? 'cancelled' : 'active',
    cancellationDate: null,
  };
}

// --- Utility functions ---

/** Get only data rows (resType2 = '2') from a section */
function getDataRows(section: CodefRegistrationSection): CodefContentRow[] {
  return (section.resContentsList || []).filter(row => row.resType2 === '2');
}

/** Extract column values by resNumber from a data row */
function getColumns(row: CodefContentRow): Record<string, string> {
  const cols: Record<string, string> = {};
  for (const detail of row.resDetailList || []) {
    cols[detail.resNumber] = detail.resContents || '';
  }
  return cols;
}

/** Check if a row represents a cancelled entry (all content wrapped in &...&) */
function isRowCancelled(row: CodefContentRow): boolean {
  // If the purpose column (resNumber='1') starts with & it's cancelled
  const purposeDetail = (row.resDetailList || []).find(d => d.resNumber === '1');
  if (purposeDetail && purposeDetail.resContents) {
    return purposeDetail.resContents.startsWith('&') && purposeDetail.resContents.endsWith('&');
  }
  return false;
}

/** Clean text: remove &...& markers, ^indents, | annotations */
function cleanText(text: string): string {
  return text
    .replace(/&/g, '')           // Remove cancellation markers
    .replace(/\d+\^/g, '')       // Remove indent markers (4^, 2^, 6^)
    .replace(/\|/g, '')          // Remove annotation markers
    .replace(/\s+/g, ' ')        // Collapse whitespace
    .trim();
}

/** Extract date from receipt column (e.g., "1993년6월4일\n제55958호") */
function extractDate(text: string): string {
  const cleaned = cleanText(text);
  const match = cleaned.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (match) {
    return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  }
  return '';
}

/** Extract Korean name (2-4 characters) from text */
function extractKoreanName(text: string): string {
  const match = text.match(/([가-힣]{2,4})(?:\d|$|\s)/);
  return match ? match[1] : '';
}

/** Extract creditor/institution name from text */
function extractCreditorName(text: string): string {
  const match = text.match(
    /([가-힣]+(?:은행|금융|보증|캐피탈|보험|공사|저축|조합|주식회사|세무서|시청|구청)[가-힣]*)/
  );
  return match ? match[1] : '';
}

/** Parse Korean number format (금일천팔백이십만원정 → 18200000) */
function parseKoreanAmount(text: string): number {
  const match = text.match(/금([가-힣]+)원/);
  if (!match) return 0;

  const korNum = match[1].replace('정', '');
  const units: Record<string, number> = {
    '일': 1, '이': 2, '삼': 3, '사': 4, '오': 5,
    '육': 6, '칠': 7, '팔': 8, '구': 9,
  };
  const multipliers: Record<string, number> = {
    '십': 10, '백': 100, '천': 1000,
    '만': 10000, '억': 100000000, '조': 1000000000000,
  };

  let total = 0;
  let current = 0;
  let mantissa = 0;

  for (const char of korNum) {
    if (units[char] !== undefined) {
      current = units[char];
    } else if (char === '십') {
      mantissa += (current || 1) * 10;
      current = 0;
    } else if (char === '백') {
      mantissa += (current || 1) * 100;
      current = 0;
    } else if (char === '천') {
      mantissa += (current || 1) * 1000;
      current = 0;
    } else if (char === '만') {
      mantissa += current;
      total += (mantissa || 1) * 10000;
      mantissa = 0;
      current = 0;
    } else if (char === '억') {
      mantissa += current;
      total += (mantissa || 1) * 100000000;
      mantissa = 0;
      current = 0;
    }
  }

  total += mantissa + current;
  return total;
}
