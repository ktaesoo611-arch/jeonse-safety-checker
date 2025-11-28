/**
 * Risk Analyzer
 *
 * Comprehensive jeonse safety analysis combining:
 * - LTV (Loan-to-Value) ratio
 * - 소액보증금 우선변제 (Small amount priority repayment)
 * - Legal issue severity scoring
 * - Market conditions
 * - Building age and condition
 *
 * Generates safety score (0-100) and actionable recommendations
 */

import { DeunggibuData, MortgageInfo, LienInfo } from '../types';

export interface PropertyValuation {
  valueLow: number;
  valueMid: number;
  valueHigh: number;
  confidence: number;
  marketTrend: 'rising' | 'stable' | 'falling';
}

export interface RiskFactor {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  impact: number; // -100 to 0 (negative impact on safety score)
  category: 'debt' | 'legal' | 'market' | 'building' | 'priority';
}

export interface SmallAmountPriorityResult {
  isEligible: boolean;
  protectedAmount: number;
  threshold: number;
  region: string;
  explanation: string;
}

export interface RiskAnalysisResult {
  // Overall assessment
  overallScore: number; // 0-100
  riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  verdict: string;

  // Component scores
  ltvRatio: number;
  ltvScore: number;
  debtScore: number;
  legalScore: number;
  marketScore: number;
  buildingScore: number;

  // Priority repayment
  smallAmountPriority: SmallAmountPriorityResult;

  // Risk factors
  risks: RiskFactor[];

  // Recommendations
  recommendations: {
    mandatory: string[];
    recommended: string[];
    optional: string[];
  };

  // Top-level metrics (for API convenience)
  ltv: number;  // LTV as percentage (0-100)
  totalDebt: number;
  availableEquity: number;
  debtRanking: MortgageRanking[];

  // Detailed breakdown
  breakdown: {
    totalPropertyValue: number;
    totalDebt: number;
    proposedJeonse: number;
    totalExposure: number; // debt + jeonse
    availableEquity: number; // value - total exposure
    debtRanking: MortgageRanking[];
  };
}

interface MortgageRanking {
  rank: number;
  type: string;
  amount: number;
  registrationDate: string;
  priority: 'senior' | 'junior' | 'subordinate';
}

export class RiskAnalyzer {

  /**
   * Main analysis method
   */
  analyze(
    propertyValue: number,
    proposedJeonse: number,
    deunggibu: DeunggibuData,
    valuation: PropertyValuation,
    buildingAge: number
  ): RiskAnalysisResult {

    // Calculate component scores
    // NOTE: Use totalEstimatedPrincipal (실제 채권액 추정치) for mortgage debt
    // 채권최고액 is typically 120% of actual principal - we use estimated principal for risk assessment
    // IMPORTANT: Include both mortgage debt AND existing jeonse rights in LTV calculation
    const totalMortgageDebt = deunggibu.totalEstimatedPrincipal;
    const totalJeonseLeaseDebt = deunggibu.jeonseRights.reduce((sum, j) => sum + j.amount, 0);
    const totalExistingDebt = totalMortgageDebt + totalJeonseLeaseDebt;

    const ltvRatio = this.calculateLTV(
      totalExistingDebt,  // Include both mortgages AND jeonse rights
      proposedJeonse,
      propertyValue
    );

    const ltvScore = this.scoreLTV(ltvRatio);
    const debtScore = this.scoreDebtBurden(deunggibu, propertyValue);
    const legalScore = this.scoreLegalIssues(deunggibu);
    const marketScore = this.scoreMarketConditions(valuation);
    const buildingScore = this.scoreBuildingCondition(buildingAge);

    // Check small amount priority eligibility
    const smallAmountPriority = this.checkSmallAmountPriority(
      proposedJeonse,
      deunggibu.address
    );

    // Identify all risk factors
    const risks = this.identifyRisks(
      deunggibu,
      propertyValue,
      proposedJeonse,
      ltvRatio,
      smallAmountPriority,
      valuation,
      buildingAge
    );

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      ltvScore * 0.30 +      // 30% - LTV is critical
      debtScore * 0.25 +     // 25% - Total debt burden
      legalScore * 0.25 +    // 25% - Legal issues
      marketScore * 0.10 +   // 10% - Market conditions
      buildingScore * 0.10   // 10% - Building condition
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(overallScore, risks);

    // Generate verdict
    const verdict = this.generateVerdict(riskLevel, overallScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      risks,
      smallAmountPriority,
      deunggibu,
      riskLevel
    );

    // Create debt ranking
    const debtRanking = this.rankDebts(deunggibu, proposedJeonse);

    // Calculate breakdown
    // Reuse total debt calculation from above (already includes mortgages + jeonse rights)
    const totalDebt = totalExistingDebt;
    const totalExposure = totalDebt + proposedJeonse;
    const availableEquity = propertyValue - totalExposure;

    console.log('DEBUG: Risk analyzer values before return:', {
      ltv: ltvRatio * 100,
      totalDebt,
      availableEquity,
      debtRankingCount: debtRanking.length
    });

    return {
      overallScore,
      riskLevel,
      verdict,
      ltvRatio,
      ltvScore,
      debtScore,
      legalScore,
      marketScore,
      buildingScore,
      smallAmountPriority,
      risks,
      recommendations,
      // Add these at top level for API access
      ltv: ltvRatio * 100,  // Convert to percentage
      totalDebt,
      availableEquity,
      debtRanking,
      breakdown: {
        totalPropertyValue: propertyValue,
        totalDebt,
        proposedJeonse,
        totalExposure,
        availableEquity,
        debtRanking
      }
    };
  }

