import axios from 'axios';
import { WolseTransaction, BuildingType } from '../types';

/**
 * MOLIT Wolse (Monthly Rent) API Service
 * Endpoints:
 * - 아파트 전월세 실거래가 API (RTMSDataSvcAptRent)
 * - 연립/다세대 전월세 실거래가 API (RTMSDataSvcRHRent)
 * - 오피스텔 전월세 실거래가 API (RTMSDataSvcOffiRent)
 *
 * Data includes both jeonse (전세) and wolse (월세) transactions
 */
export class MolitWolseAPI {
  private apiKey: string;
  private baseUrl = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent';
  private baseUrlMultifamily = 'https://apis.data.go.kr/1613000/RTMSDataSvcRHRent';
  private baseUrlOfficetel = 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiRent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get apartment rent transaction data for a district and month
   * @param lawdCd - Legal district code (법정동코드, 5 digits)
   * @param dealYmd - Year-month (YYYYMM)
   */
  async getRentTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<WolseTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/getRTMSDataSvcAptRent`,
        {
          params: {
            serviceKey: this.apiKey,
            pageNo: 1,
            numOfRows: 1000,
            LAWD_CD: lawdCd,
            DEAL_YMD: dealYmd
          },
          timeout: 30000
        }
      );

      const result = response.data;
      const items = result.response?.body?.items?.item || [];
      const transactions = Array.isArray(items) ? items : (items ? [items] : []);

      console.log(`MOLIT Wolse API: Found ${transactions.length} rent transactions for ${lawdCd} ${dealYmd}`);

      return transactions.map((item: any) => ({
        apartmentName: item.aptNm?.trim() || '',
        legalDong: item.umdNm?.trim() || '',
        exclusiveArea: parseFloat(item.excluUseAr) || 0,
        floor: parseInt(item.floor) || 0,
        deposit: this.parseAmount(item.deposit), // 보증금
        monthlyRent: this.parseAmount(item.monthlyRent), // 월세
        year: parseInt(item.dealYear),
        month: parseInt(item.dealMonth),
        day: parseInt(item.dealDay),
        contractType: item.contractType?.trim() || undefined // 신규/갱신
      }));
    } catch (error) {
      console.error('MOLIT Wolse API Error:', error);
      throw new Error('Failed to fetch rent transaction data');
    }
  }

  /**
   * Get wolse-only transactions (filter out pure jeonse)
   * Pure jeonse has monthlyRent = 0
   */
  async getWolseTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<WolseTransaction[]> {
    const allTransactions = await this.getRentTransactions(lawdCd, dealYmd);
    // Filter to only wolse (monthly rent > 0)
    return allTransactions.filter(t => t.monthlyRent > 0);
  }

  /**
   * Get recent wolse transactions for a specific apartment
   * @param lawdCd - Legal district code
   * @param apartmentName - Apartment name to filter
   * @param area - Exclusive area in ㎡ (optional, filters within ±10%)
   * @param monthsBack - Number of months to look back (default 6)
   */
  async getRecentWolseForApartment(
    lawdCd: string,
    apartmentName: string,
    area?: number,
    monthsBack: number = 6
  ): Promise<WolseTransaction[]> {
    console.log(`\n🔍 MOLIT Wolse API Query:`);
    console.log(`   lawdCd: "${lawdCd}"`);
    console.log(`   apartmentName: "${apartmentName}"`);
    console.log(`   area: ${area}㎡`);
    console.log(`   monthsBack: ${monthsBack}`);

    const transactions: WolseTransaction[] = [];
    const today = new Date();

    // Fetch last N months
    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        console.log(`\n📅 Fetching ${yearMonth}...`);
        const monthData = await this.getWolseTransactions(lawdCd, yearMonth);
        console.log(`   → Got ${monthData.length} wolse transactions for this district+month`);

        // Filter for specific apartment
        const filtered = monthData.filter(t => {
          const nameMatches = this.matchApartmentName(t.apartmentName, apartmentName);
          if (!nameMatches) return false;

          // If area is specified, check area match (within 10%)
          if (area !== undefined) {
            const areaTolerance = area * 0.1; // 10% tolerance
            const areaMatches = Math.abs(t.exclusiveArea - area) <= areaTolerance;
            if (!areaMatches) {
              console.log(`   ⚠️  Name matched "${t.apartmentName}" but area didn't: ${t.exclusiveArea}㎡ vs ${area}㎡`);
            }
            return areaMatches;
          }

          return true;
        });

        console.log(`   → After filtering: ${filtered.length} transactions match`);
        if (filtered.length > 0) {
          const sample = filtered[0];
          console.log(`   ✅ Sample: ${sample.apartmentName}, ${sample.exclusiveArea}㎡, 보증금 ${(sample.deposit / 10000).toLocaleString()}만원, 월세 ${(sample.monthlyRent / 10000).toLocaleString()}만원`);
        }

        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch data for ${yearMonth}:`, error);
        // Continue with other months
      }
    }

    // Sort by date (newest first)
    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get wolse transactions for a neighborhood (동) - fallback when building data is insufficient
   */
  async getWolseForDong(
    lawdCd: string,
    dong: string,
    area?: number,
    monthsBack: number = 6,
    areaToleranceRatio: number = 0.1  // Default ±10%, can be set to 0.05 for ±5%
  ): Promise<WolseTransaction[]> {
    console.log(`\n🏘️ MOLIT Wolse API - Dong-level Query:`);
    console.log(`   lawdCd: "${lawdCd}", dong: "${dong}"`);
    console.log(`   Period: ${monthsBack} months, Area tolerance: ±${(areaToleranceRatio * 100).toFixed(0)}%`);

    const transactions: WolseTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getWolseTransactions(lawdCd, yearMonth);

        // Filter by dong and area
        const filtered = monthData.filter(t => {
          const dongMatches = t.legalDong === dong || t.legalDong.includes(dong);
          if (!dongMatches) return false;

          if (area !== undefined) {
            const areaTolerance = area * areaToleranceRatio;
            return Math.abs(t.exclusiveArea - area) <= areaTolerance;
          }
          return true;
        });

        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch dong data for ${yearMonth}:`, error);
      }
    }

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  // ============ 연립/다세대 (Multifamily) Methods ============

  /**
   * Get multifamily rent transaction data for a district and month
   * Uses RTMSDataSvcRHRent endpoint for 연립/다세대
   */
  async getMultifamilyRentTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<WolseTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrlMultifamily}/getRTMSDataSvcRHRent`,
        {
          params: {
            serviceKey: this.apiKey,
            pageNo: 1,
            numOfRows: 1000,
            LAWD_CD: lawdCd,
            DEAL_YMD: dealYmd
          },
          timeout: 30000
        }
      );

      const result = response.data;
      const items = result.response?.body?.items?.item || [];
      const transactions = Array.isArray(items) ? items : (items ? [items] : []);

      console.log(`MOLIT Multifamily Wolse API: Found ${transactions.length} rent transactions for ${lawdCd} ${dealYmd}`);

      return transactions.map((item: any) => ({
        apartmentName: item.bldNm?.trim() || '', // Building name (often empty for 연립/다세대)
        legalDong: item.umdNm?.trim() || '',
        exclusiveArea: parseFloat(item.excluUseAr) || 0,
        floor: parseInt(item.floor) || 0,
        deposit: this.parseAmount(item.deposit),
        monthlyRent: this.parseAmount(item.monthlyRent),
        year: parseInt(item.dealYear),
        month: parseInt(item.dealMonth),
        day: parseInt(item.dealDay),
        contractType: item.contractType?.trim() || undefined,
        buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined
      }));
    } catch (error) {
      console.error('MOLIT Multifamily Wolse API Error:', error);
      throw new Error('Failed to fetch multifamily rent transaction data');
    }
  }

  /**
   * Get multifamily wolse-only transactions (filter out pure jeonse)
   */
  async getMultifamilyWolseTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<WolseTransaction[]> {
    const allTransactions = await this.getMultifamilyRentTransactions(lawdCd, dealYmd);
    return allTransactions.filter(t => t.monthlyRent > 0);
  }

  /**
   * Get recent wolse transactions for a dong (for 연립/다세대)
   * Since 연립/다세대 building names are unreliable, we filter by dong and area
   */
  async getRecentWolseForMultifamilyByDong(
    lawdCd: string,
    dong: string,
    area?: number,
    monthsBack: number = 6,
    areaToleranceRatio: number = 0.1
  ): Promise<WolseTransaction[]> {
    return this.getRecentWolseForMultifamilyByDongs(
      lawdCd,
      [dong],
      area,
      monthsBack,
      areaToleranceRatio
    );
  }

  /**
   * Get recent wolse transactions for multiple dongs (for 연립/다세대)
   * Used for adjacent dong expansion when target dong has insufficient data
   */
  async getRecentWolseForMultifamilyByDongs(
    lawdCd: string,
    dongs: string[],
    area?: number,
    monthsBack: number = 6,
    areaToleranceRatio: number = 0.1
  ): Promise<WolseTransaction[]> {
    const dongList = dongs.length > 0 ? dongs.join(', ') : '(district-wide)';
    console.log(`\n🏘️ MOLIT Multifamily Wolse API - ${dongs.length > 0 ? 'Multi-Dong' : 'District-Wide'} Query:`);
    console.log(`   lawdCd: "${lawdCd}", dongs: ${dongs.length > 0 ? `[${dongList}]` : dongList}`);
    console.log(`   Period: ${monthsBack} months, Area tolerance: ±${(areaToleranceRatio * 100).toFixed(0)}%`);

    const transactions: WolseTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getMultifamilyWolseTransactions(lawdCd, yearMonth);

        // Filter by dongs (if specified) and area
        const filtered = monthData.filter(t => {
          // If dongs specified, filter by dong; otherwise district-wide (no dong filter)
          if (dongs.length > 0) {
            const dongMatches = dongs.some(dong =>
              t.legalDong === dong || t.legalDong.includes(dong)
            );
            if (!dongMatches) return false;
          }

          if (area !== undefined) {
            const areaTolerance = area * areaToleranceRatio;
            return Math.abs(t.exclusiveArea - area) <= areaTolerance;
          }
          return true;
        });

        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch multifamily dong data for ${yearMonth}:`, error);
      }
    }

    console.log(`   → Total: ${transactions.length} transactions found`);

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  // ============ 오피스텔 (Officetel) Methods ============

  /**
   * Get officetel rent transaction data for a district and month
   * Uses RTMSDataSvcOffiRent endpoint for 오피스텔
   */
  async getOfficetelRentTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<WolseTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrlOfficetel}/getRTMSDataSvcOffiRent`,
        {
          params: {
            serviceKey: this.apiKey,
            pageNo: 1,
            numOfRows: 1000,
            LAWD_CD: lawdCd,
            DEAL_YMD: dealYmd
          },
          timeout: 30000
        }
      );

      const result = response.data;
      const items = result.response?.body?.items?.item || [];
      const transactions = Array.isArray(items) ? items : (items ? [items] : []);

      console.log(`MOLIT 오피스텔 Wolse API: Found ${transactions.length} rent transactions for ${lawdCd} ${dealYmd}`);

      return transactions.map((item: any) => ({
        apartmentName: item.offiNm?.trim() || '', // 오피스텔 uses offiNm (단지명)
        legalDong: item.umdNm?.trim() || '',
        exclusiveArea: parseFloat(item.excluUseAr) || 0,
        floor: parseInt(item.floor) || 0,
        deposit: this.parseAmount(item.deposit),
        monthlyRent: this.parseAmount(item.monthlyRent),
        year: parseInt(item.dealYear),
        month: parseInt(item.dealMonth),
        day: parseInt(item.dealDay),
        contractType: item.contractType?.trim() || undefined,
        buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined
      }));
    } catch (error) {
      console.error('MOLIT 오피스텔 Wolse API Error:', error);
      throw new Error('Failed to fetch 오피스텔 rent transaction data');
    }
  }

  /**
   * Get officetel wolse-only transactions (filter out pure jeonse)
   */
  async getOfficetelWolseTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<WolseTransaction[]> {
    const allTransactions = await this.getOfficetelRentTransactions(lawdCd, dealYmd);
    return allTransactions.filter(t => t.monthlyRent > 0);
  }

  /**
   * Get recent wolse transactions for 오피스텔 by building name
   * Primary approach: officetel buildings have reliable names (offiNm)
   */
  async getRecentWolseForOfficetelByBuilding(
    lawdCd: string,
    buildingName: string,
    area?: number,
    monthsBack: number = 6
  ): Promise<WolseTransaction[]> {
    console.log(`\n🏢 MOLIT 오피스텔 Wolse API - Building-level Query:`);
    console.log(`   lawdCd: "${lawdCd}", buildingName: "${buildingName}"`);
    console.log(`   Period: ${monthsBack} months, Area: ${area}㎡`);

    const transactions: WolseTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getOfficetelWolseTransactions(lawdCd, yearMonth);

        const filtered = monthData.filter(t => {
          const nameMatches = this.matchOfficetelName(t.apartmentName, buildingName);
          if (!nameMatches) return false;

          if (area !== undefined) {
            const areaTolerance = area * 0.1; // ±10% tolerance
            return Math.abs(t.exclusiveArea - area) <= areaTolerance;
          }
          return true;
        });

        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch 오피스텔 wolse data for ${yearMonth}:`, error);
      }
    }

    console.log(`   → Total: ${transactions.length} building-level wolse transactions`);

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get recent wolse transactions for 오피스텔 by dong (dong-level fallback)
   * Used when building-name match yields insufficient data
   */
  async getRecentWolseForOfficetelByDong(
    lawdCd: string,
    dong: string,
    area?: number,
    monthsBack: number = 6,
    areaToleranceRatio: number = 0.1
  ): Promise<WolseTransaction[]> {
    console.log(`\n🏢 MOLIT 오피스텔 Wolse API - Dong-level Fallback:`);
    console.log(`   lawdCd: "${lawdCd}", dong: "${dong}"`);
    console.log(`   Period: ${monthsBack} months, Area tolerance: ±${(areaToleranceRatio * 100).toFixed(0)}%`);

    const transactions: WolseTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getOfficetelWolseTransactions(lawdCd, yearMonth);

        const filtered = monthData.filter(t => {
          const dongMatches = t.legalDong === dong || t.legalDong.includes(dong);
          if (!dongMatches) return false;

          if (area !== undefined) {
            const areaTolerance = area * areaToleranceRatio;
            return Math.abs(t.exclusiveArea - area) <= areaTolerance;
          }
          return true;
        });

        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch 오피스텔 dong wolse data for ${yearMonth}:`, error);
      }
    }

    console.log(`   → Total: ${transactions.length} dong-level wolse transactions`);

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  // ============ Unified Methods (Route by Building Type) ============

  /**
   * Get rent transactions based on building type
   * Routes to apartment or multifamily endpoint
   */
  async getRentTransactionsByType(
    buildingType: BuildingType,
    lawdCd: string,
    dealYmd: string
  ): Promise<WolseTransaction[]> {
    if (buildingType === 'officetel') {
      return this.getOfficetelRentTransactions(lawdCd, dealYmd);
    }
    return buildingType === 'apartment'
      ? this.getRentTransactions(lawdCd, dealYmd)
      : this.getMultifamilyRentTransactions(lawdCd, dealYmd);
  }

  /**
   * Get wolse transactions based on building type
   */
  async getWolseTransactionsByType(
    buildingType: BuildingType,
    lawdCd: string,
    dealYmd: string
  ): Promise<WolseTransaction[]> {
    if (buildingType === 'officetel') {
      return this.getOfficetelWolseTransactions(lawdCd, dealYmd);
    }
    return buildingType === 'apartment'
      ? this.getWolseTransactions(lawdCd, dealYmd)
      : this.getMultifamilyWolseTransactions(lawdCd, dealYmd);
  }

  /**
   * Get recent wolse transactions based on building type
   * For apartments: uses building name matching
   * For officetel: uses building name matching (primary; identifier = building name)
   * For multifamily: uses dong-level matching (building names are unreliable)
   */
  async getRecentWolseByType(
    buildingType: BuildingType,
    lawdCd: string,
    identifier: string, // apartment/officetel name for 'apartment'/'officetel', dong name for 'multifamily'
    area?: number,
    monthsBack: number = 6
  ): Promise<WolseTransaction[]> {
    if (buildingType === 'apartment') {
      return this.getRecentWolseForApartment(lawdCd, identifier, area, monthsBack);
    } else if (buildingType === 'officetel') {
      return this.getRecentWolseForOfficetelByBuilding(lawdCd, identifier, area, monthsBack);
    } else {
      // For 연립/다세대, identifier is dong name
      return this.getRecentWolseForMultifamilyByDong(lawdCd, identifier, area, monthsBack);
    }
  }

  /**
   * Match officetel names with various normalizations
   */
  private matchOfficetelName(targetName: string, queryName: string): boolean {
    const normalize = (name: string): string => {
      return name
        .replace(/오피스텔$/g, '')
        .replace(/아파트$/g, '')
        .replace(/APT$/gi, '')
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();
    };

    const normalizedQuery = normalize(queryName);
    const normalizedTarget = normalize(targetName);

    return (
      targetName === queryName ||
      normalizedTarget === normalizedQuery ||
      targetName.startsWith(queryName + '(') ||
      normalizedTarget.startsWith(normalizedQuery + '(') ||
      normalizedTarget.includes(normalizedQuery)
    );
  }

  /**
   * Match apartment names with various normalizations
   */
  private matchApartmentName(targetName: string, queryName: string): boolean {
    const normalize = (name: string): string => {
      return name
        .replace(/아파트$/g, '')
        .replace(/APT$/gi, '')
        .replace(/\s+/g, '')
        .trim()
        .toLowerCase();
    };

    const normalizedQuery = normalize(queryName);
    const normalizedTarget = normalize(targetName);

    return (
      targetName === queryName ||
      normalizedTarget === normalizedQuery ||
      targetName.startsWith(queryName + '(') ||
      normalizedTarget.startsWith(normalizedQuery + '(') ||
      normalizedTarget.includes(normalizedQuery)
    );
  }

  /**
   * Parse amount from API response
   * Amount comes as string like "12,345" (in 만원)
   */
  private parseAmount(amount: string | number | undefined): number {
    if (amount === undefined || amount === null || amount === '') return 0;
    if (typeof amount === 'number') return amount * 10000;
    const cleanAmount = amount.toString().replace(/,/g, '');
    const parsed = parseInt(cleanAmount);
    return isNaN(parsed) ? 0 : parsed * 10000; // Convert 만원 to 원
  }
}

// Re-export district code helper from main molit module
export { getDistrictCode } from './molit';
