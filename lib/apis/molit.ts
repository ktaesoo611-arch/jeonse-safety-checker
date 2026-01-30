import axios from 'axios';
import { MolitTransaction, BuildingType } from '../types';

export class MolitAPI {
  private apiKey: string;
  // Apartment (아파트) endpoints
  private baseUrlTrade = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade';
  private baseUrlRent = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent';
  // Multi-family (연립/다세대) endpoints
  private baseUrlMultifamilyTrade = 'https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade';
  private baseUrlMultifamilyRent = 'https://apis.data.go.kr/1613000/RTMSDataSvcRHRent';
  // Officetel (오피스텔) endpoints
  private baseUrlOffiTrade = 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiTrade';
  private baseUrlOffiRent = 'https://apis.data.go.kr/1613000/RTMSDataSvcOffiRent';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get apartment SALE (매매) transaction data
   * @param lawdCd - Legal district code (법정동코드)
   * @param dealYmd - Year-month (YYYYMM)
   */
  async getApartmentTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<MolitTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrlTrade}/getRTMSDataSvcAptTrade`,
        {
          params: {
            serviceKey: this.apiKey,
            pageNo: 1,
            numOfRows: 1000,
            LAWD_CD: lawdCd,
            DEAL_YMD: dealYmd
          },
          timeout: 30000  // Increased from 10s to 30s for Vercel production environment
        }
      );

      // The API returns JSON (not XML as expected)
      // response.data is already parsed as an object by axios
      const result = response.data;

      const items = result.response?.body?.items?.item || [];
      const transactions = Array.isArray(items) ? items : [items];

      console.log(`MOLIT API: Found ${transactions.length} transactions for ${lawdCd} ${dealYmd}`);

      return transactions.map((item: any) => ({
        apartmentName: item.aptNm?.trim() || '',
        legalDong: item.umdNm?.trim() || '',
        exclusiveArea: parseFloat(item.excluUseAr),
        floor: parseInt(item.floor),
        transactionAmount: this.parseAmount(item.dealAmount),
        year: parseInt(item.dealYear),
        month: parseInt(item.dealMonth),
        day: parseInt(item.dealDay)
      }));
    } catch (error) {
      console.error('MOLIT API Error:', error);
      throw new Error('Failed to fetch transaction data');
    }
  }

  /**
   * Get apartment JEONSE (전세) transaction data
   * @param lawdCd - Legal district code (법정동코드)
   * @param dealYmd - Year-month (YYYYMM)
   */
  async getApartmentJeonseTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<MolitTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrlRent}/getRTMSDataSvcAptRent`,
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
      const allTransactions = Array.isArray(items) ? items : [items];

      // Filter to only pure jeonse (monthlyRent = 0)
      // The API returns both jeonse and wolse transactions
      const jeonseOnly = allTransactions.filter((item: any) => {
        const monthlyRent = parseInt(String(item.monthlyRent || '0').replace(/,/g, ''));
        return monthlyRent === 0;
      });

      console.log(`MOLIT Jeonse API: Found ${jeonseOnly.length} pure jeonse transactions (filtered from ${allTransactions.length} total) for ${lawdCd} ${dealYmd}`);

      return jeonseOnly.map((item: any) => ({
        apartmentName: item.aptNm?.trim() || '',
        legalDong: item.umdNm?.trim() || '',
        exclusiveArea: parseFloat(item.excluUseAr),
        floor: parseInt(item.floor),
        transactionAmount: this.parseAmountSafe(item.deposit), // 보증금 (deposit)
        year: parseInt(item.dealYear),
        month: parseInt(item.dealMonth),
        day: parseInt(item.dealDay),
        contractType: item.contractType?.trim() || undefined // 신규/갱신
      }));
    } catch (error) {
      console.error('MOLIT Jeonse API Error:', error);
      throw new Error('Failed to fetch jeonse transaction data');
    }
  }

  /**
   * Get recent JEONSE transactions for specific apartment
   */
  async getRecentJeonseTransactionsForApartment(
    lawdCd: string,
    apartmentName: string,
    area: number | undefined,
    monthsBack: number = 12
  ): Promise<MolitTransaction[]> {
    console.log(`\n🔍 MOLIT Jeonse API Query Details:`);
    console.log(`   lawdCd: "${lawdCd}"`);
    console.log(`   apartmentName: "${apartmentName}"`);
    console.log(`   area: ${area}`);
    console.log(`   monthsBack: ${monthsBack}`);

    const transactions: MolitTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        console.log(`\n📅 Fetching jeonse ${yearMonth}...`);
        const monthData = await this.getApartmentJeonseTransactions(lawdCd, yearMonth);
        console.log(`   → Got ${monthData.length} total jeonse transactions for this district+month`);

        const filtered = monthData.filter(t => {
          const normalizeAptName = (name: string): string => {
            return name
              .replace(/아파트$/g, '')
              .replace(/APT$/gi, '')
              .replace(/\s+/g, '')
              .trim();
          };

          const normalizedQuery = normalizeAptName(apartmentName);
          const normalizedTarget = normalizeAptName(t.apartmentName);

          const nameMatches =
            t.apartmentName === apartmentName ||
            normalizedTarget === normalizedQuery ||
            t.apartmentName.startsWith(apartmentName + '(') ||
            normalizedTarget.startsWith(normalizedQuery + '(');

          if (!nameMatches) {
            return false;
          }

          if (area !== undefined) {
            const areaMatches = Math.abs(t.exclusiveArea - area) < 2;
            if (!areaMatches) {
              console.log(`   ⚠️  Name matched "${t.apartmentName}" but area didn't: ${t.exclusiveArea}㎡ vs ${area}㎡`);
            }
            return areaMatches;
          }

          return true;
        });

        console.log(`   → After filtering: ${filtered.length} jeonse transactions match`);
        if (filtered.length > 0) {
          console.log(`   ✅ Sample jeonse: ${filtered[0].apartmentName}, ${filtered[0].exclusiveArea}㎡, ₩${(filtered[0].transactionAmount / 100000000).toFixed(2)}억`);
        }

        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch jeonse data for ${yearMonth}:`, error);
      }
    }

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get recent SALE transactions for specific apartment
   */
  async getRecentTransactionsForApartment(
    lawdCd: string,
    apartmentName: string,
    area: number | undefined,
    monthsBack: number = 6
  ): Promise<MolitTransaction[]> {
    console.log(`\n🔍 MOLIT API Query Details:`);
    console.log(`   lawdCd: "${lawdCd}"`);
    console.log(`   apartmentName: "${apartmentName}"`);
    console.log(`   area: ${area}`);
    console.log(`   monthsBack: ${monthsBack}`);

    const transactions: MolitTransaction[] = [];
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
        const monthData = await this.getApartmentTransactions(lawdCd, yearMonth);
        console.log(`   → Got ${monthData.length} total transactions for this district+month`);

        // Filter for specific apartment and area
        // Handle building phases: "텐즈힐" should match "텐즈힐(1단지)", "텐즈힐(2단지)", etc.
        // Handle suffix variations: "두산아파트" should match "두산", "두산APT", etc.
        const filtered = monthData.filter(t => {
          // Normalize names for comparison (remove common suffixes)
          const normalizeAptName = (name: string): string => {
            return name
              .replace(/아파트$/g, '')  // Remove "아파트" suffix
              .replace(/APT$/gi, '')    // Remove "APT" suffix
              .replace(/\s+/g, '')      // Remove spaces
              .trim();
          };

          const normalizedQuery = normalizeAptName(apartmentName);
          const normalizedTarget = normalizeAptName(t.apartmentName);

          // Check name match with multiple strategies:
          const nameMatches =
            t.apartmentName === apartmentName ||                    // Exact match
            normalizedTarget === normalizedQuery ||                 // Normalized match
            t.apartmentName.startsWith(apartmentName + '(') ||      // Phase match (e.g., "텐즈힐(1단지)")
            normalizedTarget.startsWith(normalizedQuery + '(');     // Normalized phase match

          if (!nameMatches) {
            return false;
          }

          // If area is specified, check area match (within 2㎡)
          if (area !== undefined) {
            const areaMatches = Math.abs(t.exclusiveArea - area) < 2;
            if (!areaMatches) {
              console.log(`   ⚠️  Name matched "${t.apartmentName}" but area didn't: ${t.exclusiveArea}㎡ vs ${area}㎡`);
            }
            return areaMatches;
          }

          // If no area specified, return all transactions for this building
          return true;
        });

        console.log(`   → After filtering: ${filtered.length} transactions match`);
        if (filtered.length > 0) {
          console.log(`   ✅ Sample match: ${filtered[0].apartmentName}, ${filtered[0].exclusiveArea}㎡, ₩${(filtered[0].transactionAmount / 100000000).toFixed(2)}억`);
        }

        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch data for ${yearMonth}:`, error);
        // Continue with other months
      }
    }

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  private parseAmount(amount: string): number {
    // Amount comes as "123,456" (in 만원)
    const cleanAmount = amount.replace(/,/g, '');
    return parseInt(cleanAmount) * 10000; // Convert to won
  }

  private parseAmountSafe(amount: string | number): number {
    // Handle both string and number formats (jeonse API returns numbers)
    if (typeof amount === 'number') {
      return amount * 10000; // Convert from 만원 to won
    }
    // String format: "123,456" (in 만원)
    const cleanAmount = amount.replace(/,/g, '');
    return parseInt(cleanAmount) * 10000; // Convert to won
  }

  // ==========================================
  // 연립/다세대 (Multi-family) Methods
  // ==========================================

  /**
   * Get 연립/다세대 SALE (매매) transaction data
   * @param lawdCd - Legal district code (법정동코드)
   * @param dealYmd - Year-month (YYYYMM)
   */
  async getMultifamilyTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<MolitTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrlMultifamilyTrade}/getRTMSDataSvcRHTrade`,
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
      const transactions = Array.isArray(items) ? items : [items];

      console.log(`MOLIT 연립/다세대 API: Found ${transactions.length} transactions for ${lawdCd} ${dealYmd}`);

      return transactions.map((item: any) => ({
        apartmentName: item.aptNm?.trim() || item.houseNm?.trim() || '', // May be empty
        legalDong: item.umdNm?.trim() || '',
        exclusiveArea: parseFloat(item.excluUseAr || item.exclusiveArea || '0'),
        floor: parseInt(item.floor || '1'),
        transactionAmount: this.parseAmount(item.dealAmount),
        year: parseInt(item.dealYear),
        month: parseInt(item.dealMonth),
        day: parseInt(item.dealDay),
        buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined
      }));
    } catch (error) {
      console.error('MOLIT 연립/다세대 API Error:', error);
      throw new Error('Failed to fetch 연립/다세대 transaction data');
    }
  }

  /**
   * Get 연립/다세대 JEONSE (전세) transaction data
   * @param lawdCd - Legal district code (법정동코드)
   * @param dealYmd - Year-month (YYYYMM)
   */
  async getMultifamilyJeonseTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<MolitTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrlMultifamilyRent}/getRTMSDataSvcRHRent`,
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
      const allTransactions = Array.isArray(items) ? items : [items];

      // Filter to only pure jeonse (monthlyRent = 0)
      const jeonseOnly = allTransactions.filter((item: any) => {
        const monthlyRent = parseInt(String(item.monthlyRent || '0').replace(/,/g, ''));
        return monthlyRent === 0;
      });

      console.log(`MOLIT 연립/다세대 Jeonse API: Found ${jeonseOnly.length} pure jeonse (filtered from ${allTransactions.length} total) for ${lawdCd} ${dealYmd}`);

      return jeonseOnly.map((item: any) => ({
        apartmentName: item.aptNm?.trim() || item.houseNm?.trim() || '', // May be empty
        legalDong: item.umdNm?.trim() || '',
        exclusiveArea: parseFloat(item.excluUseAr || item.exclusiveArea || '0'),
        floor: parseInt(item.floor || '1'),
        transactionAmount: this.parseAmountSafe(item.deposit),
        year: parseInt(item.dealYear),
        month: parseInt(item.dealMonth),
        day: parseInt(item.dealDay),
        contractType: item.contractType?.trim() || undefined,
        buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined
      }));
    } catch (error) {
      console.error('MOLIT 연립/다세대 Jeonse API Error:', error);
      throw new Error('Failed to fetch 연립/다세대 jeonse data');
    }
  }

  /**
   * Get recent JEONSE transactions for 연립/다세대 by dong (neighborhood)
   * Since building names are often missing for 연립/다세대, we filter by dong instead
   * @param areaFilterPercent - Percentage-based area filter (e.g., 15 = ±15%). Default 15%.
   */
  async getRecentMultifamilyJeonseByDong(
    lawdCd: string,
    dong: string,
    area: number | undefined,
    monthsBack: number = 12,
    areaFilterPercent: number = 15 // ±15% default for triple-weighted approach
  ): Promise<MolitTransaction[]> {
    const areaTolerance = area !== undefined ? area * (areaFilterPercent / 100) : undefined;

    console.log(`\n🔍 MOLIT 연립/다세대 Jeonse Query (Dong-level):`);
    console.log(`   lawdCd: "${lawdCd}"`);
    console.log(`   dong: "${dong}"`);
    console.log(`   area: ${area}㎡`);
    console.log(`   areaFilter: ±${areaFilterPercent}% (±${areaTolerance?.toFixed(1) || 'N/A'}㎡)`);
    console.log(`   monthsBack: ${monthsBack}`);

    const transactions: MolitTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getMultifamilyJeonseTransactions(lawdCd, yearMonth);

        // Filter by dong and optionally by area
        const filtered = monthData.filter(t => {
          // Safety check: if dong is empty, we can't filter properly
          // Log a warning and skip dong filtering (return all transactions for area filtering)
          if (!dong || dong.trim() === '') {
            console.warn(`   ⚠️ Empty dong - cannot filter by neighborhood. Returning all transactions.`);
            // Still apply area filter if specified
            if (area !== undefined && areaTolerance !== undefined) {
              return Math.abs(t.exclusiveArea - area) <= areaTolerance;
            }
            return true;
          }

          // Match by dong (neighborhood) - exact or partial match
          // Note: We check dong.includes(t.legalDong) ONLY if legalDong is non-empty
          // to prevent empty string from matching everything
          const dongMatches = t.legalDong === dong ||
            (t.legalDong && t.legalDong.includes(dong)) ||
            (t.legalDong && dong.includes(t.legalDong));

          if (!dongMatches) return false;

          // If area specified, filter by area (within tolerance)
          if (area !== undefined && areaTolerance !== undefined) {
            return Math.abs(t.exclusiveArea - area) <= areaTolerance;
          }

          return true;
        });

        if (filtered.length > 0) {
          console.log(`   📅 ${yearMonth}: ${filtered.length} jeonse transactions`);
        }

        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch 연립/다세대 jeonse data for ${yearMonth}:`, error);
      }
    }

    console.log(`   ✓ Total: ${transactions.length} jeonse transactions`);

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get recent SALE transactions for 연립/다세대 by dong
   * @param areaFilterPercent - Percentage-based area filter (e.g., 15 = ±15%). Default 15%.
   */
  async getRecentMultifamilyByDong(
    lawdCd: string,
    dong: string,
    area: number | undefined,
    monthsBack: number = 12,
    areaFilterPercent: number = 15 // kept for API compatibility but no longer used for sale queries
  ): Promise<MolitTransaction[]> {
    console.log(`\n🔍 MOLIT 연립/다세대 Sales Query (Dong-level, no area filter):`);
    console.log(`   lawdCd: "${lawdCd}"`);
    console.log(`   dong: "${dong}"`);
    console.log(`   area: ${area}㎡ (not used for filtering — tier calc normalizes via unit price)`);
    console.log(`   monthsBack: ${monthsBack}`);

    const transactions: MolitTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getMultifamilyTransactions(lawdCd, yearMonth);

        const filtered = monthData.filter(t => {
          // Safety check: if dong is empty, we can't filter properly
          if (!dong || dong.trim() === '') {
            console.warn(`   ⚠️ Empty dong - cannot filter by neighborhood. Returning all transactions.`);
            return true;
          }

          // Match by dong only — no area filter for sale queries
          // The downstream tier calculation normalizes via unit price (per ㎡)
          // and handles area variation through percentile stratification
          const dongMatches = t.legalDong === dong ||
            (t.legalDong && t.legalDong.includes(dong)) ||
            (t.legalDong && dong.includes(t.legalDong));

          return dongMatches;
        });

        if (filtered.length > 0) {
          console.log(`   📅 ${yearMonth}: ${filtered.length} transactions`);
        }
        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch 연립/다세대 sales data for ${yearMonth}:`, error);
      }
    }

    console.log(`   ✓ Total: ${transactions.length} transactions`);

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  // ==========================================
  // 오피스텔 (Officetel) Methods
  // ==========================================

  /**
   * Get 오피스텔 SALE (매매) transaction data
   * @param lawdCd - Legal district code (법정동코드)
   * @param dealYmd - Year-month (YYYYMM)
   */
  async getOfficetelTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<MolitTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrlOffiTrade}/getRTMSDataSvcOffiTrade`,
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
      const transactions = Array.isArray(items) ? items : [items];

      console.log(`MOLIT 오피스텔 API: Found ${transactions.length} transactions for ${lawdCd} ${dealYmd}`);

      return transactions.map((item: any) => ({
        apartmentName: item.offiNm?.trim() || '', // 오피스텔 uses offiNm (단지명)
        legalDong: item.umdNm?.trim() || '',
        exclusiveArea: parseFloat(item.excluUseAr || '0'),
        floor: parseInt(item.floor || '1'),
        transactionAmount: this.parseAmount(item.dealAmount),
        year: parseInt(item.dealYear),
        month: parseInt(item.dealMonth),
        day: parseInt(item.dealDay),
        buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined
      }));
    } catch (error) {
      console.error('MOLIT 오피스텔 API Error:', error);
      throw new Error('Failed to fetch 오피스텔 transaction data');
    }
  }

  /**
   * Get 오피스텔 JEONSE (전세) transaction data
   * @param lawdCd - Legal district code (법정동코드)
   * @param dealYmd - Year-month (YYYYMM)
   */
  async getOfficetelJeonseTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<MolitTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrlOffiRent}/getRTMSDataSvcOffiRent`,
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
      const allTransactions = Array.isArray(items) ? items : [items];

      // Filter to only pure jeonse (monthlyRent = 0)
      const jeonseOnly = allTransactions.filter((item: any) => {
        const monthlyRent = parseInt(String(item.monthlyRent || '0').replace(/,/g, ''));
        return monthlyRent === 0;
      });

      console.log(`MOLIT 오피스텔 Jeonse API: Found ${jeonseOnly.length} pure jeonse (filtered from ${allTransactions.length} total) for ${lawdCd} ${dealYmd}`);

      return jeonseOnly.map((item: any) => ({
        apartmentName: item.offiNm?.trim() || '', // 오피스텔 uses offiNm
        legalDong: item.umdNm?.trim() || '',
        exclusiveArea: parseFloat(item.excluUseAr || '0'),
        floor: parseInt(item.floor || '1'),
        transactionAmount: this.parseAmountSafe(item.deposit),
        year: parseInt(item.dealYear),
        month: parseInt(item.dealMonth),
        day: parseInt(item.dealDay),
        contractType: item.contractType?.trim() || undefined,
        buildingYear: item.buildYear ? parseInt(item.buildYear) : undefined
      }));
    } catch (error) {
      console.error('MOLIT 오피스텔 Jeonse API Error:', error);
      throw new Error('Failed to fetch 오피스텔 jeonse data');
    }
  }

  /**
   * Get recent SALE transactions for 오피스텔 by building name
   * Primary approach: officetel buildings have reliable names (offiNm)
   */
  async getRecentOfficetelByBuilding(
    lawdCd: string,
    buildingName: string,
    area: number | undefined,
    monthsBack: number = 12
  ): Promise<MolitTransaction[]> {
    console.log(`\n🔍 MOLIT 오피스텔 Sales Query (Building-level):`);
    console.log(`   lawdCd: "${lawdCd}"`);
    console.log(`   buildingName: "${buildingName}"`);
    console.log(`   area: ${area}㎡`);
    console.log(`   monthsBack: ${monthsBack}`);

    const transactions: MolitTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getOfficetelTransactions(lawdCd, yearMonth);

        const filtered = monthData.filter(t => {
          const normalizeOffiName = (name: string): string => {
            return name
              .replace(/오피스텔$/g, '')  // Remove "오피스텔" suffix
              .replace(/아파트$/g, '')
              .replace(/APT$/gi, '')
              .replace(/\s+/g, '')
              .trim();
          };

          const normalizedQuery = normalizeOffiName(buildingName);
          const normalizedTarget = normalizeOffiName(t.apartmentName);

          const nameMatches =
            t.apartmentName === buildingName ||
            normalizedTarget === normalizedQuery ||
            t.apartmentName.startsWith(buildingName + '(') ||
            normalizedTarget.startsWith(normalizedQuery + '(');

          if (!nameMatches) return false;

          if (area !== undefined) {
            const areaMatches = Math.abs(t.exclusiveArea - area) < 2;
            if (!areaMatches) {
              console.log(`   ⚠️  Name matched "${t.apartmentName}" but area didn't: ${t.exclusiveArea}㎡ vs ${area}㎡`);
            }
            return areaMatches;
          }

          return true;
        });

        if (filtered.length > 0) {
          console.log(`   📅 ${yearMonth}: ${filtered.length} transactions`);
        }
        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch 오피스텔 sales data for ${yearMonth}:`, error);
      }
    }

    console.log(`   ✓ Total: ${transactions.length} building-level transactions`);

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get recent JEONSE transactions for 오피스텔 by building name
   */
  async getRecentOfficetelJeonseByBuilding(
    lawdCd: string,
    buildingName: string,
    area: number | undefined,
    monthsBack: number = 12
  ): Promise<MolitTransaction[]> {
    console.log(`\n🔍 MOLIT 오피스텔 Jeonse Query (Building-level):`);
    console.log(`   lawdCd: "${lawdCd}"`);
    console.log(`   buildingName: "${buildingName}"`);
    console.log(`   area: ${area}㎡`);
    console.log(`   monthsBack: ${monthsBack}`);

    const transactions: MolitTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getOfficetelJeonseTransactions(lawdCd, yearMonth);

        const filtered = monthData.filter(t => {
          const normalizeOffiName = (name: string): string => {
            return name
              .replace(/오피스텔$/g, '')
              .replace(/아파트$/g, '')
              .replace(/APT$/gi, '')
              .replace(/\s+/g, '')
              .trim();
          };

          const normalizedQuery = normalizeOffiName(buildingName);
          const normalizedTarget = normalizeOffiName(t.apartmentName);

          const nameMatches =
            t.apartmentName === buildingName ||
            normalizedTarget === normalizedQuery ||
            t.apartmentName.startsWith(buildingName + '(') ||
            normalizedTarget.startsWith(normalizedQuery + '(');

          if (!nameMatches) return false;

          if (area !== undefined) {
            return Math.abs(t.exclusiveArea - area) < 2;
          }

          return true;
        });

        if (filtered.length > 0) {
          console.log(`   📅 ${yearMonth}: ${filtered.length} jeonse transactions`);
        }
        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch 오피스텔 jeonse data for ${yearMonth}:`, error);
      }
    }

    console.log(`   ✓ Total: ${transactions.length} building-level jeonse transactions`);

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get recent SALE transactions for 오피스텔 by dong (dong-level fallback)
   * Used when building-name match yields insufficient data
   */
  async getRecentOfficetelByDong(
    lawdCd: string,
    dong: string,
    area: number | undefined,
    monthsBack: number = 12
  ): Promise<MolitTransaction[]> {
    console.log(`\n🔍 MOLIT 오피스텔 Sales Query (Dong-level fallback):`);
    console.log(`   lawdCd: "${lawdCd}"`);
    console.log(`   dong: "${dong}"`);
    console.log(`   area: ${area}㎡ (not used for filtering — tier calc normalizes via unit price)`);
    console.log(`   monthsBack: ${monthsBack}`);

    const transactions: MolitTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getOfficetelTransactions(lawdCd, yearMonth);

        const filtered = monthData.filter(t => {
          if (!dong || dong.trim() === '') {
            return true;
          }

          const dongMatches = t.legalDong === dong ||
            (t.legalDong && t.legalDong.includes(dong)) ||
            (t.legalDong && dong.includes(t.legalDong));

          return dongMatches;
        });

        if (filtered.length > 0) {
          console.log(`   📅 ${yearMonth}: ${filtered.length} transactions`);
        }
        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch 오피스텔 sales data for ${yearMonth}:`, error);
      }
    }

    console.log(`   ✓ Total: ${transactions.length} dong-level transactions`);

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  /**
   * Get recent JEONSE transactions for 오피스텔 by dong (dong-level fallback)
   * @param areaFilterPercent - Percentage-based area filter. Default 15%.
   */
  async getRecentOfficetelJeonseByDong(
    lawdCd: string,
    dong: string,
    area: number | undefined,
    monthsBack: number = 12,
    areaFilterPercent: number = 15
  ): Promise<MolitTransaction[]> {
    const areaTolerance = area !== undefined ? area * (areaFilterPercent / 100) : undefined;

    console.log(`\n🔍 MOLIT 오피스텔 Jeonse Query (Dong-level fallback):`);
    console.log(`   lawdCd: "${lawdCd}"`);
    console.log(`   dong: "${dong}"`);
    console.log(`   area: ${area}㎡`);
    console.log(`   areaFilter: ±${areaFilterPercent}% (±${areaTolerance?.toFixed(1) || 'N/A'}㎡)`);
    console.log(`   monthsBack: ${monthsBack}`);

    const transactions: MolitTransaction[] = [];
    const today = new Date();

    for (let i = 0; i < monthsBack; i++) {
      const targetDate = new Date(today);
      targetDate.setMonth(today.getMonth() - i);

      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;
      const yearMonth = `${year}${month.toString().padStart(2, '0')}`;

      try {
        const monthData = await this.getOfficetelJeonseTransactions(lawdCd, yearMonth);

        const filtered = monthData.filter(t => {
          if (!dong || dong.trim() === '') {
            if (area !== undefined && areaTolerance !== undefined) {
              return Math.abs(t.exclusiveArea - area) <= areaTolerance;
            }
            return true;
          }

          const dongMatches = t.legalDong === dong ||
            (t.legalDong && t.legalDong.includes(dong)) ||
            (t.legalDong && dong.includes(t.legalDong));

          if (!dongMatches) return false;

          if (area !== undefined && areaTolerance !== undefined) {
            return Math.abs(t.exclusiveArea - area) <= areaTolerance;
          }

          return true;
        });

        if (filtered.length > 0) {
          console.log(`   📅 ${yearMonth}: ${filtered.length} jeonse transactions`);
        }
        transactions.push(...filtered);
      } catch (error) {
        console.error(`Failed to fetch 오피스텔 jeonse data for ${yearMonth}:`, error);
      }
    }

    console.log(`   ✓ Total: ${transactions.length} dong-level jeonse transactions`);

    return transactions.sort((a, b) => {
      const dateA = new Date(a.year, a.month - 1, a.day);
      const dateB = new Date(b.year, b.month - 1, b.day);
      return dateB.getTime() - dateA.getTime();
    });
  }

  // ==========================================
  // Unified Methods (routes by building type)
  // ==========================================

  /**
   * Get transactions by building type - routes to appropriate API
   */
  async getTransactionsByType(
    buildingType: BuildingType,
    lawdCd: string,
    dealYmd: string
  ): Promise<MolitTransaction[]> {
    if (buildingType === 'multifamily') {
      return this.getMultifamilyTransactions(lawdCd, dealYmd);
    }
    if (buildingType === 'officetel') {
      return this.getOfficetelTransactions(lawdCd, dealYmd);
    }
    return this.getApartmentTransactions(lawdCd, dealYmd);
  }

  /**
   * Get jeonse transactions by building type
   */
  async getJeonseTransactionsByType(
    buildingType: BuildingType,
    lawdCd: string,
    dealYmd: string
  ): Promise<MolitTransaction[]> {
    if (buildingType === 'multifamily') {
      return this.getMultifamilyJeonseTransactions(lawdCd, dealYmd);
    }
    if (buildingType === 'officetel') {
      return this.getOfficetelJeonseTransactions(lawdCd, dealYmd);
    }
    return this.getApartmentJeonseTransactions(lawdCd, dealYmd);
  }

  /**
   * Get recent transactions - routes based on building type
   * For apartments: uses building name matching
   * For 오피스텔: uses building name matching (primary; dong fallback handled in valuation layer)
   * For 연립/다세대: uses dong-level filtering
   */
  async getRecentTransactionsByType(
    buildingType: BuildingType,
    lawdCd: string,
    identifierOrDong: string, // apartmentName for apartments/officetel, dong for multifamily
    area: number | undefined,
    monthsBack: number = 12
  ): Promise<MolitTransaction[]> {
    if (buildingType === 'multifamily') {
      return this.getRecentMultifamilyByDong(lawdCd, identifierOrDong, area, monthsBack);
    }
    if (buildingType === 'officetel') {
      return this.getRecentOfficetelByBuilding(lawdCd, identifierOrDong, area, monthsBack);
    }
    return this.getRecentTransactionsForApartment(lawdCd, identifierOrDong, area, monthsBack);
  }

  /**
   * Get recent jeonse transactions - routes based on building type
   */
  async getRecentJeonseTransactionsByType(
    buildingType: BuildingType,
    lawdCd: string,
    identifierOrDong: string,
    area: number | undefined,
    monthsBack: number = 12
  ): Promise<MolitTransaction[]> {
    if (buildingType === 'multifamily') {
      return this.getRecentMultifamilyJeonseByDong(lawdCd, identifierOrDong, area, monthsBack);
    }
    if (buildingType === 'officetel') {
      return this.getRecentOfficetelJeonseByBuilding(lawdCd, identifierOrDong, area, monthsBack);
    }
    return this.getRecentJeonseTransactionsForApartment(lawdCd, identifierOrDong, area, monthsBack);
  }
}

// Helper function to get district code
export function getDistrictCode(city: string, district: string): string {
  // Mapping of major districts
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
    },
    '서울특별시': {
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
    },
    '경기': {
      // 성남시
      '성남시 분당구': '41135',
      '성남시 수정구': '41131',
      '성남시 중원구': '41133',
      // 수원시
      '수원시 영통구': '41117',
      '수원시 장안구': '41111',
      '수원시 권선구': '41113',
      '수원시 팔달구': '41115',
      // 용인시
      '용인시 수지구': '41465',
      '용인시 기흥구': '41463',
      '용인시 처인구': '41461',
      // 고양시
      '고양시 일산동구': '41285',
      '고양시 일산서구': '41287',
      '고양시 덕양구': '41281',
      // 안양시
      '안양시 동안구': '41173',
      '안양시 만안구': '41171',
      // 안산시
      '안산시 단원구': '41273',
      '안산시 상록구': '41271',
      // 단일 구/시
      '하남시': '41450',
      '과천시': '41290',
      '남양주시': '41360',
      '부천시': '41190',
      '광명시': '41210',
      '화성시': '41590',
      '김포시': '41570',
      '의정부시': '41150',
      '구리시': '41310',
      '군포시': '41410',
      '시흥시': '41390',
      '의왕시': '41430',
      '파주시': '41480',
      '이천시': '41500',
      '오산시': '41370',
      '평택시': '41220',
      '광주시': '41610',
      '양주시': '41630'
    },
    '경기도': {
      // 성남시
      '성남시 분당구': '41135',
      '성남시 수정구': '41131',
      '성남시 중원구': '41133',
      // 수원시
      '수원시 영통구': '41117',
      '수원시 장안구': '41111',
      '수원시 권선구': '41113',
      '수원시 팔달구': '41115',
      // 용인시
      '용인시 수지구': '41465',
      '용인시 기흥구': '41463',
      '용인시 처인구': '41461',
      // 고양시
      '고양시 일산동구': '41285',
      '고양시 일산서구': '41287',
      '고양시 덕양구': '41281',
      // 안양시
      '안양시 동안구': '41173',
      '안양시 만안구': '41171',
      // 안산시
      '안산시 단원구': '41273',
      '안산시 상록구': '41271',
      // 단일 구/시
      '하남시': '41450',
      '과천시': '41290',
      '남양주시': '41360',
      '부천시': '41190',
      '광명시': '41210',
      '화성시': '41590',
      '김포시': '41570',
      '의정부시': '41150',
      '구리시': '41310',
      '군포시': '41410',
      '시흥시': '41390',
      '의왕시': '41430',
      '파주시': '41480',
      '이천시': '41500',
      '오산시': '41370',
      '평택시': '41220',
      '광주시': '41610',
      '양주시': '41630'
    }
  };

  return codes[city]?.[district] || '';
}
