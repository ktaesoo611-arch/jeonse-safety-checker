/**
 * CODEF API Client for 등기부등본 (Property Registry) lookups
 *
 * Uses the easycodef-node SDK for OAuth token management and API requests.
 * Requires IROS (인터넷등기소) credentials and prepaid e-money for payment.
 *
 * API Endpoint: /v1/kr/public/ck/real-estate-register/status
 * Organization code: '0002' (대법원 인터넷등기소)
 *
 * Required credentials (env vars):
 * - CODEF_CLIENT_ID, CODEF_CLIENT_SECRET, CODEF_PUBLIC_KEY (CODEF API auth)
 * - CODEF_IROS_ID, CODEF_IROS_PASSWORD (4-digit PIN), CODEF_IROS_PHONE (IROS login)
 * - CODEF_EMONEY_NO1, CODEF_EMONEY_NO2, CODEF_EMONEY_PWD (e-money payment)
 */

import { EasyCodef, EasyCodefConstant } from 'easycodef-node';
import crypto from 'crypto';

const PRODUCT_URL_REGISTRY = '/v1/kr/public/ck/real-estate-register/status';
const ORGANIZATION_CODE = '0002';

// Valid phone number prefixes for CODEF IROS API (CF-13002 error if invalid)
const VALID_PHONE_PREFIXES = [
  '010', '011', '016', '017', '018', '019', '070', '02',
  '031', '032', '033', '041', '042', '043',
  '0502', '0505', '051', '052', '053', '054', '055',
  '061', '062', '063', '064'
];

/** Validate phone number prefix for CODEF API */
function validatePhoneNo(phone: string): boolean {
  if (!phone) return false;
  const normalized = phone.replace(/-/g, '');
  return VALID_PHONE_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

/** Validate 부동산 고유번호 format (14 digits: 0000-0000-000000) */
function validateUniqueNo(uniqueNo: string): boolean {
  if (!uniqueNo) return false;
  const digitsOnly = uniqueNo.replace(/-/g, '');
  return /^\d{14}$/.test(digitsOnly);
}

/** Format uniqueNo to digits-only (remove dashes) */
function normalizeUniqueNo(uniqueNo: string): string {
  return uniqueNo.replace(/-/g, '');
}

/** 대법원 maintenance schedule (KST) - API may be unavailable */
const MAINTENANCE_WINDOWS = [
  { name: '정기 변경 작업', week: 1, day: 4, startHour: 21, endHour: 6 },
  { name: '전자지불 대행업체 정기 테스트', week: 1, day: 5, startHour: 23, endHour: 2 },
  { name: '정기 데이터 백업 및 시스템 점검', week: 2, day: 6, startHour: 21, endHour: 9 },
  { name: '전자 문서 삭제', week: 2, day: 0, startHour: 21, endHour: 7 },
  { name: '전자지불 대행업체 예방점검', week: 3, day: 6, startHour: 23, endHour: 7 },
];

/** Check if current time is within a maintenance window (returns window name or null) */
function checkMaintenanceWindow(): string | null {
  const now = new Date();
  const kstOffset = 9 * 60;
  const kstNow = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);
  const dayOfMonth = kstNow.getDate();
  const dayOfWeek = kstNow.getDay();
  const hour = kstNow.getHours();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);

  for (const window of MAINTENANCE_WINDOWS) {
    if (window.week === weekOfMonth && window.day === dayOfWeek) {
      if (window.startHour > window.endHour) {
        if (hour >= window.startHour || hour < window.endHour) return window.name;
      } else {
        if (hour >= window.startHour && hour < window.endHour) return window.name;
      }
    }
  }
  return null;
}

/**
 * Parse Korean address into components for CODEF API
 * Examples:
 * - "서울특별시 강남구 강남대로92길 33 혜전빌딩 [역삼동 649-7]"
 * - "서울특별시 강남구 역삼동 123-4"
 */
