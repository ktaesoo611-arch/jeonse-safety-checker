// Property Types
export interface PropertyDetails {
  address: string;
  city: string;
  district: string;
  dong: string;
  buildingName: string;
  buildingNumber: string;
  floor: number;
  unit: string;
  exclusiveArea: number;
}

// Transaction Types
export interface MolitTransaction {
  apartmentName: string;
  legalDong: string;
  exclusiveArea: number;
  floor: number;
  transactionAmount: number;
  year: number;
  month: number;
  day: number;
}

// Valuation Types
export interface ValuationResult {
  valueLow: number;
  valueMid: number;
  valueHigh: number;
  confidence: number; // 0-1 range (statistical confidence based on R² and data quality)
  recentSales: Array<{
    date: string;
    price: number;
    floor: number;
    daysAgo: number;
  }>;
  pricePerPyeong: number;
  trend: 'rising' | 'stable' | 'falling';
  trendPercentage: number;
  dataSources: Array<{
    name: string;
    value: number;
    weight: number;
  }>;
  allTransactions?: MolitTransaction[]; // All SALE transactions for price analysis
  allJeonseTransactions?: MolitTransaction[]; // All JEONSE transactions for jeonse price analysis
}

// Deunggibu Types
export interface OwnershipInfo {
  ownerName: string;
  ownerIdNumber?: string;
  ownershipPercentage: number;
  registrationDate: string;
  acquisitionMethod: string; // 매매, 증여, 상속, etc.
}

export interface MortgageInfo {
  priority: number;
  type: string; // 근저당권, 전세권, etc.
  maxSecuredAmount: number; // 채권최고액
  estimatedPrincipal: number; // Estimated actual loan (채권최고액 / 1.2)
  registrationDate: string;
  status: 'active' | 'cancelled';
  seniority?: 'senior' | 'junior' | 'subordinate'; // Debt seniority level
  creditor?: string; // Extracted but not displayed (for internal use only)
}

export interface LienInfo {
  type: string; // 가압류, 압류, etc.
  creditor: string;
  amount?: number;
  registrationDate: string;
  description: string;
}

export interface JeonseRightInfo {
  tenant: string;
  amount: number;
  registrationDate: string;
  expirationDate?: string;
  type?: string; // 전세권, 임차권등기, etc.
}

export interface DeunggibuData {
  // Property info
  address: string;
  buildingName?: string;
  buildingYear?: number;
  area: number;
  landArea?: number;

  // Ownership
  ownership: OwnershipInfo[];
  ownershipChanges: number;
  recentOwnershipChange?: string;

  // Mortgages
  mortgages: MortgageInfo[];
  totalMortgageAmount: number;
  totalEstimatedPrincipal: number;

  // Liens and restrictions
  liens: LienInfo[];
  hasSeizure: boolean; // 압류
  hasProvisionalSeizure: boolean; // 가압류
  hasAuction: boolean; // 경매개시결정

  // Jeonse rights
  jeonseRights: JeonseRightInfo[];

  // Other rights
  hasSuperficies: boolean; // 지상권
  hasEasement: boolean; // 지역권
  hasProvisionalRegistration: boolean; // 가등기
  hasProvisionalDisposition: boolean; // 가처분
  hasAdvanceNotice: boolean; // 예고등기
  hasUnregisteredLandRights: boolean; // 대지권미등기

  // Metadata
  issueDate: string;
  documentNumber: string;
}

// Building Register Types
export interface BuildingViolation {
  type: 'violation' | 'unauthorized';
  description: string;
  date?: string;
  severity: 'critical' | 'high' | 'medium';
}

export interface BuildingRegisterData {
  buildingName: string;
  completionDate: string;
  structure: string;
  totalFloors: number;
  hasViolations: boolean;
  hasUnauthorizedConstruction: boolean;
  violations: BuildingViolation[];
  legalStatus: 'legal' | 'violated' | 'unauthorized';
}

// Analysis Types
export interface AnalysisRequest {
  propertyDetails: PropertyDetails;
  proposedJeonse: number;
  userId?: string;
}

export interface RiskFinding {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface AnalysisResult {
  id: string;
  propertyId: string;
  userId?: string;
  proposedJeonse: number;

  // Valuation
  valuation: ValuationResult;

  // Deunggibu
  deunggibuData?: DeunggibuData;

  // Building Register
  buildingData?: BuildingRegisterData;

  // Risk Analysis
  safetyScore: number; // 0-100
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  risks: RiskFinding[];

  // Payment
  paymentId?: string;
  paymentStatus?: PaymentStatus;

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

// Payment Types
export type PaymentStatus = 'pending' | 'approved' | 'canceled' | 'failed' | 'refunded';

export type PaymentMethod = '카드' | '가상계좌' | '간편결제' | '계좌이체' | '휴대폰';

export interface PaymentData {
  id: string;
  analysisId?: string;

