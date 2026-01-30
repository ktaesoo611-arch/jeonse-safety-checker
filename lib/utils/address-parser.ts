/**
 * Korean Address Parser
 * Converts Korean addresses to Building Register API format
 * Supports all 16 시도 (provinces/metropolitan cities) nationwide
 */

import { SIDO_CODES, SIDO_NAMES, DISTRICT_CODES, DONG_CODES } from '../data/nationwide-codes';

/**
 * Ordered 시도 patterns for regex matching (longest first to avoid ambiguity).
 * 광주광역시 must match before bare 광주 (which is NOT included — ambiguous with 경기도 광주시).
 */
const SIDO_PATTERNS: { pattern: RegExp; sidoCode: string }[] = [
  // Special autonomous entities (longest names first)
  { pattern: /^세종특별자치시/, sidoCode: '36' },
  { pattern: /^강원특별자치도/, sidoCode: '51' },
  { pattern: /^전북특별자치도/, sidoCode: '52' },
  { pattern: /^제주특별자치도/, sidoCode: '50' },
  // Metropolitan cities (광역시)
  { pattern: /^서울특별시/, sidoCode: '11' },
  { pattern: /^부산광역시/, sidoCode: '26' },
  { pattern: /^대구광역시/, sidoCode: '27' },
  { pattern: /^인천광역시/, sidoCode: '28' },
  { pattern: /^광주광역시/, sidoCode: '29' },
  { pattern: /^대전광역시/, sidoCode: '30' },
  { pattern: /^울산광역시/, sidoCode: '31' },
  // Provinces (도)
  { pattern: /^경기도/, sidoCode: '41' },
  { pattern: /^충청북도/, sidoCode: '43' },
  { pattern: /^충청남도/, sidoCode: '44' },
  { pattern: /^전라남도/, sidoCode: '46' },
  { pattern: /^경상북도/, sidoCode: '47' },
  { pattern: /^경상남도/, sidoCode: '48' },
  // Old province names
  { pattern: /^강원도/, sidoCode: '51' },
  { pattern: /^전라북도/, sidoCode: '52' },
  // Abbreviations (2-char)
  { pattern: /^서울\s/, sidoCode: '11' },
  { pattern: /^부산\s/, sidoCode: '26' },
  { pattern: /^대구\s/, sidoCode: '27' },
  { pattern: /^인천\s/, sidoCode: '28' },
  // 광주 is NOT included as abbreviation — ambiguous with 경기도 광주시
  { pattern: /^대전\s/, sidoCode: '30' },
  { pattern: /^울산\s/, sidoCode: '31' },
  { pattern: /^세종\s/, sidoCode: '36' },
  { pattern: /^경기\s/, sidoCode: '41' },
  { pattern: /^강원\s/, sidoCode: '51' },
  { pattern: /^충북\s/, sidoCode: '43' },
  { pattern: /^충남\s/, sidoCode: '44' },
  { pattern: /^전북\s/, sidoCode: '52' },
  { pattern: /^전남\s/, sidoCode: '46' },
  { pattern: /^경북\s/, sidoCode: '47' },
  { pattern: /^경남\s/, sidoCode: '48' },
  { pattern: /^제주\s/, sidoCode: '50' },
];

export interface AddressComponents {
  sigunguCd: string;  // 시군구 코드
  bjdongCd: string;   // 법정동 코드
  platGbCd: string;   // 대지구분코드: 0=대지, 1=산, 2=블록
  bun: string;        // 본번 (main lot number) - 4 digits
  ji: string;         // 부번 (sub lot number) - 4 digits
}

/**
 * Parse Korean address into Building Register API components
 * Supports all 16 시도 nationwide
 */