function parseKoreanAddress(address: string): {
  sido?: string;
  sigungu?: string;
  dong?: string;
  bunji1?: string;
  bunji2?: string;
} {
  const result: ReturnType<typeof parseKoreanAddress> = {};

  // Extract 시도 (first part ending with 시, 도, or 특별시/광역시)
  const sidoMatch = address.match(/^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)/);
  if (sidoMatch) {
    result.sido = sidoMatch[1];
  }

  // Extract 시군구 (follows sido, ends with 구, 시, 군)
  const sigunguMatch = address.match(/(?:특별시|광역시|도)\s+([가-힣]+(?:구|시|군))/);
  if (sigunguMatch) {
    result.sigungu = sigunguMatch[1];
  }

  // Extract 동 from bracket notation [역삼동 123-4] or regular pattern
  const bracketDongMatch = address.match(/\[([가-힣]+동)\s+/);
  if (bracketDongMatch) {
    result.dong = bracketDongMatch[1];
  } else {
    // Try regular dong pattern after sigungu
    const regularDongMatch = address.match(/(?:구|시|군)\s+([가-힣]+동)/);
    if (regularDongMatch) {
      result.dong = regularDongMatch[1];
    }
  }

  // Extract 번지 from bracket [동 123-4] or end of address
  const bracketBunjiMatch = address.match(/\[.+\s+(\d+)(?:-(\d+))?\]/);
  if (bracketBunjiMatch) {
    result.bunji1 = bracketBunjiMatch[1];
    result.bunji2 = bracketBunjiMatch[2] || '';
  } else {
    // Try end of address pattern
    const endBunjiMatch = address.match(/(\d+)(?:-(\d+))?\s*$/);
    if (endBunjiMatch) {
      result.bunji1 = endBunjiMatch[1];
      result.bunji2 = endBunjiMatch[2] || '';
    }
  }

  return result;
}

