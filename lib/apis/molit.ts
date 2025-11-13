import axios from 'axios';
import { MolitTransaction } from '../types';

export class MolitAPI {
  private apiKey: string;
  private baseUrl = 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get apartment transaction data
   * @param lawdCd - Legal district code (법정동코드)
   * @param dealYmd - Year-month (YYYYMM)
   */
  async getApartmentTransactions(
    lawdCd: string,
    dealYmd: string
  ): Promise<MolitTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/getRTMSDataSvcAptTrade`,
        {
          params: {
            serviceKey: this.apiKey,
            pageNo: 1,
            numOfRows: 1000,
            LAWD_CD: lawdCd,
            DEAL_YMD: dealYmd
          },
          timeout: 10000
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
   * Get recent transactions for specific apartment
   */
  async getRecentTransactionsForApartment(
    lawdCd: string,
    apartmentName: string,
    area: number,
    monthsBack: number = 6
  ): Promise<MolitTransaction[]> {
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
        const monthData = await this.getApartmentTransactions(lawdCd, yearMonth);

        // Filter for specific apartment and area
        const filtered = monthData.filter(t =>
          t.apartmentName === apartmentName &&
          Math.abs(t.exclusiveArea - area) < 2 // Within 2㎡
        );

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
    }
    // TODO: Add more cities (Busan, Incheon, etc.)
  };

  return codes[city]?.[district] || '';
}