export function parseKoreanAddress(address: string): AddressComponents | null {
  const cleanAddress = address.trim();

  // Step 1: Identify 시도
  let sidoCode: string | undefined;
  let afterSido = cleanAddress;

  for (const { pattern, sidoCode: code } of SIDO_PATTERNS) {
    const match = cleanAddress.match(pattern);
    if (match) {
      sidoCode = code;
      afterSido = cleanAddress.substring(match[0].length).trim();
      break;
    }
  }

  if (!sidoCode) {
    console.warn('Could not identify 시도 from address:', address);
    return null;
  }

  // Step 2: Identify 시군구 and get district code
  let sigunguCd: string | undefined;
  let afterDistrict = afterSido;

  if (sidoCode === '36') {
    // 세종: no 시군구 level, dongs are directly under sido
    sigunguCd = DISTRICT_CODES['36|세종시'] || DISTRICT_CODES['36|세종특별자치시'];
    // afterDistrict stays the same (directly to dong)
  } else {
    // Try 4-level: "XX시 XX구" (cities with multiple 구)
    const cityGuMatch = afterSido.match(/^([가-힣]+시)\s+([가-힣]+구)/);
    if (cityGuMatch) {
      const fullDistrict = `${cityGuMatch[1]} ${cityGuMatch[2]}`;
      sigunguCd = DISTRICT_CODES[`${sidoCode}|${fullDistrict}`];
      if (sigunguCd) {
        afterDistrict = afterSido.substring(cityGuMatch[0].length).trim();
      }
    }

    // Try 3-level: "XX구" / "XX시" / "XX군"
    if (!sigunguCd) {
      const districtMatch = afterSido.match(/^([가-힣]+(?:구|시|군))/);
      if (districtMatch) {
        sigunguCd = DISTRICT_CODES[`${sidoCode}|${districtMatch[1]}`];
        if (sigunguCd) {
          afterDistrict = afterSido.substring(districtMatch[0].length).trim();
        }
      }
    }
  }

  if (!sigunguCd) {
    console.warn('Could not identify 시군구 from address:', address);
    return null;
  }

  // Step 3: Extract 읍면동 and look up code
  const dongCodes = DONG_CODES[sigunguCd];

  // Patterns to match in order of specificity:
  // - Numbered dong with 가: 광희동2가, 신문로1가, 원효로4가, 종로1가
  // - Regular dong: 신당동, 신월1동, 목1동, 번1동, 왕십리2동
  // - Road names with 가: 세종로, 충정로, 퇴계로1가
  // - Street names: 덕수궁길
  // - 리: 상색리, 봉수리
  // - 읍/면: 진접읍, 남면
  let dongMatch = afterDistrict.match(/^([가-힣]+\d*동\d*가?|[가-힣]+로\d*가?|[가-힣]+길|[가-힣]+\d+가|[가-힣]+리|[가-힣]+읍|[가-힣]+면)/);

  // If standard patterns don't match, try known dong names
  if (!dongMatch && dongCodes) {
    const knownDongs = Object.keys(dongCodes);
    for (const knownDong of knownDongs) {
      if (afterDistrict.startsWith(knownDong)) {
        dongMatch = [knownDong, knownDong] as unknown as RegExpMatchArray;
        break;
      }
    }
  }

  if (!dongMatch) {
    console.warn('Could not extract dong from address:', address);
    return null;
  }
  const dong = dongMatch[1];

  const bjdongCd = dongCodes?.[dong];
  if (!bjdongCd) {
    console.warn(`Unknown dong: ${dong} in sigungu ${sigunguCd}`);
    return null;
  }

  // Step 4: Extract lot number (번지)
  const lotMatch = cleanAddress.match(/(\d+)(?:-(\d+))?(?:번지)?/);
  if (!lotMatch) {
    console.warn('Could not extract lot number from address:', address);
    return null;
  }

  const bun = lotMatch[1].padStart(4, '0');
  const ji = (lotMatch[2] || '0').padStart(4, '0');

  // Determine platGbCd (대지구분코드)
  const platGbCd = /\s산\s|\s산\d/.test(cleanAddress) ? '1' : '0';

  return { sigunguCd, bjdongCd, platGbCd, bun, ji };
}

/**
 * Format address components for display
 */
export function formatAddressComponents(components: AddressComponents): string {
  return `sigunguCd: ${components.sigunguCd}, bjdongCd: ${components.bjdongCd}, platGbCd: ${components.platGbCd}, bun: ${components.bun}, ji: ${components.ji}`;
}

/**
 * Extract 법정동 (legal dong) name from a 지번주소 (lot-based address)
 *
 * Examples:
 * - "서울특별시 중구 신당동 123-45" → "신당동"
 * - "서울 중구 광희동2가 789" → "광희동2가"
 * - "경기도 성남시 분당구 정자동 12-3" → "정자동"
 *
 * @param jibunAddress - Lot-based address (지번주소)
 * @returns The legal dong name, or null if not found
 */
export function extractLegalDongFromJibunAddress(jibunAddress: string): string | null {
  if (!jibunAddress) return null;

  const dongMatch = jibunAddress.match(/([가-힣]+동\d*가?|[가-힣]+\d+가)/);
  if (dongMatch) {
    return dongMatch[1];
  }

  return null;
}

/**
 * Check if an address is a road name address (도로명주소) vs lot address (지번주소)
 */
export function isRoadNameAddress(address: string): boolean {
  const roadPattern = /[가-힣]+[로길](\d+[가-힣]*)?(\s+\d+(-\d+)?)?/;
  const lotPattern = /[가-힣]+동\d*가?\s+\d+/;

  const hasRoadPattern = roadPattern.test(address);
  const hasLotPattern = lotPattern.test(address);

  if (hasLotPattern) return false;
  if (hasRoadPattern) return true;

  return true;
}

/**
 * Get all valid dong names for a district
 * Supports all districts nationwide via sigungu code lookup
 *
 * @param district - District name (e.g., "중구", "강남구", "성남시 분당구", "하남시")
 * @returns Array of valid dong names for the district
 */
export function getValidDongsForDistrict(district: string): string[] {
  // Try to find the sigungu code by scanning DISTRICT_CODES
  for (const [key, sigunguCd] of Object.entries(DISTRICT_CODES)) {
    const districtName = key.split('|')[1];
    if (districtName === district) {
      const dongs = DONG_CODES[sigunguCd];
      if (dongs) return Object.keys(dongs);
    }
  }
  return [];
}
