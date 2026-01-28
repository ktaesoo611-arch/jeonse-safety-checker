/**
 * Unified Analysis Types (Option C Schema)
 *
 * Base + Extension pattern for all analysis types
 */

// Analysis type enum
export type AnalysisType = 'jeonse_safety' | 'wolse_price' | 'wolse_safety';

// Analysis status
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Base analysis interface (common fields)
 */
export interface AnalysisBase {
  id: string;
  userId?: string | null;
  propertyId: string;
  type: AnalysisType;
  status: AnalysisStatus;
  paymentAmount?: number | null;
  paymentStatus?: string | null;
  paymentKey?: string | null;
  createdAt: string;
  completedAt?: string | null;
  expiresAt?: string | null;
}

/**
 * Jeonse Safety Analysis
 */
export interface JeonseSafetyData {
  proposedJeonse: number;
  safetyScore: number | null;
  riskLevel: string | null;
  deunggibuData: any | null;
  valuationData: any | null;
  risks: any | null;
  recommendations: any | null;
  ltvRatio: number | null;
  ltvScore: number | null;
  debtScore: number | null;
  legalScore: number | null;
  marketScore: number | null;
  buildingScore: number | null;
}

export interface JeonseSafetyAnalysis extends AnalysisBase {
  type: 'jeonse_safety';
  data: JeonseSafetyData;
}

/**
 * Wolse Price Analysis
 */
export interface WolsePriceData {
  userDeposit: number;
  userMonthlyRent: number;
  userImpliedRate: number;
  // New rent comparison fields (regression-based methodology)
  expectedRent?: number;
  rentDifference?: number;
  rentDifferencePercent?: number;
  cleanTransactionCount?: number;
  outliersRemoved?: number;
  // Market analysis
  marketRate: number;
  marketRateLow: number;
  marketRateHigh: number;
  legalRate: number;
  confidenceLevel: string;
  contractCount: number;
  assessment: string;
  assessmentDetails: string;
  savingsVsMarket: number;
  savingsVsLegal: number;
  trendDirection: string;
  trendPercentage: number;
  trendAdvice: string | null;
  negotiationOptions: any | null;
  recentTransactions: any | null;
  // Tiered expected rent for multifamily
  tieredExpectedRent?: any | null;
  selectedTierExpectedRent?: number | null;
}

export interface WolsePriceAnalysis extends AnalysisBase {
  type: 'wolse_price';
  data: WolsePriceData;
}

/**
 * Wolse Safety Analysis (Future)
 */
export interface WolseSafetyData {
  deposit: number;
  monthlyRent: number;
  safetyScore: number | null;
  riskLevel: string | null;
  deunggibuData: any | null;
  valuationData: any | null;
  risks: any | null;
  recommendations: any | null;
  ltvRatio: number | null;
  depositSafetyRatio: number | null;
}

export interface WolseSafetyAnalysis extends AnalysisBase {
  type: 'wolse_safety';
  data: WolseSafetyData;
}

/**
 * Union type for all analysis types
 */
export type Analysis = JeonseSafetyAnalysis | WolsePriceAnalysis | WolseSafetyAnalysis;

/**
 * Dashboard summary item (from user_analyses_dashboard view)
 */
export interface AnalysisDashboardItem {
  id: string;
  userId: string | null;
  propertyId: string;
  type: AnalysisType;
  status: AnalysisStatus;
  paymentStatus: string | null;
  createdAt: string;
  completedAt: string | null;
  address: string;
  buildingName: string | null;
  exclusiveArea: number | null;
  safetyScore: number | null;
  riskLevel: string | null;
  priceAssessment: string | null;
  depositAmount: number | null;
}

/**
 * Helper to convert DB row to Analysis object
 */
export function dbRowToAnalysisBase(row: any): AnalysisBase {
  return {
    id: row.id,
    userId: row.user_id,
    propertyId: row.property_id,
    type: row.type,
    status: row.status,
    paymentAmount: row.payment_amount,
    paymentStatus: row.payment_status,
    paymentKey: row.payment_key,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    expiresAt: row.expires_at
  };
}

export function dbRowToJeonseSafetyData(row: any): JeonseSafetyData {
  return {
    proposedJeonse: row.proposed_jeonse,
    safetyScore: row.safety_score,
    riskLevel: row.risk_level,
    deunggibuData: row.deunggibu_data,
    valuationData: row.valuation_data,
    risks: row.risks,
    recommendations: row.recommendations,
    ltvRatio: row.ltv_ratio,
    ltvScore: row.ltv_score,
    debtScore: row.debt_score,
    legalScore: row.legal_score,
    marketScore: row.market_score,
    buildingScore: row.building_score
  };
}

export function dbRowToWolsePriceData(row: any): WolsePriceData {
  return {
    userDeposit: row.user_deposit,
    userMonthlyRent: row.user_monthly_rent,
    userImpliedRate: row.user_implied_rate,
    // New rent comparison fields
    expectedRent: row.expected_rent,
    rentDifference: row.rent_difference,
    rentDifferencePercent: row.rent_difference_percent,
    cleanTransactionCount: row.clean_transaction_count,
    outliersRemoved: row.outliers_removed,
    // Market analysis
    marketRate: row.market_rate,
    marketRateLow: row.market_rate_low,
    marketRateHigh: row.market_rate_high,
    legalRate: row.legal_rate,
    confidenceLevel: row.confidence_level,
    contractCount: row.contract_count,
    assessment: row.assessment,
    assessmentDetails: row.assessment_details,
    savingsVsMarket: row.savings_vs_market,
    savingsVsLegal: row.savings_vs_legal,
    trendDirection: row.trend_direction,
    trendPercentage: row.trend_percentage,
    trendAdvice: row.trend_advice,
    negotiationOptions: row.negotiation_options,
    recentTransactions: row.recent_transactions,
    // Tiered expected rent for multifamily
    tieredExpectedRent: row.tiered_expected_rent,
    selectedTierExpectedRent: row.selected_tier_expected_rent
  };
}

export function dbRowToWolseSafetyData(row: any): WolseSafetyData {
  return {
    deposit: row.deposit,
    monthlyRent: row.monthly_rent,
    safetyScore: row.safety_score,
    riskLevel: row.risk_level,
    deunggibuData: row.deunggibu_data,
    valuationData: row.valuation_data,
    risks: row.risks,
    recommendations: row.recommendations,
    ltvRatio: row.ltv_ratio,
    depositSafetyRatio: row.deposit_safety_ratio
  };
}

export function dbRowToDashboardItem(row: any): AnalysisDashboardItem {
  return {
    id: row.id,
    userId: row.user_id,
    propertyId: row.property_id,
    type: row.type,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    address: row.address,
    buildingName: row.building_name,
    exclusiveArea: row.exclusive_area,
    safetyScore: row.safety_score,
    riskLevel: row.risk_level,
    priceAssessment: row.price_assessment,
    depositAmount: row.deposit_amount
  };
}