  /**
   * Calculate LTV ratio
   */
  private calculateLTV(
    existingDebt: number,
    proposedJeonse: number,
    propertyValue: number
  ): number {
    const totalExposure = existingDebt + proposedJeonse;
    return totalExposure / propertyValue;
  }

  /**
   * Score LTV ratio (0-100)
   *
   * Excellent: < 50% = 100 points
   * Good: 50-60% = 80 points
   * Acceptable: 60-70% = 60 points
   * Risky: 70-80% = 40 points
   * Dangerous: 80-90% = 20 points
   * Critical: > 90% = 0 points
   */
  private scoreLTV(ltv: number): number {
    if (ltv < 0.50) return 100;
    if (ltv < 0.60) return 80;
    if (ltv < 0.70) return 60;
    if (ltv < 0.80) return 40;
    if (ltv < 0.90) return 20;
    return 0;
  }

  /**
   * Score debt burden (0-100)
   */
  private scoreDebtBurden(deunggibu: DeunggibuData, propertyValue: number): number {
    // NOTE: Calculate total debt including mortgages AND jeonse/lease rights
    const totalMortgageDebt = deunggibu.totalEstimatedPrincipal;
    const totalJeonseLeaseDebt = deunggibu.jeonseRights.reduce((sum, j) => sum + j.amount, 0);
    const totalDebt = totalMortgageDebt + totalJeonseLeaseDebt;
    const debtRatio = totalDebt / propertyValue;

    // Number of creditors matters - count both mortgages and jeonse rights
    const creditorCount = deunggibu.mortgages.length + deunggibu.jeonseRights.length;
    const creditorPenalty = Math.min(creditorCount * 5, 20); // Max 20 point penalty

    console.log('DEBUG scoreDebtBurden:', {
      totalMortgageDebt,
      totalJeonseLeaseDebt,
      totalDebt,
      propertyValue,
      debtRatio: (debtRatio * 100).toFixed(2) + '%',
      mortgagesCount: deunggibu.mortgages.length,
      jeonseRightsCount: deunggibu.jeonseRights.length,
      creditorCount,
      creditorPenalty
    });

    // Base score from debt ratio
    let score = 100;
    let debtRatioPenalty = 0;

    if (debtRatio > 0.70) {
      debtRatioPenalty = 50;
      score -= 50;
    } else if (debtRatio > 0.60) {
      debtRatioPenalty = 30;
      score -= 30;
    } else if (debtRatio > 0.50) {
      debtRatioPenalty = 15;
      score -= 15;
    } else if (debtRatio > 0.40) {
      debtRatioPenalty = 5;
      score -= 5;
    }

    // Apply creditor penalty
    score -= creditorPenalty;

    console.log('DEBUG scoreDebtBurden result:', {
      debtRatioPenalty,
      creditorPenalty,
      finalScore: score,
      calculation: `100 - ${debtRatioPenalty} - ${creditorPenalty} = ${score}`
    });

    return Math.max(0, score);
  }