/** Encrypt a string using RSA with the CODEF public key */
function encryptRSA(publicKey: string, plainText: string): string {
  const bufferToEncrypt = Buffer.from(plainText);
  return crypto
    .publicEncrypt(
      {
        key: '-----BEGIN PUBLIC KEY-----\n' + publicKey + '\n-----END PUBLIC KEY-----',
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      bufferToEncrypt
    )
    .toString('base64');
}

// --- Response types matching actual CODEF API response ---

export interface CodefAddressResult {
  commUniqueNo: string;         // 고유번호 (e.g., "11012019003344")
  commAddrLotNumber: string;    // 주소 (e.g., "서울특별시 강남구 ...")
  resType: string;              // 부동산유형: "토지", "건물", "집합건물"
  resUserNm: string;            // 소유자명
  resState: string;             // 상태: "현행", "폐쇄"
}

export interface CodefDetailEntry {
  resContents: string;          // 내용 (may contain &...& for cancelled, 4^ for indent)
  resNumber: string;            // 컬럼 인덱스: '0'=순위, '1'=목적, '2'=접수, '3'=원인, '4'=권리자
}

export interface CodefContentRow {
  resType2: string;             // '1' = header row, '2' = data row
  resDetailList: CodefDetailEntry[];
}

export interface CodefRegistrationSection {
  resType: string;              // '표제부', '갑구', '을구'
  resType1: string;             // sub-type: '소유권에관한사항', '1동의건물의표시', etc.
  resContentsList: CodefContentRow[];
}

export interface CodefRegisterEntry {
  resIssueNo: string;
  resDocTitle: string;          // e.g., "등기사항전부증명서(말소사항포함)-집합건물"
  resPublishRegistryOffice: string;
  resRealty: string;            // e.g., "[집합건물]서울특별시..."
  resRegistrationHisList: CodefRegistrationSection[];
}

export interface CodefRegistryData {
  resWarningMessage: string;
  resTotalPageCount: string;
  resRegisterEntriesList: CodefRegisterEntry[];
  resAddrList?: CodefAddressResult[];  // Present when address search returns multiple matches
  resOriGinalData?: string;
  resIssueYN?: string;
  commStartPageNo?: string;
  resEndPageNo?: string;
  resSearchList?: any[];
  resImageList?: any[];
  commIssueCode?: string;
}

export interface CodefRegistryResult {
  success: boolean;
  data?: CodefRegistryData;
  addressList?: CodefAddressResult[];  // When address returns multiple matches
  uniqueNo?: string;
  rawResponse?: any;
  error?: string;
}

export class CodefAPI {
  private codef: EasyCodef;
  private serviceType: number;
  private publicKey: string;

  constructor() {
    this.codef = new EasyCodef();

    const clientId = process.env.CODEF_CLIENT_ID;
    const clientSecret = process.env.CODEF_CLIENT_SECRET;
    this.publicKey = process.env.CODEF_PUBLIC_KEY || '';
    const mode = process.env.CODEF_MODE || 'demo';

    if (clientId && clientSecret && this.publicKey) {
      this.codef.setPublicKey(this.publicKey);

      if (mode === 'production') {
        this.codef.setClientInfo(clientId, clientSecret);
        this.serviceType = EasyCodefConstant.SERVICE_TYPE_API;
        console.log('[CODEF] Using production API (api.codef.io)');
      } else {
        this.codef.setClientInfoForDemo(clientId, clientSecret);
        this.serviceType = EasyCodefConstant.SERVICE_TYPE_DEMO;
        console.log('[CODEF] Using demo API (development.codef.io)');
      }
    } else {
      this.codef.setPublicKey(this.publicKey || 'dummy');
      this.serviceType = EasyCodefConstant.SERVICE_TYPE_SANDBOX;
      console.log('[CODEF] Using sandbox mode (no credentials configured)');
    }
  }

  /**
   * Fetch registry document by address or uniqueNo.
   *
   * Two-stage process:
   * 1. Address search → returns list of matching properties (resAddrList)
   * 2. UniqueNo fetch → returns full registry document (resRegisterEntriesList)
   *
   * If address is specific enough, may return registry directly.
   */
  async getRegistryDocument(
    params: {
      // Legacy: combined address for inquiryType='1' (간편검색)
      address?: string;

      // Structured address for inquiryType='2' (소재지번으로 찾기)
      addr_sido?: string;        // 시/도 (e.g., "경기도")
      addr_sigungu?: string;     // 시군구 (e.g., "광명시")
      addr_dong?: string;        // 읍면동 (e.g., "광명동")
      addr_lotNumber?: string;   // 지번 (e.g., "123-45")
      buildingName?: string;     // 건물명칭 (e.g., "광명아크포레자이위브")
      inputSelect?: '0' | '1';   // 0:지번, 1:건물명칭 (required for 집합건물 with inquiryType='2')

      // For 집합건물 (apartments) - required with inquiryType='2' or '3'
      dong?: string;             // 동 (e.g., "101")
      ho?: string;               // 호 (e.g., "1001")

      // Structured address for inquiryType='3' (도로명주소로 찾기)
      addr_roadName?: string;        // 도로명 (e.g., "새터로")
      addr_buildingNumber?: string;  // 건물번호 (e.g., "44-7")

      // UniqueNo lookup (inquiryType='0')
      uniqueNo?: string;
      addrLotNumber?: string;    // Full lot address for uniqueNo lookup

      // Other options
      pageCount?: number;        // For inquiryType='1': 0 < pageCount <= 100
      selectAddress?: '0' | '1'; // '1' requires additional authentication
      inquiryType?: '0' | '1' | '2' | '3';  // Override inquiry type
    },
    realEstateType: string = '3',
    issueType: string = '1'  // '1'=열람(view), '2'=발급(issue) - only '1' allows re-viewing
  ): Promise<CodefRegistryResult> {
    try {
      // Check maintenance window
      const maintenanceWindow = checkMaintenanceWindow();
      if (maintenanceWindow) {
        console.warn(`[CODEF] Warning: 대법원 maintenance in progress (${maintenanceWindow})`);
      }

      const identifier = params.address || params.uniqueNo || '';
      console.log(`[CODEF] Fetching registry: ${identifier} (type: ${realEstateType})`);

      // IROS credentials from env
      const irosId = process.env.CODEF_IROS_ID || 'testuser';
      const irosPassword = process.env.CODEF_IROS_PASSWORD || '1234';
      const irosPhone = process.env.CODEF_IROS_PHONE || '01000000000';

      // Validate phone number prefix
      if (!validatePhoneNo(irosPhone)) {
        return {
          success: false,
          error: `CF-13002: Invalid phone number prefix. Must start with: ${VALID_PHONE_PREFIXES.join(', ')}`,
        };
      }
      // E-money credentials (ePrepayNo is 12 digits, single field)
      const ePrepayNo = process.env.CODEF_EPREPAY_NO || '';
      const ePrepayPass = process.env.CODEF_EPREPAY_PASS || '';

      // Encrypt password (only password needs RSA encryption, not ePrepayPass)
      const encryptedPassword = encryptRSA(this.publicKey, irosPassword);

      // Determine inquiryType based on provided params
      // '0'=고유번호로찾기, '1'=간편검색, '2'=소재지번으로 찾기, '3'=도로명주소로 찾기
      let inquiryType = params.inquiryType || '1';  // Default to 간편검색
      if (params.uniqueNo) {
        inquiryType = '0';
      } else if (params.addr_roadName) {
        inquiryType = '3';  // 도로명주소로 찾기
      } else if (params.addr_dong || params.addr_lotNumber || params.buildingName) {
        inquiryType = '2';  // 소재지번으로 찾기
      }

      const param: any = {
        organization: ORGANIZATION_CODE,
        id: irosId,
        password: encryptedPassword,
        phoneNo: irosPhone,
        inquiryType,
        realtyType: realEstateType,
        issueType,  // '0'=발급, '1'=열람, '2'=고유번호조회, '3'=원문데이터
      };

      // For inquiryType='1' (간편검색), add pageCount (0 < pageCount <= 100)
      if (inquiryType === '1' && params.pageCount) {
        param.pageCount = Math.min(100, Math.max(1, params.pageCount));
      }

      // selectAddress: '1' requires additional authentication for address selection
      if (params.selectAddress) {
        param.selectAddress = params.selectAddress;
      }

      // Add e-money credentials (required when issueType < 2)
      if (ePrepayNo) {
        param.ePrepayNo = ePrepayNo;  // 12-digit single field
        param.ePrepayPass = ePrepayPass;  // 4-9 digits, NOT encrypted
      }

      // Set search target based on inquiryType
      if (inquiryType === '0' && params.uniqueNo) {
        // UniqueNo lookup
        if (!validateUniqueNo(params.uniqueNo)) {
          return {
            success: false,
            error: 'Invalid uniqueNo format. Must be 14 digits (0000-0000-000000)',
          };
        }
        param.uniqueNo = normalizeUniqueNo(params.uniqueNo);

        // For uniqueNo lookup, CODEF requires address components
        if (params.addrLotNumber) {
          const parsed = parseKoreanAddress(params.addrLotNumber);
          console.log(`[CODEF] Parsed address components:`, parsed);
          if (parsed.sido) param.addr_sido = parsed.sido;
          if (parsed.sigungu) param.addr_sigungu = parsed.sigungu;
          if (parsed.dong) param.addr_dong = parsed.dong;
          if (parsed.bunji1) param.addr_bunji1 = parsed.bunji1;
          if (parsed.bunji2) param.addr_bunji2 = parsed.bunji2;
          param.addr_lotNumber = params.addrLotNumber;
        }
      } else if (inquiryType === '2') {
        // 소재지번으로 찾기 - structured jibun address
        if (params.addr_sido) param.addr_sido = params.addr_sido;
        if (params.addr_sigungu) param.addr_sigungu = params.addr_sigungu;
        if (params.addr_dong) param.addr_dong = params.addr_dong;
        if (params.addr_lotNumber) param.addr_lotNumber = params.addr_lotNumber;
        if (params.buildingName) param.buildingName = params.buildingName;

        // inputSelect: 0=지번, 1=건물명칭 (required for 집합건물)
        if (realEstateType === '1') {  // 집합건물
          param.inputSelect = params.inputSelect || (params.buildingName ? '1' : '0');
        }

        // dong/ho required for 집합건물
        if (params.dong) param.dong = params.dong;
        if (params.ho) param.ho = params.ho;
      } else if (inquiryType === '3') {
        // 도로명주소로 찾기
        if (params.addr_sido) param.addr_sido = params.addr_sido;
        if (params.addr_sigungu) param.addr_sigungu = params.addr_sigungu;
        if (params.addr_roadName) param.addr_roadName = params.addr_roadName;
        if (params.addr_buildingNumber) param.addr_buildingNumber = params.addr_buildingNumber;

        // dong/ho required for 집합건물
        if (params.dong) param.dong = params.dong;
        if (params.ho) param.ho = params.ho;
      } else if (params.address) {
        // inquiryType='1' (간편검색) - use combined address
        param.address = params.address;
      }

      // Log params being sent (excluding sensitive data)
      const logParams = { ...param };
      delete logParams.password;
      delete logParams.emoneyPwd;
      console.log('[CODEF] Request params:', JSON.stringify(logParams, null, 2));

      const resultStr = await this.codef.requestProduct(
        PRODUCT_URL_REGISTRY,
        this.serviceType,
        param
      );

      const result = JSON.parse(resultStr);
      console.log(`[CODEF] Response code: ${result.result?.code}`);
      console.log(`[CODEF] Response message: ${result.result?.message}`);

      // Handle 2-way authentication response (CF-03002)
      if (result.result?.code === 'CF-03002' && result.data?.continue2Way) {
        console.log('[CODEF] 2-way authentication required, processing address list...');
        const twoWayData = result.data;
        const extraInfo = twoWayData.extraInfo;

        if (extraInfo?.resAddrList && extraInfo.resAddrList.length > 0) {
          console.log(`[CODEF] Found ${extraInfo.resAddrList.length} address matches`);

          // Auto-select if single match
          const match = extraInfo.resAddrList.length === 1
            ? extraInfo.resAddrList[0]
            : extraInfo.resAddrList.find((a: any) => a.resState === '현행') || extraInfo.resAddrList[0];

          console.log(`[CODEF] Selecting: ${match.commUniqueNo} - ${match.commAddrLotNumber}`);

          // Continue 2-way auth with selected uniqueNo
          const twoWayParam = {
            ...param,
            uniqueNo: match.commUniqueNo,
            is2Way: true,
            twoWayInfo: {
              jobIndex: twoWayData.jobIndex,
              threadIndex: twoWayData.threadIndex,
              jti: twoWayData.jti,
              twoWayTimestamp: twoWayData.twoWayTimestamp,
            },
          };

          console.log('[CODEF] Continuing 2-way auth with uniqueNo:', match.commUniqueNo);

          const twoWayResultStr = await this.codef.requestProduct(
            PRODUCT_URL_REGISTRY,
            this.serviceType,
            twoWayParam
          );

          const twoWayResult = JSON.parse(twoWayResultStr);
          console.log(`[CODEF] 2-way response code: ${twoWayResult.result?.code}`);

          if (twoWayResult.result?.code !== 'CF-00000') {
            return {
              success: false,
              error: `${twoWayResult.result?.code}: ${twoWayResult.result?.message}`,
              rawResponse: twoWayResult,
            };
          }

          return {
            success: true,
            data: twoWayResult.data as CodefRegistryData,
            uniqueNo: match.commUniqueNo,
            rawResponse: twoWayResult,
          };
        }
      }

      if (result.result?.code !== 'CF-00000') {
        return {
          success: false,
          error: `${result.result?.code}: ${result.result?.message}`,
          rawResponse: result,
        };
      }

      const data = result.data as CodefRegistryData;

      // Check if we got an address list (need second call with uniqueNo)
      if (data.resAddrList && data.resAddrList.length > 0 && data.resRegisterEntriesList.length === 0) {
        console.log(`[CODEF] Address search returned ${data.resAddrList.length} results`);

        // If exactly one match, auto-select it
        if (data.resAddrList.length === 1) {
          const match = data.resAddrList[0];
          console.log(`[CODEF] Auto-selecting single result: ${match.commUniqueNo}`);

          // Use the resType from the search result to avoid type mismatch
          const typeCodeMap: Record<string, string> = {
            '토지': '1',
            '건물': '2',
            '집합건물': '3',
          };
          const matchType = typeCodeMap[match.resType] || realEstateType;
          console.log(`[CODEF] Using type from result: ${match.resType} (code: ${matchType})`);

          return this.getRegistryDocument(
            { uniqueNo: match.commUniqueNo, addrLotNumber: match.commAddrLotNumber },
            matchType, issueType
          );
        }

        // Return the address list for the caller to choose
        return {
          success: true,
          addressList: data.resAddrList,
          data,
          rawResponse: result,
        };
      }

      return {
        success: true,
        data,
        uniqueNo: params.uniqueNo,
        rawResponse: result,
      };
    } catch (error: any) {
      console.error('[CODEF] Registry fetch error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get registry by address (main entry point for the app)
   *
   * @param addressOrParams - Either a string address (legacy) or structured params object
   * @param type - Property type: 토지, 집합건물, or 건물
   */
  async getRegistry(
    addressOrParams: string | {
      address?: string;           // Combined address for 간편검색
      addr_sido?: string;         // 시/도
      addr_sigungu?: string;      // 시군구
      addr_dong?: string;         // 읍면동
      addr_lotNumber?: string;    // 지번 (e.g., "123-45")
      buildingName?: string;      // 건물명칭
      dong?: string;              // 동 (for 집합건물)
      ho?: string;                // 호 (for 집합건물)
      addr_roadName?: string;     // 도로명
      addr_buildingNumber?: string; // 건물번호
    },
    type: '토지' | '집합건물' | '건물' = '집합건물'
  ): Promise<CodefRegistryResult> {
    const typeMap: Record<string, string> = {
      '집합건물': '1',  // CODEF realtyType: 1=집합건물
      '토지': '2',      // CODEF realtyType: 2=토지
      '건물': '3',      // CODEF realtyType: 3=건물
    };
    const realEstateType = typeMap[type] || '3';

    // Handle legacy string address
    if (typeof addressOrParams === 'string') {
      return this.getRegistryDocument({ address: addressOrParams }, realEstateType);
    }

    // Handle structured params
    return this.getRegistryDocument(addressOrParams, realEstateType);
  }
}