  // Toss Payments fields
  paymentKey?: string;
  orderId: string;
  orderName: string;

  // Payment details
  amount: number;
  currency: string;
  method?: PaymentMethod;

  // Customer info
  customerEmail?: string;
  customerName?: string;
  customerPhone?: string;

  // Status
  status: PaymentStatus;

  // Toss response data
  approvedAt?: string;
  receiptUrl?: string;
  cardInfo?: Record<string, any>;
  virtualAccountInfo?: Record<string, any>;
  transferInfo?: Record<string, any>;
  mobilePhoneInfo?: Record<string, any>;

  // Error info
  tossFailureCode?: string;
  tossFailureMessage?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  analysisId: string;
  amount: number;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
}

export interface TossPaymentResponse {
  paymentKey: string;
  orderId: string;
  status: string;
  totalAmount: number;
  balanceAmount: number;
  suppliedAmount: number;
  vat: number;
  method: string;
  version: string;
  approvedAt: string;
  requestedAt: string;
  receiptUrl?: string;
  card?: Record<string, any>;
  virtualAccount?: Record<string, any>;
  transfer?: Record<string, any>;
  mobilePhone?: Record<string, any>;
  failure?: {
    code: string;
    message: string;
  };
}

// ============ Wolse (Monthly Rent) Types ============

export interface WolseTransaction {
  apartmentName: string;
  legalDong: string;
  exclusiveArea: number;
  floor: number;
  deposit: number; // 보증금 (in won)
  monthlyRent: number; // 월세 (in won)
  year: number;
  month: number;
  day: number;
  contractType?: string; // 신규, 갱신
}

export interface WolseMarketRate {
  id?: string;
  lawdCd: string;
  apartmentName: string;
  areaRangeMin: number;
  areaRangeMax: number;
  marketRate: number; // Annual conversion rate (%)
  rate25thPercentile: number;
  rate75thPercentile: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  contractCount: number;
  trendDirection: 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING';
  trendPercentage: number;
  calculatedAt: string;
  expiresAt: string;
}

export interface LegalConversionRate {
  effectiveDate: string;
  bokBaseRate: number; // Bank of Korea base rate (%)
  legalCap: number; // min(10%, BOK + 2%)
}

export interface WolseQuote {
  deposit: number;
  monthlyRent: number;
}

export interface WolseNegotiationOption {
  name: string;
  rate: number;
  deposit: number;
  monthlyRent: number;
  monthlySavings: number;
  yearlySavings: number;
  script: string;
  recommended?: boolean;
}

export interface WolseAnalysisResult {
  id: string;
  propertyId: string;
  userId?: string;

  // User's quote
  userDeposit: number;
  userMonthlyRent: number;
  userImpliedRate: number;

  // Rent comparison (Jeonse-centric methodology)
  expectedRent: number;           // Expected rent at user's deposit based on market jeonse
  rentDifference: number;         // actualRent - expectedRent (positive = overpaying)
  rentDifferencePercent: number;  // Percentage difference

  // Jeonse-centric analysis
  impliedJeonseToday?: number;    // Today's market jeonse from regression
  userImpliedJeonse?: number;     // User's implied jeonse from their quote
  jeonseSlope?: number;           // Jeonse trend slope (원/month)

  // Market analysis
  marketRate: number;
  marketRateRange: {
    low: number; // 25th percentile
    high: number; // 75th percentile
  };
  legalRate: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  dataSource?: 'building' | 'dong' | 'district';
  dataSourceNote?: string;  // Explains where data came from
  contractCount: number;
  cleanTransactionCount?: number;  // Transactions after outlier removal
  outliersRemoved?: number;        // Number of outliers removed

  // Assessment
  assessment: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED' | 'SEVERELY_OVERPRICED';
  assessmentDetails: string;

  // Savings calculation
  savingsPotential: {
    vsMarket: number;
    vsLegal: number;
  };

  // Trend
  trend: {
    direction: 'RISING' | 'LIKELY_RISING' | 'STABLE' | 'LIKELY_DECLINING' | 'DECLINING';
    percentage: number;
    advice: string;
  };

  // Recommendations
  negotiationOptions: WolseNegotiationOption[];

  // Reference transactions
  recentTransactions: WolseTransaction[];

  // Metadata
  createdAt: string;
  expiresAt: string;
}

export interface WolseAnalysisRequest {
  propertyDetails: {
    city: string;
    district: string;
    dong: string;
    apartmentName: string;
    exclusiveArea: number;
  };
  quote: WolseQuote;
  userId?: string;
}