  /**
   * Score legal issues (0-100)
   */
  private scoreLegalIssues(deunggibu: DeunggibuData): number {
    let score = 100;

    // Critical issues (immediate disqualification)
    if (deunggibu.hasSeizure) score -= 100; // 압류
    if (deunggibu.hasAuction) score -= 100; // 경매
    if (deunggibu.hasProvisionalSeizure) score -= 50; // 가압류

    // Serious issues
    if (deunggibu.hasSuperficies) score -= 40; // 지상권
    if (deunggibu.hasProvisionalRegistration) score -= 35; // 가등기
    if (deunggibu.hasProvisionalDisposition) score -= 30; // 가처분

    // Moderate issues
    if (deunggibu.ownership.length > 1) score -= 25; // 공동소유 (Shared ownership)
    if (deunggibu.hasEasement) score -= 20; // 지역권
    if (deunggibu.hasAdvanceNotice) score -= 15; // 예고등기
    if (deunggibu.hasUnregisteredLandRights) score -= 10; // 대지권미등기

    // Liens
    score -= deunggibu.liens.length * 25;

    return Math.max(0, score);
  }

  /**
   * Score market conditions (0-100)
   *
   * Uses statistical confidence (0-1) from linear regression R² + data quality:
   * - High confidence (>0.7): Strong statistical trend, amplify impact
   * - Medium confidence (0.4-0.7): Moderate trend, normal impact
   * - Low confidence (<0.4): Weak/noisy data, reduce impact + add uncertainty penalty
   *
   * Confidence thresholds align with R² thresholds from trend calculation:
   * - R² > 0.7 = excellent trend reliability (2% threshold)
   * - R² > 0.4 = good trend reliability (3% threshold)
   * - R² < 0.4 = poor trend reliability (5% threshold)
   */
  private scoreMarketConditions(valuation: PropertyValuation): number {
    let score = 70; // Base score

    // Determine confidence level based on statistical thresholds
    const confidence = valuation.confidence;
    const isHighConfidence = confidence >= 0.7;
    const isMediumConfidence = confidence >= 0.4 && confidence < 0.7;
    const isLowConfidence = confidence < 0.4;

    // Apply trend with confidence-based magnitude
    if (valuation.marketTrend === 'rising') {
      // High confidence in rising market = less risk (bigger bonus)
      if (isHighConfidence) {
        score += 25; // Strong statistical evidence of growth
      } else if (isMediumConfidence) {
        score += 15; // Moderate evidence of growth
      } else {
        score += 8; // Weak evidence, small bonus
      }
    } else if (valuation.marketTrend === 'falling') {
      // High confidence in falling market = more risk (bigger penalty)
      if (isHighConfidence) {
        score -= 35; // Strong statistical evidence of decline
      } else if (isMediumConfidence) {
        score -= 25; // Moderate evidence of decline
      } else {
        score -= 15; // Weak evidence, smaller penalty
      }
    }

    // Low confidence overall is risky (unreliable data = uncertainty risk)
    if (isLowConfidence) {
      score -= 10; // Penalty for data uncertainty
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Score building condition (0-100)
   */
  private scoreBuildingCondition(buildingAge: number): number {
    let score = 0;

    // Base score from building age
    if (buildingAge < 5) score = 100;   // New building
    else if (buildingAge < 10) score = 90;   // Recent
    else if (buildingAge < 15) score = 80;   // Good
    else if (buildingAge < 20) score = 70;   // Acceptable
    else if (buildingAge < 25) score = 60;   // Aging
    else if (buildingAge < 30) score = 50;   // Old
    else score = 40; // Very old

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check small amount priority repayment eligibility
   * 소액보증금 우선변제
   */
  checkSmallAmountPriority(
    jeonseAmount: number,
    address: string
  ): SmallAmountPriorityResult {

    // Determine region from address
    const region = this.determineRegion(address);

    // Get threshold based on region (2024 standards)
    const threshold = this.getSmallAmountThreshold(region);
    const protectedAmount = this.getProtectedAmount(region);

    const isEligible = jeonseAmount <= threshold;

    let explanation = '';
    if (isEligible) {
      explanation = `Your jeonse (₩${(jeonseAmount / 10000).toFixed(0)}만원) qualifies for 소액보증금 우선변제 in ${region}. ` +
        `Up to ₩${(protectedAmount / 10000).toFixed(0)}만원 is protected with priority repayment even if senior mortgages exist. ` +
        `CRITICAL: Must get 확정일자 + 전입신고 + 점유 on SAME DAY.`;
    } else {
      explanation = `Your jeonse (₩${(jeonseAmount / 10000).toFixed(0)}만원) EXCEEDS the 소액보증금 threshold (₩${(threshold / 10000).toFixed(0)}만원) for ${region}. ` +
        `You will NOT receive priority repayment protection. Senior mortgages will be paid first in foreclosure.`;
    }

    return {
      isEligible,
      protectedAmount: isEligible ? Math.min(jeonseAmount, protectedAmount) : 0,
      threshold,
      region,
      explanation
    };
  }

  /**
   * Determine region for small amount priority
   *
   * Based on 주택임대차보호법 시행령 [별표 1] 과밀억제권역
   */
  private determineRegion(address: string): string {
    // 1. 서울특별시
    if (address.includes('서울')) return '서울';

    // 2. 인천광역시(강화군, 옹진군, 서구 대곡동·불로동·마전동·금곡동·오류동·왕길동·당하동·원당동),
    //    인천경제자유구역(경제자유구역에서 해제된 지역을 포함한다) 및 남동 국가산업단지는 제외한다]
    if (address.includes('인천') &&
        !address.includes('강화') &&
        !address.includes('옹진')) {
      return '수도권 과밀억제권역';
    }

    // 3. 의정부시
    if (address.includes('의정부')) return '수도권 과밀억제권역';

    // 4. 구리시
    if (address.includes('구리')) return '수도권 과밀억제권역';

    // 5. 남양주시(호평동, 평내동, 금곡동, 일패동, 이패동, 삼패동, 가운동, 수석동, 지금동 및 도농동만 해당한다)
    if (address.includes('남양주')) {
      // Simplified: include all 남양주 (in production, would check specific 동)
      return '수도권 과밀억제권역';
    }

    // 6. 하남시
    if (address.includes('하남')) return '수도권 과밀억제권역';

    // 7. 고양시
    if (address.includes('고양')) return '수도권 과밀억제권역';

    // 8. 수원시
    if (address.includes('수원')) return '수도권 과밀억제권역';

    // 9. 성남시
    if (address.includes('성남')) return '수도권 과밀억제권역';

    // 10. 안양시
    if (address.includes('안양')) return '수도권 과밀억제권역';

    // 11. 부천시
    if (address.includes('부천')) return '수도권 과밀억제권역';

    // 12. 광명시
    if (address.includes('광명')) return '수도권 과밀억제권역';

    // 13. 과천시
    if (address.includes('과천')) return '수도권 과밀억제권역';

    // 14. 의왕시
    if (address.includes('의왕')) return '수도권 과밀억제권역';

    // 15. 군포시
    if (address.includes('군포')) return '수도권 과밀억제권역';

    // 16. 시흥시[반월특수지역(반월특수지역에서 해제된 지역을 포함한다)은 제외한다]
    if (address.includes('시흥')) return '수도권 과밀억제권역';

    // 세종특별시, 용인시, 화성시, 김포시
    if (address.includes('세종') || address.includes('용인') ||
        address.includes('화성') || address.includes('김포')) {
      return '세종·용인·화성·김포';
    }

    // 광역시, 안산시, 광주시, 파주시, 이천시, 평택시
    if (address.includes('부산') || address.includes('대구') || address.includes('대전') ||
        address.includes('광주광역') || address.includes('울산') ||
        address.includes('안산') || address.includes('광주시') ||
        address.includes('파주') || address.includes('이천') || address.includes('평택')) {
      return '광역시·경기도';
    }

    // 경기도 other cities
    if (address.includes('경기')) return '광역시·경기도';

    // 기타 지역
    return '기타 지역';
  }

  /**
   * Get small amount threshold by region (2025 - 주택임대차보호법 시행령 제10조)
   *
   * Reference: 주택임대차보호법 시행령 [시행 2025. 3. 1.] [대통령령 제35161호, 2024. 12. 31., 일부개정]
   */
  private getSmallAmountThreshold(region: string): number {
    const thresholds: Record<string, number> = {
      '서울': 165000000,            // ₩1억 6,500만원
      '수도권 과밀억제권역': 145000000, // ₩1억 4,500만원
      '세종·용인·화성·김포': 145000000, // ₩1억 4,500만원
      '광역시·경기도': 85000000,     // ₩8,500만원
      '기타 지역': 75000000          // ₩7,500만원
    };

    return thresholds[region] || thresholds['기타 지역'];
  }

  /**
   * Get protected amount by region (2025 - 주택임대차보호법 시행령 제10조)
   *
   * Protected amount = 2/3 of threshold for 2nd priority (after 1st priority mortgage)
   *
   * Reference: 주택임대차보호법 시행령 제10조제2항
   * "임차인의 보증금 중 일정액의 범위는 다음 각 호의 구분에 의한 금액 이하로 한다"
   */
  private getProtectedAmount(region: string): number {
    // Based on 제10조(보증금 중 일정액의 범위 등)
    // 제2항: 법 제8조에 따라 우선변제를 받을 임차인은 보증금이 다음 각 호의 구분에 의한 금액 이하인 임차인으로 한다
    const amounts: Record<string, number> = {
      '서울': 55000000,            // ₩5,500만원 (서울특별시)
      '수도권 과밀억제권역': 48000000, // ₩4,800만원 (수도권정비계획법)
      '세종·용인·화성·김포': 48000000, // ₩4,800만원 (세종특별자치시, 용인시, 화성시, 김포시)
      '광역시·경기도': 28000000,     // ₩2,800만원 (광역시, 안산시, 광주시, 파주시, 이천시, 평택시)
      '기타 지역': 25000000          // ₩2,500만원 (그 밖의 지역)
    };

    return amounts[region] || amounts['기타 지역'];
  }

  /**
   * Identify all risk factors
   */
  private identifyRisks(
    deunggibu: DeunggibuData,
    propertyValue: number,
    proposedJeonse: number,
    ltvRatio: number,
    smallAmountPriority: SmallAmountPriorityResult,
    valuation: PropertyValuation,
    buildingAge: number
  ): RiskFactor[] {

    const risks: RiskFactor[] = [];

    // Critical legal issues
    if (deunggibu.hasSeizure) {
      risks.push({
        type: 'seizure',
        severity: 'CRITICAL',
        title: '압류 (Seizure) Detected',
        description: 'Property has active seizure. This means creditors are blocking sale/transfer. AVOID THIS PROPERTY.',
        impact: -100,
        category: 'legal'
      });
    }

    if (deunggibu.hasAuction) {
      risks.push({
        type: 'auction',
        severity: 'CRITICAL',
        title: '경매개시결정 (Auction Proceedings)',
        description: 'Property is in foreclosure auction. You could lose your entire jeonse deposit. DO NOT PROCEED.',
        impact: -100,
        category: 'legal'
      });
    }

    // High risk: LTV
    if (ltvRatio > 0.80) {
      risks.push({
        type: 'critical_ltv',
        severity: 'CRITICAL',
        title: 'Critical LTV Ratio',
        description: `LTV is ${(ltvRatio * 100).toFixed(1)}%, exceeding the safe limit of 80%. In foreclosure, you likely won't recover your deposit.`,
        impact: -60,
        category: 'debt'
      });
    } else if (ltvRatio > 0.70) {
      risks.push({
        type: 'high_ltv',
        severity: 'HIGH',
        title: 'High LTV Ratio',
        description: `LTV is ${(ltvRatio * 100).toFixed(1)}%, above the recommended 70% threshold. Your deposit has limited protection in foreclosure.`,
        impact: -40,
        category: 'debt'
      });
    } else if (ltvRatio > 0.60) {
      risks.push({
        type: 'elevated_ltv',
        severity: 'MEDIUM',
        title: 'Elevated LTV Ratio',
        description: `LTV is ${(ltvRatio * 100).toFixed(1)}%. While acceptable, it's above the ideal 60% threshold.`,
        impact: -20,
        category: 'debt'
      });
    }

    // Debt burden
    // NOTE: Use totalEstimatedPrincipal for mortgages (actual loan amount)
    // IMPORTANT: Include jeonse rights and lease rights in total debt calculation
    const totalMortgageDebt = deunggibu.totalEstimatedPrincipal;
    const totalJeonseLeaseDebt = deunggibu.jeonseRights.reduce((sum, j) => sum + j.amount, 0);
    const totalDebt = totalMortgageDebt + totalJeonseLeaseDebt;
    const debtRatio = totalDebt / propertyValue;

    if (debtRatio > 0.60) {
      risks.push({
        type: 'high_debt',
        severity: 'HIGH',
        title: 'High Total Debt Burden',
        description: `Existing debt is ₩${(totalDebt / 100000000).toFixed(1)}억 (${(debtRatio * 100).toFixed(1)}% of property value). High risk of foreclosure.`,
        impact: -35,
        category: 'debt'
      });
    }

    // Priority issues
    if (deunggibu.mortgages.length > 0 && !smallAmountPriority.isEligible) {
      const seniorMortgage = deunggibu.mortgages[0];
      risks.push({
        type: 'senior_mortgage',
        severity: 'HIGH',
        title: 'Bank Mortgage Has Priority Over Your Jeonse',
        description: `Senior mortgage of ₩${(seniorMortgage.estimatedPrincipal / 100000000).toFixed(1)}억 exists. In foreclosure, they get paid first. You do NOT qualify for 소액보증금 priority.`,
        impact: -30,
        category: 'priority'
      });
    }

    // Jeonse ratio
    const jeonseRatio = proposedJeonse / propertyValue;
    if (jeonseRatio > 0.70) {
      risks.push({
        type: 'high_jeonse_ratio',
        severity: 'MEDIUM',
        title: 'Jeonse Ratio Above Recommended',
        description: `Your jeonse is ${(jeonseRatio * 100).toFixed(1)}% of property value. Recommended maximum is 70%.`,
        impact: -15,
        category: 'debt'
      });
    }

    // Multiple creditors
    const creditorCount = deunggibu.mortgages.length + deunggibu.jeonseRights.length;
    if (creditorCount >= 3) {
      // Build description based on what types of debts exist
      // Note: jeonseRights includes both 전세권 (jeonse) and 임차권 (lease/tenancy rights)
      const types: string[] = [];

      if (deunggibu.mortgages.length > 0) {
        types.push(`${deunggibu.mortgages.length} mortgage${deunggibu.mortgages.length > 1 ? 's' : ''}`);
      }

      if (deunggibu.jeonseRights.length > 0) {
        // Check if there are different types of rights
        const jeonseCount = deunggibu.jeonseRights.filter(r => r.type === '전세권설정').length;
        const leaseCount = deunggibu.jeonseRights.filter(r => r.type === '임차권등기' || r.type === '임차권설정').length;

        if (jeonseCount > 0 && leaseCount > 0) {
          types.push(`${jeonseCount} jeonse + ${leaseCount} lease`);
        } else if (jeonseCount > 0) {
          types.push(`${jeonseCount} jeonse`);
        } else if (leaseCount > 0) {
          types.push(`${leaseCount} lease`);
        }
      }

      const debtTypes = types.join(' + ');

      risks.push({
        type: 'multiple_creditors',
        severity: 'MEDIUM',
        title: 'Multiple Existing Creditors',
        description: `Property has ${creditorCount} creditors (${debtTypes}). Complex repayment priority in foreclosure.`,
        impact: -15,
        category: 'debt'
      });
    }

    // Provisional seizure
    if (deunggibu.hasProvisionalSeizure) {
      risks.push({
        type: 'provisional_seizure',
        severity: 'HIGH',
        title: '가압류 (Provisional Seizure)',
        description: 'Property has provisional seizure. This may become full seizure. High risk.',
        impact: -50,
        category: 'legal'
      });
    }

    // Provisional registration
    if (deunggibu.hasProvisionalRegistration) {
      risks.push({
        type: 'provisional_registration',
        severity: 'HIGH',
        title: '가등기 (Provisional Registration)',
        description: 'Someone has future claim to this property. Could affect your rights.',
        impact: -35,
        category: 'legal'
      });
    }

    // Shared ownership (공동소유)
    if (deunggibu.ownership.length > 1) {
      const ownerNames = deunggibu.ownership.map(o => `${o.ownerName} (${o.ownershipPercentage}%)`).join(', ');
      risks.push({
        type: 'shared_ownership',
        severity: 'MEDIUM',
        title: 'Shared Ownership (공동소유)',
        description: `Property is co-owned by multiple people: ${ownerNames}. All co-owners must agree to any transaction. If one owner has debt problems, their share could be seized or auctioned, affecting your jeonse rights.`,
        impact: -25,
        category: 'legal'
      });
    }

    // Existing jeonse/lease rights (전세권, 임차권)
    if (deunggibu.jeonseRights.length > 0) {
      const totalAmount = deunggibu.jeonseRights.reduce((sum, j) => sum + j.amount, 0);

      // Separate by type for better labeling
      const jeonseRights = deunggibu.jeonseRights.filter(j => j.type === '전세권');
      const leaseRights = deunggibu.jeonseRights.filter(j => j.type === '임차권설정' || j.type === '임차권등기' || j.type === '임차권등기명령');

      // Build list without tenant names
      const rightsList = deunggibu.jeonseRights.map((j, idx) => {
        let typeLabel = '전세권';
        if (j.type === '임차권설정') typeLabel = '임차권';
        else if (j.type === '임차권등기' || j.type === '임차권등기명령') typeLabel = '임차권등기';

        return `#${idx + 1}: ₩${(j.amount / 100000000).toFixed(1)}억 (${typeLabel})`;
      }).join(', ');

      // Determine title and type based on what types exist
      let title = '';
      let riskType = '';
      if (jeonseRights.length > 0 && leaseRights.length > 0) {
        title = `Existing Jeonse & Lease Rights (${jeonseRights.length} 전세권, ${leaseRights.length} 임차권)`;
        riskType = 'existing_jeonse_lease';
      } else if (leaseRights.length > 0) {
        title = `Existing Lease Rights (${leaseRights.length} 임차권)`;
        riskType = 'existing_lease';
      } else {
        title = `Existing Jeonse Rights (${jeonseRights.length} 전세권)`;
        riskType = 'existing_jeonse';
      }

      risks.push({
        type: riskType,
        severity: deunggibu.jeonseRights.length >= 2 ? 'HIGH' : 'MEDIUM',
        title,
        description: `Property has ${deunggibu.jeonseRights.length} registered tenant claim(s) with total deposits of ₩${(totalAmount / 100000000).toFixed(1)}억. ${rightsList}. These claims have priority and will compete with you for repayment in case of foreclosure.`,
        impact: deunggibu.jeonseRights.length >= 2 ? -30 : -20,
        category: 'legal'
      });
    }

    // Market falling
    if (valuation.marketTrend === 'falling') {
      risks.push({
        type: 'falling_market',
        severity: 'MEDIUM',
        title: 'Declining Market Conditions',
        description: 'Property values in this area are falling. Your deposit may exceed actual value.',
        impact: -20,
        category: 'market'
      });
    }

    // Old building
    if (buildingAge > 25) {
      risks.push({
        type: 'old_building',
        severity: 'MEDIUM',
        title: 'Aging Building',
        description: `Building is ${buildingAge} years old. Higher maintenance costs and lower resale value.`,
        impact: -15,
        category: 'building'
      });
    }

    // Sort by severity
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return risks;
  }

  /**
   * Determine overall risk level
   */
  private determineRiskLevel(
    score: number,
    risks: RiskFactor[]
  ): 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL' {

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
   * Generate verdict
   */
  private generateVerdict(riskLevel: string, score: number): string {
    const verdicts: Record<string, string> = {
      'SAFE': `SAFE TO PROCEED - Score: ${score}/100. This property shows good fundamentals with manageable risk.`,
      'MODERATE': `MODERATE RISK - Score: ${score}/100. Can proceed with mandatory protections and careful monitoring.`,
      'HIGH': `HIGH RISK - Score: ${score}/100. Significant concerns. Only proceed if you can accept substantial risk.`,
      'CRITICAL': `CRITICAL RISK - Score: ${score}/100. DO NOT PROCEED. Too dangerous for jeonse deposit.`
    };

    return verdicts[riskLevel];
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    risks: RiskFactor[],
    smallAmountPriority: SmallAmountPriorityResult,
    deunggibu: DeunggibuData,
    riskLevel: string
  ) {

    const mandatory: string[] = [];
    const recommended: string[] = [];
    const optional: string[] = [];

    // Critical recommendations
    if (riskLevel === 'CRITICAL') {
      mandatory.push('DO NOT SIGN THIS CONTRACT - Risk is too high');
      mandatory.push('Look for a different property with better fundamentals');
      return { mandatory, recommended, optional };
    }

    // Always mandatory
    mandatory.push('Get 확정일자 AND 전입신고 SAME DAY as payment');
    mandatory.push('Move in physically same day (점유 required for 대항력)');
    mandatory.push('Verify all information in 등기부등본 is current (request copy dated within 1 week)');

    // Small amount priority
    if (smallAmountPriority.isEligible) {
      mandatory.push(`You qualify for 소액보증금 (₩${(smallAmountPriority.protectedAmount / 10000).toFixed(0)}만원 protected) - maintain this status!`);
    } else {
      mandatory.push('You do NOT have 소액보증금 protection - senior mortgages get paid first');
    }

    // Insurance
    if (riskLevel === 'HIGH' || riskLevel === 'MODERATE') {
      mandatory.push('Apply for HUG jeonse insurance BEFORE signing');
    } else {
      recommended.push('Consider HUG jeonse insurance for additional protection');
    }

    // High debt scenarios
    if (deunggibu.mortgages.length > 0) {
      recommended.push('Request owner to provide mortgage payment history (최근 납입내역서)');
      recommended.push('Check if mortgages are current (no late payments)');
    }

    // Multiple creditors
    if (deunggibu.mortgages.length + deunggibu.jeonseRights.length >= 2) {
      recommended.push('Get written confirmation of exact repayment priority from 법무사');
    }

    // Market conditions
    recommended.push('Get independent property appraisal (감정평가)');
    recommended.push('Visit property multiple times at different hours');
    recommended.push('Talk to current residents about owner payment history');

    // Optional enhancements
    optional.push('Install CCTV evidence of 점유 (physical occupancy)');
    optional.push('Keep copies of all utility bills in your name');
    optional.push('Document move-in date with photos and witnesses');

    return { mandatory, recommended, optional };
  }

  /**
   * Rank all debts by priority
   * Includes: mortgages (근저당권), existing jeonse rights (전세권), and proposed jeonse
   */
  private rankDebts(deunggibu: DeunggibuData, proposedJeonse: number): MortgageRanking[] {
    const ranking: MortgageRanking[] = [];

    // Add mortgages (temporarily without rank)
    deunggibu.mortgages.forEach((mortgage) => {
      ranking.push({
        rank: 0, // Will be assigned after sorting
        type: '근저당권 (Mortgage)',
        amount: mortgage.estimatedPrincipal,
        registrationDate: mortgage.registrationDate,
        priority: 'subordinate' // Will be recalculated after sorting
      });
    });

    // Add existing jeonse rights (전세권) and lease rights (임차권)
    deunggibu.jeonseRights.forEach((jeonse) => {
      // Determine the display label based on the type
      let typeLabel = '전세권 (Jeonse Right)'; // default

      if (jeonse.type === '임차권등기' || jeonse.type === '임차권등기명령') {
        typeLabel = '임차권등기 (Registered Lease Right)';
      } else if (jeonse.type === '임차권설정') {
        typeLabel = '임차권 (Lease Right)';
      } else if (jeonse.type === '전세권') {
        typeLabel = '전세권 (Jeonse Right)';
      }

      ranking.push({
        rank: 0, // Will be assigned after sorting
        type: typeLabel,
        amount: jeonse.amount,
        registrationDate: jeonse.registrationDate,
        priority: 'subordinate' // Will be recalculated after sorting
      });
    });

    // Sort by registration date (earliest first = highest priority)
    ranking.sort((a, b) => {
      // Handle special case where date might be invalid
      if (!a.registrationDate || !b.registrationDate) return 0;
      return a.registrationDate.localeCompare(b.registrationDate);
    });

    // Assign ranks and priority labels based on sorted order
    ranking.forEach((item, index) => {
      item.rank = index + 1;
      if (index === 0) {
        item.priority = 'senior';
      } else if (index === 1) {
        item.priority = 'junior';
      } else {
        item.priority = 'subordinate';
      }
    });

    // Add proposed jeonse (will be registered after payment, so it's last)
    ranking.push({
      rank: ranking.length + 1,
      type: '전세 (Your Jeonse) - PROPOSED',
      amount: proposedJeonse,
      registrationDate: '미등록 (To be registered)',
      priority: 'subordinate'
    });

    return ranking;
  }
}
 
