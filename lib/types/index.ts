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
  confidence: 'high' | 'medium' | 'low';
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
  creditor: string;
  maxSecuredAmount: number; // 채권최고액
  estimatedPrincipal: number; // Estimated actual loan (채권최고액 / 1.2)
  registrationDate: string;
  status: 'active' | 'cancelled';
  seniority?: 'senior' | 'junior' | 'subordinate'; // Debt seniority level
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

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}
