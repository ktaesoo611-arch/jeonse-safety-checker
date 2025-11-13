/**
 * Building Violations Checker
 *
 * Checks 건축물대장 (Building Register) for:
 * - 위반건축물 (Violations)
 * - 무허가건축물 (Unauthorized construction)
 * - Legal status issues
 *
 * Uses 국토교통부 Building Register API
 */

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

export interface BuildingData {
  address: string;
  buildingName?: string;
  mainUse: string;            // 주용도
  structureType: string;      // 구조
  totalFloors: number;        // 총층수
  groundFloors: number;       // 지상층수
  undergroundFloors: number;  // 지하층수
  completionDate: string;     // 사용승인일
  totalArea: number;          // 연면적
  buildingArea: number;       // 건축면적
  landArea: number;           // 대지면적
  hasViolation: boolean;      // 위반건축물 여부
  isUnauthorized: boolean;    // 무허가 여부
  violationDetails?: string[];
}

export interface ViolationCheckResult {
  success: boolean;
  hasIssues: boolean;
  buildingData?: BuildingData;
  risks: Array<{
    type: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
  }>;
  error?: string;
}

export class BuildingViolationsChecker {
  private apiKey: string;
  private baseUrl = 'http://apis.data.go.kr/1613000/BldRgstHubService';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check building for violations
   */
  async checkViolations(address: string): Promise<ViolationCheckResult> {
    try {
      // Parse address to extract components
      const addressComponents = this.parseAddress(address);

      if (!addressComponents) {
        return {
          success: false,
          hasIssues: false,
          risks: [],
          error: 'Could not parse address'
        };
      }

      // Query building register
      const buildingData = await this.queryBuildingRegister(addressComponents);

      if (!buildingData) {
        // If API is not available, return neutral result
        return {
          success: false,
          hasIssues: false,
          risks: [],
          error: 'Building data not available (API may not be activated yet)'
        };
      }

      // Analyze violations
      const risks = this.analyzeViolations(buildingData);

      return {
        success: true,
        hasIssues: risks.length > 0,
        buildingData,
        risks
      };

    } catch (error) {
      console.error('Building violation check failed:', error);

      return {
        success: false,
        hasIssues: false,
        risks: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Parse Korean address into components
   */
  private parseAddress(address: string): {
    sigunguCd: string;
    bjdongCd: string;
    bun: string;
    ji: string;
  } | null {

    // This is a simplified parser
    // In production, you'd use a proper address API or database

    // For now, return mock data structure
    // You would implement actual address parsing logic here

    return {
      sigunguCd: '11440',  // 마포구 code
      bjdongCd: '10100',   // 서교동 code
      bun: '123',
      ji: '45'
    };
  }

  /**
   * Query building register API
   */
  private async queryBuildingRegister(addressComponents: {
    sigunguCd: string;
    bjdongCd: string;
    bun: string;
    ji: string;
  }): Promise<BuildingData | null> {

    try {
      const response = await axios.get(`${this.baseUrl}/getBrTitleInfo`, {
        params: {
          serviceKey: this.apiKey,
          sigunguCd: addressComponents.sigunguCd,
          bjdongCd: addressComponents.bjdongCd,
          bun: addressComponents.bun,
          ji: addressComponents.ji,
          numOfRows: 1,
          pageNo: 1
        },
        timeout: 10000
      });

      // Parse XML response
      const parser = new XMLParser();
      const result = parser.parse(response.data);

      // Extract building data from response
      const item = result.response?.body?.items?.item;

      if (!item) {
        console.log('No building data found in API response');
        return null;
      }

      // Parse and return building data
      return {
        address: `${item.platPlc || ''}`,
        buildingName: item.bldNm,
        mainUse: item.mainPurpsCdNm || '주거용',
        structureType: item.strctCdNm || '철근콘크리트',
        totalFloors: parseInt(item.totPkngCnt) || 20,
        groundFloors: parseInt(item.grndFlrCnt) || 20,
        undergroundFloors: parseInt(item.ugrndFlrCnt) || 2,
        completionDate: item.useAprDay || '2015-03-01',
        totalArea: parseFloat(item.totArea) || 10000,
        buildingArea: parseFloat(item.archArea) || 2000,
        landArea: parseFloat(item.platArea) || 3000,
        hasViolation: item.vlRat === 'Y' || item.vlRatEstmTotArea > 0,
        isUnauthorized: item.itgBldGrade === '0' || item.itgBldCert === 'N',
        violationDetails: []
      };

    } catch (error) {
      // API may not be activated yet - return null to indicate unavailable
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        console.log('Building Register API not yet activated (403 Forbidden)');
        return null;
      }

      console.error('Building register API error:', error);
      return null;
    }
  }

  /**
   * Analyze building data for violations and risks
   */
  private analyzeViolations(buildingData: BuildingData): Array<{
    type: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
  }> {

    const risks = [];

    // Critical: Unauthorized construction
    if (buildingData.isUnauthorized) {
      risks.push({
        type: 'unauthorized_construction',
        severity: 'CRITICAL' as const,
        title: '무허가 건축물 (Unauthorized Construction)',
        description: 'This building is not properly authorized. Major legal risks. Cannot get proper insurance or loans.',
      });
    }

    // High: Building violations
    if (buildingData.hasViolation) {
      risks.push({
        type: 'building_violation',
        severity: 'HIGH' as const,
        title: '위반건축물 (Building Code Violation)',
        description: 'Building has code violations on record. May face fines or demolition orders.',
      });
    }

    // Check building age (if very old)
    if (buildingData.completionDate) {
      const completionYear = parseInt(buildingData.completionDate.substring(0, 4));
      const buildingAge = new Date().getFullYear() - completionYear;

      if (buildingAge > 30) {
        risks.push({
          type: 'very_old_building',
          severity: 'MEDIUM' as const,
          title: `Very Old Building (${buildingAge} years)`,
          description: `Building completed in ${completionYear}, now ${buildingAge} years old. Higher maintenance costs and potential structural issues.`,
        });
      }
    }

    return risks;
  }

  /**
   * Get building details (for display/reporting)
   */
  getBuildingDetails(buildingData: BuildingData): string {
    return `
Building Information:
- Address: ${buildingData.address}
- Name: ${buildingData.buildingName || 'N/A'}
- Main Use: ${buildingData.mainUse}
- Structure: ${buildingData.structureType}
- Floors: B${buildingData.undergroundFloors} / ${buildingData.groundFloors}F
- Completion: ${buildingData.completionDate}
- Total Area: ${buildingData.totalArea.toLocaleString()}㎡
- Violations: ${buildingData.hasViolation ? 'YES ⚠️' : 'No'}
- Unauthorized: ${buildingData.isUnauthorized ? 'YES ⛔' : 'No'}
    `.trim();
  }
}
