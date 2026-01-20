/**
 * Scoring utilities for dynamic risk calculation based on tier selection
 *
 * This replicates the backend scoring logic for client-side recalculation
 * when users change their tier selection.
 */

export type TierKey = 'budget' | 'standard' | 'mid' | 'premium';
export type RiskLevel = 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface TierEstimate {
  tier: string;
  label: string;
  value: number;
  unitPrice: number;
}

export interface RiskItem {
  type: string;
  severity: string;
  description: string;
  category?: string;
}

/**
 * Calculate LTV score from LTV ratio (0-100)
 *
 * Excellent: < 50% = 100 points
 * Good: 50-60% = 80 points
 * Acceptable: 60-70% = 60 points
 * Risky: 70-80% = 40 points
 * Dangerous: 80-90% = 20 points
 * Critical: > 90% = 0 points
 */
export function calculateLtvScore(ltvRatio: number): number {
  const ltv = ltvRatio / 100; // Convert percentage to decimal
  if (ltv < 0.50) return 100;
  if (ltv < 0.60) return 80;
  if (ltv < 0.70) return 60;
  if (ltv < 0.80) return 40;
  if (ltv < 0.90) return 20;
  return 0;
}

/**
 * Calculate overall safety score (weighted average)
 *
 * Weights:
 * - LTV Score: 40%
 * - Legal Score: 30%
 * - Market Score: 15%
 * - Building Score: 15%
 */
export function calculateOverallScore(
  ltvScore: number,
  legalScore: number,
  marketScore: number,
  buildingScore: number
): number {
  return Math.round(
    ltvScore * 0.40 +
    legalScore * 0.30 +
    marketScore * 0.15 +
    buildingScore * 0.15
  );
}

/**
 * Determine risk level from overall score and risk factors
 *
 * - Any critical risk factors = CRITICAL
 * - Score >= 75 = SAFE
 * - Score >= 60 = MODERATE
 * - Score >= 40 = HIGH
 * - Score < 40 = CRITICAL
 */
export function determineRiskLevel(
  score: number,
  risks: RiskItem[]
): RiskLevel {
  // Any critical risk factors = CRITICAL
  if (risks.some(r => r.severity === 'CRITICAL')) {
    return 'CRITICAL';
  }

  // Score-based determination
  if (score >= 75) return 'SAFE';
  if (score >= 60) return 'MODERATE';
  if (score >= 40) return 'HIGH';
  return 'CRITICAL';
}

/**
 * Calculate LTV ratio from debt and property value
 */
export function calculateLtvRatio(
  totalDebt: number,
  proposedDeposit: number,
  propertyValue: number
): number {
  if (propertyValue <= 0) return 0;
  return ((totalDebt + proposedDeposit) / propertyValue) * 100;
}

/**
 * Calculate available equity
 */
export function calculateEquity(
  propertyValue: number,
  totalDebt: number,
  proposedDeposit: number
): number {
  return propertyValue - totalDebt - proposedDeposit;
}

/**
 * Get property value for a specific tier
 */
export function getTierValue(
  tierEstimates: TierEstimate[] | null | undefined,
  selectedTier: TierKey,
  fallbackValue: number
): number {
  if (!tierEstimates || tierEstimates.length === 0) {
    return fallbackValue;
  }
  const tier = tierEstimates.find(t => t.tier === selectedTier);
  return tier?.value || fallbackValue;
}

/**
 * Get tier label
 */
export function getTierLabel(
  tierEstimates: TierEstimate[] | null | undefined,
  selectedTier: TierKey
): string {
  if (!tierEstimates || tierEstimates.length === 0) {
    return 'Default';
  }
  const tier = tierEstimates.find(t => t.tier === selectedTier);
  return tier?.label || 'Default';
}

/**
 * Generate verdict based on risk level and score
 */
export function generateVerdict(riskLevel: RiskLevel, score: number): string {
  switch (riskLevel) {
    case 'SAFE':
      return `Your deposit safety analysis shows a score of ${score}/100, indicating low risk. The property appears to have adequate equity and no significant legal issues. You may proceed with caution while following our recommended actions.`;
    case 'MODERATE':
      return `Your deposit safety analysis shows a score of ${score}/100, indicating moderate risk. There are some factors to consider before proceeding. Review the detailed breakdown below for specific concerns and recommendations.`;
    case 'HIGH':
      return `Your deposit safety analysis shows a score of ${score}/100, indicating elevated risk. We recommend carefully reviewing the risk factors below and considering alternatives before proceeding with this property.`;
    case 'CRITICAL':
      return `Your deposit safety analysis shows a score of ${score}/100, indicating critical risk. We strongly recommend reconsidering this property due to significant safety concerns identified in the analysis.`;
    default:
      return `Your deposit safety analysis is complete. Review the detailed breakdown below for a comprehensive understanding of your rental situation.`;
  }
}
