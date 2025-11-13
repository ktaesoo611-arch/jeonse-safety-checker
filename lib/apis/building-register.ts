import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { BuildingRegisterData, BuildingViolation } from '../types';

export class BuildingRegisterAPI {
  private apiKey: string;
  private baseUrl = 'http://apis.data.go.kr/1613000/BldRgstService_v2';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get building register information (건축물대장)
   */
  async getBuildingRegister(
    sigunguCd: string,  // 시군구코드
    bjdongCd: string,   // 법정동코드
    bun: string,        // 번
    ji: string          // 지
  ): Promise<BuildingRegisterData> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/getBrRecapTitleInfo`,
        {
          params: {
            serviceKey: this.apiKey,
            sigunguCd: sigunguCd,
            bjdongCd: bjdongCd,
            bun: bun,
            ji: ji,
            numOfRows: 10,
            pageNo: 1
          },
          timeout: 10000
        }
      );

      const parser = new XMLParser();
      const result = parser.parse(response.data);

      const item = result.response?.body?.items?.item;

      if (!item) {
        throw new Error('Building not found in register');
      }

      return this.parseBuildingData(item);
    } catch (error) {
      console.error('Building Register API Error:', error);
      throw new Error('Failed to fetch building register');
    }
  }

  private parseBuildingData(item: any): BuildingRegisterData {
    // Check for violations
    const violations: BuildingViolation[] = [];
    let hasViolations = false;
    let hasUnauthorized = false;

    // 위반건축물 체크
    if (item.vlRat && item.vlRat !== '0' && item.vlRat !== '') {
      hasViolations = true;
      violations.push({
        type: 'violation',
        description: '위반건축물로 지정됨 (Building code violation)',
        severity: 'high'
      });
    }

    // 무허가건축물 체크
    if (item.bylotCnt && item.bylotCnt !== '0') {
      hasUnauthorized = true;
      violations.push({
        type: 'unauthorized',
        description: '무허가건축물 존재 (Unauthorized construction detected)',
        severity: 'critical'
      });
    }

    // 용도위반 체크
    if (item.vldtBdprsAtcrtnCd && item.vldtBdprsAtcrtnCd !== '0') {
      hasViolations = true;
      violations.push({
        type: 'violation',
        description: '용도위반 (Zoning violation)',
        severity: 'medium'
      });
    }

    const legalStatus = hasUnauthorized
      ? 'unauthorized'
      : hasViolations
        ? 'violated'
        : 'legal';

    return {
      buildingName: item.bldNm || '',
      completionDate: item.useAprDay || '',
      structure: item.strctCdNm || '',
      totalFloors: parseInt(item.grndFlrCnt || '0'),
      hasViolations,
      hasUnauthorizedConstruction: hasUnauthorized,
      violations,
      legalStatus
    };
  }

  /**
   * Parse address to get codes (simplified version)
   * TODO: Implement comprehensive address parser
   */
  parseAddress(address: string): {
    sigunguCd: string;
    bjdongCd: string;
    bun: string;
    ji: string;
  } | null {
    // This is a simplified parser
    // Production needs comprehensive Korean address parsing library

    // Example address: "서울특별시 마포구 서교동 123-45"
    const parts = address.split(' ');

    // Extract 번지 (street number)
    const streetNumber = parts[parts.length - 1];
    const [bun, ji = '0'] = streetNumber.split('-');

    // TODO: Map district and dong to proper codes
    // For now, return null to indicate parsing needed
    return null;
  }
}

/**
 * Helper function to get 시군구 code from district
 */
export function getSigunguCode(city: string, district: string): string {
  // First 5 digits of the district code
  const codes: Record<string, Record<string, string>> = {
    '서울': {
      '종로구': '11110',
      '중구': '11140',
      '용산구': '11170',
      '성동구': '11200',
      '광진구': '11215',
      '동대문구': '11230',
      '중랑구': '11260',
      '성북구': '11290',
      '강북구': '11305',
      '도봉구': '11320',
      '노원구': '11350',
      '은평구': '11380',
      '서대문구': '11410',
      '마포구': '11440',
      '양천구': '11470',
      '강서구': '11500',
      '구로구': '11530',
      '금천구': '11545',
      '영등포구': '11560',
      '동작구': '11590',
      '관악구': '11620',
      '서초구': '11650',
      '강남구': '11680',
      '송파구': '11710',
      '강동구': '11740'
    }
  };

  return codes[city]?.[district] || '';
}

/**
 * Helper function to get 법정동 code
 * This is a simplified version - production needs complete mapping
 */
export function getBjdongCode(dong: string): string {
  // This needs comprehensive mapping of all 법정동
  // For now, return placeholder
  const commonDongs: Record<string, string> = {
    '서교동': '10300',
    '연남동': '10400',
    '성산동': '10500',
    '망원동': '10600',
    '합정동': '10700',
    '상수동': '10800'
    // TODO: Add complete mapping
  };

  return commonDongs[dong] || '00000';
}
