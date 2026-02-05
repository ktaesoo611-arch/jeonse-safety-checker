/**
 * GET /api/analysis/report/[id]
 *
 * Retrieves the complete analysis report with risk assessment
 *
 * URL Parameters:
 * - id: string (analysis UUID)
 *
 * Response:
 * - analysisId: string
 * - property: object (property details)
 * - riskAnalysis: object (complete risk analysis)
 * - recommendations: object (mandatory, recommended, optional actions)
 * - summary: object (key metrics and verdict)
 * - generatedAt: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { analysisService } from '@/lib/services/analysis-service';
import { JeonsePriceAnalyzer } from '@/lib/analyzers/jeonse-price-analyzer';

/**
 * Filter out cancelled mortgages from debtRanking
 * Cross-references with deunggibu data to identify cancelled entries
 */
function filterActiveDebtRanking(debtRanking: any[], deunggibuData: any): any[] {
  if (!debtRanking || !Array.isArray(debtRanking)) return [];

  // Get active mortgage dates for comparison
  const activeMortgageDates = new Set<string>();
  const activeJeonseDates = new Set<string>();

  // Use activeMortgages if available (only active ones)
  if (deunggibuData?.activeMortgages) {
    deunggibuData.activeMortgages.forEach((m: any) => {
      if (m.registrationDate) activeMortgageDates.add(m.registrationDate);
    });
  } else if (deunggibuData?.mortgages) {
    // Fallback: filter by status
    deunggibuData.mortgages.forEach((m: any) => {
      if (m.status !== 'cancelled' && m.registrationDate) {
        activeMortgageDates.add(m.registrationDate);
      }
    });
  }

  // Same for jeonse rights
  if (deunggibuData?.activeJeonseRights) {
    deunggibuData.activeJeonseRights.forEach((j: any) => {
      if (j.registrationDate) activeJeonseDates.add(j.registrationDate);
    });
  } else if (deunggibuData?.jeonseRights) {
    deunggibuData.jeonseRights.forEach((j: any) => {
      if (j.status !== 'cancelled' && j.registrationDate) {
        activeJeonseDates.add(j.registrationDate);
      }
    });
  }

  // Filter debtRanking: keep "Your Deposit" and entries matching active dates
  return debtRanking.filter(entry => {
    // Always keep user's proposed deposit
    if (entry.type?.includes('Your Deposit') || entry.type?.includes('PROPOSED')) {
      return true;
    }

    // For mortgages, check if date matches an active mortgage
    if (entry.type?.includes('Mortgage') || entry.type?.includes('근저당권')) {
      return activeMortgageDates.has(entry.registrationDate);
    }

    // For jeonse/lease rights
    if (entry.type?.includes('Jeonse') || entry.type?.includes('Lease') ||
        entry.type?.includes('전세권') || entry.type?.includes('임차권')) {
      return activeJeonseDates.has(entry.registrationDate);
    }

    // Keep other entries by default
    return true;
  }).map((entry, index) => ({
    ...entry,
    rank: index + 1 // Re-number ranks after filtering
  }));
}

/**
 * Filter out risks that reference cancelled debts
 * E.g., "senior_mortgage" risk should be removed if all mortgages are cancelled
 */
function filterActiveRisks(risks: any[], deunggibuData: any): any[] {
  if (!risks || !Array.isArray(risks)) return [];

  // Count active mortgages and jeonse rights
  const activeMortgages = deunggibuData?.activeMortgages ||
                         (deunggibuData?.mortgages || []).filter((m: any) => m.status !== 'cancelled');
  const activeJeonseRights = deunggibuData?.activeJeonseRights ||
                            (deunggibuData?.jeonseRights || []).filter((j: any) => j.status !== 'cancelled');

  return risks.filter(risk => {
    // Remove "senior_mortgage" risk if no active mortgages
    if (risk.type === 'senior_mortgage' && activeMortgages.length === 0) {
      return false;
    }

    // Remove "multiple_creditors" risk if total active creditors < 3
    if (risk.type === 'multiple_creditors') {
      const totalActive = activeMortgages.length + activeJeonseRights.length;
      if (totalActive < 3) {
        return false;
      }
    }

    // Remove "high_debt" risk if no active debt
    if (risk.type === 'high_debt' && activeMortgages.length === 0 && activeJeonseRights.length === 0) {
      return false;
    }

    // Remove "existing_jeonse" or "existing_lease" risks if no active ones
    if ((risk.type === 'existing_jeonse' || risk.type === 'existing_lease' || risk.type === 'existing_jeonse_lease') &&
        activeJeonseRights.length === 0) {
      return false;
    }

    return true;
  });
}

// Helper to regenerate verdict with recalculated score
function generateVerdict(riskLevel: string, score: number): string {
  const verdicts: Record<string, string> = {
    'SAFE': `SAFE TO PROCEED - Score: ${score}/100. This property shows good fundamentals with manageable risk.`,
    'MODERATE': `MODERATE RISK - Score: ${score}/100. Can proceed with mandatory protections and careful monitoring.`,
    'HIGH': `HIGH RISK - Score: ${score}/100. Significant concerns. Only proceed if you can accept substantial risk.`,
    'CRITICAL': `CRITICAL RISK - Score: ${score}/100. DO NOT PROCEED. Too dangerous for your deposit.`,
    'UNKNOWN': 'Safety analysis not available. Upload 등기부등본 for complete analysis.',
  };
  return verdicts[riskLevel] || verdicts['UNKNOWN'];
}

/**
 * Strip unit info and city prefix from deunggibu full address
 * e.g., "서울특별시 마포구 창전동 6-75 제2층 제1호" → "마포구 창전동 6-75"
 */
function cleanDeunggibuAddress(addr: string): string {
  // Strip unit info (제X동/층/호 and everything after) — requires 제 before digit
  // to avoid stripping legal dong names like "창전동" or "상암3동"
  let cleaned = addr.replace(/\s+제\d+[동층].*$/, '').trim();
  // Strip city prefix
  cleaned = cleaned.replace(/^(서울특별시|서울|경기도|경기)\s+/, '').trim();
  return cleaned;
}

/**
 * Extract unit info from deunggibu address, preserving 제 prefix
 * e.g., "서울특별시 마포구 창전동 6-75 제2층 제1호" → "제2층 제1호"
 */
function extractUnitFromAddress(addr: string): string | null {
  const match = addr.match(/(제\d+층\s*제\d+호)/);
  return match ? match[1] : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Create service role client (bypasses RLS)
    const supabase = createServiceRoleClient();

    const resolvedParams = await params;
    const analysisId = resolvedParams.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(analysisId)) {
      return NextResponse.json(
        { error: 'Invalid analysis ID format' },
        { status: 400 }
      );
    }

    // Try wolse_price_full first (for wolse reports)
    const wolseResult = await analysisService.getWolsePriceFull(analysisId);
    console.log(`📊 Report API [${analysisId}]: Path 1 (wolse_price_full) - wolseResult:`, wolseResult ? {
      id: wolseResult.id,
      status: wolseResult.status,
      user_deposit: wolseResult.user_deposit,
      user_monthly_rent: wolseResult.user_monthly_rent,
      contract_count: wolseResult.contract_count,
      recent_transactions_count: wolseResult.recent_transactions?.length || 0,
      has_recent_transactions: !!wolseResult.recent_transactions
    } : 'null');
    if (wolseResult && wolseResult.status === 'completed') {
      // Fetch property info
      const { data: propertyData } = await supabase
        .from('properties')
        .select('*')
        .eq('id', wolseResult.property_id)
        .single();

      // Also fetch safety analysis data from analysis_results (if 등기부등본 was uploaded)
      const { data: safetyData } = await supabase
        .from('analysis_results')
        .select('*, properties(*)')
        .eq('id', analysisId)
        .single();

      // Fetch uploaded documents for parsed data (buildingNumber, unit, etc.)
      const { data: wolseDocuments } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });

      // Look for both 'deunggibu' (APick) and 'deunggibu-codef' (CODEF) documents
      const wolseDeunggibuDoc = wolseDocuments?.find((d: any) => d.document_type === 'deunggibu' || d.document_type === 'deunggibu-codef' || d.document_type === 'deunggibu-apick');
      const wolseParsedData = wolseDeunggibuDoc?.parsed_data || null;

      // Fetch tiered expected rent data directly from wolse_price_data
      // (not included in wolse_price_full view which predates these columns)
      const { data: wolseTieredData } = await supabase
        .from('wolse_price_data')
        .select('tiered_expected_rent, selected_tier_expected_rent, filtered_transactions')
        .eq('analysis_id', analysisId)
        .single();

      // Extract buildingNumber and unit from parsed data
      // CODEF parser stores combined in 'unitNumber' (e.g., "1105동 1층 104호")
      let wolseBuildingNumber = wolseParsedData?.buildingNumber || null;
      let wolseUnit = wolseParsedData?.unit || null;

      // Parse CODEF's combined unitNumber format: "1105동 1층 104호" -> dong and floor+ho
      if (wolseParsedData?.unitNumber && (!wolseBuildingNumber || !wolseUnit)) {
        const unitNumberStr = wolseParsedData.unitNumber;
        const dongMatch = unitNumberStr.match(/(\d+)동/);
        const floorHoMatch = unitNumberStr.match(/제?(\d+)층\s*제?(\d+)호/);
        if (!wolseBuildingNumber && dongMatch) {
          wolseBuildingNumber = `${dongMatch[1]}동`;
        }
        if (!wolseUnit && floorHoMatch) {
          wolseUnit = `${floorHoMatch[1]}층 ${floorHoMatch[2]}호`;
        }
      }

      // Fallback: extract from address if still missing
      if ((!wolseBuildingNumber || !wolseUnit) && wolseParsedData?.address) {
        const buildingMatch = wolseParsedData.address.match(/제(\d+)동/);
        const unitMatch = wolseParsedData.address.match(/제(\d+)층\s*제(\d+)호/);
        if (!wolseBuildingNumber && buildingMatch) {
          wolseBuildingNumber = `${buildingMatch[1]}동`;
        }
        if (!wolseUnit && unitMatch) {
          wolseUnit = `${unitMatch[1]}층 ${unitMatch[2]}호`;
        }
      }

      const riskAnalysis = safetyData?.deunggibu_data || null;
      const hasSafetyData = riskAnalysis && riskAnalysis.overallScore !== undefined;

      // Debug: Log area sources
      console.log(`📐 Area sources [${analysisId}]:`, {
        'riskAnalysis?.deunggibu?.area': riskAnalysis?.deunggibu?.area,
        'riskAnalysis?.area': riskAnalysis?.area,
        'propertyData?.exclusive_area': propertyData?.exclusive_area,
        'using': riskAnalysis?.deunggibu?.area || riskAnalysis?.area || propertyData?.exclusive_area || null
      });

      // Recalculate overall score with new weights (LTV 40%, Legal 30%, Market 15%, Building 15%)
      // This ensures consistency even for old analyses stored with different weights
      const recalculateScore = (data: any) => {
        if (!data) return 0;
        const ltvScore = data.scores?.ltvScore ?? data.ltvScore ?? 0;
        const legalScore = data.scores?.legalScore ?? data.legalScore ?? 0;
        const marketScore = data.scores?.marketScore ?? data.marketScore ?? 0;
        const buildingScore = data.scores?.buildingScore ?? data.buildingScore ?? 0;
        return Math.round(
          ltvScore * 0.40 +
          legalScore * 0.30 +
          marketScore * 0.15 +
          buildingScore * 0.15
        );
      };
      const recalculatedScore = hasSafetyData ? recalculateScore(riskAnalysis) : 0;

      const report = {
        analysisId: wolseResult.id,
        analysisType: 'wolse',
        generatedAt: new Date().toISOString(),
        completedAt: wolseResult.completed_at,
        monthlyRent: wolseResult.user_monthly_rent || safetyData?.monthly_rent || null,

        property: (() => {
          const deunggibuAddr = riskAnalysis?.deunggibu?.fullAddress || riskAnalysis?.deunggibu?.address || wolseParsedData?.fullAddress || wolseParsedData?.address;
          const deunggibuUnit = deunggibuAddr ? extractUnitFromAddress(deunggibuAddr) : null;
          return {
          // Prefer deunggibu address (stripped of unit info + city), then building-name-based, then property table
          address: deunggibuAddr
            ? cleanDeunggibuAddress(deunggibuAddr)
            : propertyData?.building_name
              ? `${propertyData?.city || '서울특별시'} ${propertyData?.district || ''} ${propertyData?.dong || ''} ${propertyData?.building_name}`.trim()
              : propertyData?.address || 'N/A',
          buildingName: propertyData?.building_name || null,
          buildingNumber: propertyData?.building_number || riskAnalysis?.deunggibu?.buildingNumber || riskAnalysis?.buildingNumber || wolseBuildingNumber || null,
          unit: deunggibuUnit || wolseUnit || propertyData?.unit || riskAnalysis?.deunggibu?.unit || riskAnalysis?.unit || null,
          proposedJeonse: wolseResult.user_deposit,
          estimatedValue: riskAnalysis?.valuation?.valueMid || null,
          // Prioritize LLM-extracted area from 등기부등본 over user-entered value
          area: riskAnalysis?.deunggibu?.area || riskAnalysis?.area || wolseParsedData?.area || propertyData?.exclusive_area || null,
          valuation: {
            ...(riskAnalysis?.valuation || {}),
            // Tiered hierarchy for multifamily (연립다세대)
            tierEstimates: riskAnalysis?.valuation?.tierEstimates || null,
            tierGuidance: riskAnalysis?.valuation?.tierGuidance || null,
            tierPercentiles: riskAnalysis?.valuation?.tierPercentiles || null,
          },
        };
        })(),

        // Risk analysis from 등기부등본 (if available)
        riskAnalysis: hasSafetyData ? {
          overallScore: recalculatedScore,
          riskLevel: riskAnalysis.riskLevel,
          verdict: generateVerdict(riskAnalysis.riskLevel, recalculatedScore),
          scores: {
            ltvScore: riskAnalysis.scores?.ltvScore || riskAnalysis.ltvScore || 0,
            debtScore: riskAnalysis.scores?.debtScore || riskAnalysis.debtScore || 0,
            legalScore: riskAnalysis.scores?.legalScore || riskAnalysis.legalScore || 0,
            marketScore: riskAnalysis.scores?.marketScore || riskAnalysis.marketScore || 0,
            buildingScore: riskAnalysis.scores?.buildingScore || riskAnalysis.buildingScore || 0,
          },
          metrics: {
            ltv: riskAnalysis.ltv || (riskAnalysis.ltvRatio ? riskAnalysis.ltvRatio * 100 : 0),
            ltvRange: riskAnalysis.ltvRange || null,
            totalDebt: riskAnalysis.totalDebt || riskAnalysis.breakdown?.totalDebt || 0,
            availableEquity: riskAnalysis.availableEquity || riskAnalysis.breakdown?.availableEquity || 0,
            debtCount: filterActiveDebtRanking(riskAnalysis.debtRanking || [], wolseParsedData || riskAnalysis.deunggibu).length,
          },
          risks: filterActiveRisks(riskAnalysis.risks || [], wolseParsedData || riskAnalysis.deunggibu),
          debtRanking: filterActiveDebtRanking(riskAnalysis.debtRanking || [], wolseParsedData || riskAnalysis.deunggibu),
          smallAmountPriority: riskAnalysis.smallAmountPriority || null,
        } : {
          overallScore: 0,
          riskLevel: 'UNKNOWN',
          verdict: 'Safety analysis not available. Upload 등기부등본 for complete analysis.',
          scores: { ltvScore: 0, debtScore: 0, legalScore: 0, marketScore: 0, buildingScore: 0 },
          metrics: { ltv: 0, totalDebt: 0, availableEquity: 0, debtCount: 0 },
          risks: [],
          debtRanking: [],
          smallAmountPriority: null,
        },

        // Wolse-specific analysis
        wolseAnalysis: {
          userDeposit: wolseResult.user_deposit || safetyData?.proposed_jeonse || 0,
          userMonthlyRent: wolseResult.user_monthly_rent || safetyData?.monthly_rent || 0,
          userRate: wolseResult.user_implied_rate || 0,
          marketRate: wolseResult.market_rate || 0,
          marketRateRange: {
            low: wolseResult.market_rate_low || 0,
            high: wolseResult.market_rate_high || 0,
          },
          legalRate: wolseResult.legal_rate || 4.5,
          expectedRent: wolseResult.expected_rent || 0,
          rentDifference: wolseResult.rent_difference || 0,
          rentDifferencePercent: wolseResult.rent_difference_percent || 0,
          assessment: wolseResult.assessment || 'FAIR',
          assessmentDetails: wolseResult.assessment_details || null,
          contractCount: wolseResult.contract_count || 0,
          confidenceLevel: wolseResult.confidence_level || null,
          savingsPotential: {
            vsMarket: wolseResult.savings_vs_market || 0,
            vsLegal: wolseResult.savings_vs_legal || 0,
          },
          trend: wolseResult.trend_direction ? {
            direction: wolseResult.trend_direction,
            percentage: wolseResult.trend_percentage || 0,
            advice: wolseResult.trend_advice || '',
          } : null,
          recentTransactions: wolseResult.recent_transactions || [],
          negotiationOptions: wolseResult.negotiation_options || [],
          // Tiered expected rent for multifamily
          tieredExpectedRent: wolseTieredData?.tiered_expected_rent || null,
          selectedTierExpectedRent: wolseTieredData?.selected_tier_expected_rent || null,
          filteredTransactions: wolseTieredData?.filtered_transactions || null,
        },

        recommendations: hasSafetyData ? {
          mandatory: riskAnalysis.recommendations?.mandatory || [],
          recommended: riskAnalysis.recommendations?.recommended || [],
          optional: riskAnalysis.recommendations?.optional || [],
        } : {
          mandatory: [],
          recommended: [],
          optional: [],
        },

        summary: hasSafetyData ? {
          safetyScore: recalculatedScore,
          riskLevel: riskAnalysis.riskLevel,
          isSafe: riskAnalysis.riskLevel === 'SAFE',
          isModerate: riskAnalysis.riskLevel === 'MODERATE',
          isHigh: riskAnalysis.riskLevel === 'HIGH',
          isCritical: riskAnalysis.riskLevel === 'CRITICAL',
          verdict: generateVerdict(riskAnalysis.riskLevel, recalculatedScore),
        } : {
          safetyScore: 0,
          riskLevel: 'UNKNOWN',
          isSafe: false,
          isModerate: false,
          isHigh: false,
          isCritical: false,
          verdict: null,
        },
      };

      return NextResponse.json(report, { status: 200 });
    }

    // Try new schema first (jeonse_safety_full view)
    const newSchemaResult = await analysisService.getJeonseSafetyFull(analysisId);
    console.log(`📊 Report API [${analysisId}]: Path 2 (jeonse_safety_full) - newSchemaResult:`, newSchemaResult ? { id: newSchemaResult.id, status: newSchemaResult.status, hasDeunggibuData: !!newSchemaResult.deunggibu_data } : 'null');
    if (newSchemaResult && newSchemaResult.status === 'completed' && newSchemaResult.deunggibu_data) {
      // Fetch documents for additional context
      const { data: documents } = await supabase
        .from('uploaded_documents')
        .select('*')
        .eq('analysis_id', analysisId)
        .order('created_at', { ascending: false });

      // Look for both 'deunggibu' (APick) and 'deunggibu-codef' (CODEF) documents
      const deunggibuDoc = documents?.find((d: any) => d.document_type === 'deunggibu' || d.document_type === 'deunggibu-codef' || d.document_type === 'deunggibu-apick');
      const parsedData = deunggibuDoc?.parsed_data || null;

      // Extract buildingNumber and unit from parsed data
      // CODEF parser stores combined in 'unitNumber' (e.g., "1105동 1층 104호")
      let jeonseBuildingNumber = parsedData?.buildingNumber || null;
      let jeonseUnit = parsedData?.unit || null;

      // Parse CODEF's combined unitNumber format: "1105동 1층 104호" -> dong and floor+ho
      if (parsedData?.unitNumber && (!jeonseBuildingNumber || !jeonseUnit)) {
        const unitNumberStr = parsedData.unitNumber;
        const dongMatch = unitNumberStr.match(/(\d+)동/);
        const floorHoMatch = unitNumberStr.match(/제?(\d+)층\s*제?(\d+)호/);
        if (!jeonseBuildingNumber && dongMatch) {
          jeonseBuildingNumber = `${dongMatch[1]}동`;
        }
        if (!jeonseUnit && floorHoMatch) {
          jeonseUnit = `${floorHoMatch[1]}층 ${floorHoMatch[2]}호`;
        }
      }

      // Fallback: extract from address if still missing
      if ((!jeonseBuildingNumber || !jeonseUnit) && parsedData?.address) {
        const buildingMatch = parsedData.address.match(/제(\d+)동/);
        const unitMatch = parsedData.address.match(/제(\d+)층\s*제(\d+)호/);
        if (!jeonseBuildingNumber && buildingMatch) {
          jeonseBuildingNumber = `${buildingMatch[1]}동`;
        }
        if (!jeonseUnit && unitMatch) {
          jeonseUnit = `${unitMatch[1]}층 ${unitMatch[2]}호`;
        }
      }

      // Build report from new schema
      const riskAnalysis = newSchemaResult.deunggibu_data;

      // Recalculate overall score with new weights (LTV 40%, Legal 30%, Market 15%, Building 15%)
      const recalculateJeonseScore = () => {
        const ltvScore = newSchemaResult.ltv_score || riskAnalysis.scores?.ltvScore || 0;
        const legalScore = newSchemaResult.legal_score || riskAnalysis.scores?.legalScore || 0;
        const marketScore = newSchemaResult.market_score || riskAnalysis.scores?.marketScore || 0;
        const buildingScore = newSchemaResult.building_score || riskAnalysis.scores?.buildingScore || 0;
        return Math.round(
          ltvScore * 0.40 +
          legalScore * 0.30 +
          marketScore * 0.15 +
          buildingScore * 0.15
        );
      };
      const recalculatedJeonseScore = recalculateJeonseScore();

      // Run jeonse price analysis if we have JEONSE transaction data (not sale data)
      let jeonseAnalysis = null;
      let tieredExpectedJeonse = null;
      const allJeonseTransactions = newSchemaResult.valuation_data?.allJeonseTransactions || riskAnalysis.valuation?.allJeonseTransactions;
      if (allJeonseTransactions && allJeonseTransactions.length > 0) {
        const analyzer = new JeonsePriceAnalyzer();
        const userArea = riskAnalysis.deunggibu?.area || null;
        jeonseAnalysis = analyzer.analyze(
          newSchemaResult.proposed_jeonse,
          allJeonseTransactions,
          userArea
        );

        // Run tiered analysis for dong-tiered valuations
        const valuationMethod = newSchemaResult.valuation_data?.valuationMethod || riskAnalysis.valuation?.valuationMethod;
        if (valuationMethod === 'dong-tiered' && allJeonseTransactions.length >= 4) {
          const tieredResult = analyzer.analyzeTiered(allJeonseTransactions, userArea);
          if (tieredResult) {
            tieredExpectedJeonse = tieredResult.tieredExpectedJeonse;
            console.log(`📊 Tiered jeonse analysis (new schema): ${tieredExpectedJeonse.length} tiers computed`);
          }
        }

        // Even if analysis returns null (insufficient data for regression),
        // preserve raw transaction data for the transaction table
        if (!jeonseAnalysis && allJeonseTransactions.length > 0) {
          console.log('📊 Jeonse analysis (new schema): Insufficient data for regression, but preserving raw transactions');
          const now = new Date();
          jeonseAnalysis = {
            proposedJeonse: newSchemaResult.proposed_jeonse,
            expectedJeonse: null,
            jeonseDifference: null,
            jeonseDifferencePercent: null,
            assessment: null,
            assessmentDetails: null,
            potentialSavings: 0,
            trend: null,
            transactionData: allJeonseTransactions.map((t: any) => {
              const txDate = new Date(t.year, t.month - 1, t.day);
              const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
              return {
                daysAgo,
                price: t.transactionAmount / 100000000, // Convert to 억
                date: `${t.year}.${String(t.month).padStart(2, '0')}.${String(t.day).padStart(2, '0')}`,
                floor: t.floor,
                exclusiveArea: t.exclusiveArea
              };
            }),
            regressionLine: null,
            contractCount: allJeonseTransactions.length,
          };
        } else {
          console.log('📊 Jeonse analysis (new schema): Using jeonse transactions');
        }
      } else {
        console.log('📊 Jeonse analysis (new schema): No jeonse transactions available');
      }

      const report = {
        analysisId: newSchemaResult.id,
        generatedAt: new Date().toISOString(),
        completedAt: newSchemaResult.completed_at,

        property: (() => {
          const deunggibuAddr = riskAnalysis.deunggibu?.fullAddress || riskAnalysis.deunggibu?.address || parsedData?.fullAddress || parsedData?.address;
          const deunggibuUnit = deunggibuAddr ? extractUnitFromAddress(deunggibuAddr) : null;
          return {
          address: deunggibuAddr
            ? cleanDeunggibuAddress(deunggibuAddr)
            : newSchemaResult.building_name
              ? `${newSchemaResult.city || '서울특별시'} ${newSchemaResult.district || ''} ${newSchemaResult.dong || ''} ${newSchemaResult.building_name}`.trim()
              : newSchemaResult.address || 'N/A',
          buildingName: newSchemaResult.building_name || null,
          buildingNumber: newSchemaResult.building_number || riskAnalysis.deunggibu?.buildingNumber || riskAnalysis.buildingNumber || jeonseBuildingNumber || null,
          unit: deunggibuUnit || jeonseUnit || newSchemaResult.unit || riskAnalysis.deunggibu?.unit || riskAnalysis.unit || null,
          proposedJeonse: newSchemaResult.proposed_jeonse,
          estimatedValue: newSchemaResult.valuation_data?.valueMid || riskAnalysis.valuation?.valueMid || null,
          area: riskAnalysis.deunggibu?.area || riskAnalysis.area || null,
          buildingAge: parsedData?.property?.buildingAge || null,
          propertyType: parsedData?.property?.type || null,
          valuation: {
            valueLow: newSchemaResult.valuation_data?.valueLow || riskAnalysis.valuation?.valueLow || null,
            valueMid: newSchemaResult.valuation_data?.valueMid || riskAnalysis.valuation?.valueMid || null,
            valueHigh: newSchemaResult.valuation_data?.valueHigh || riskAnalysis.valuation?.valueHigh || null,
            confidence: newSchemaResult.valuation_data?.confidence || riskAnalysis.valuation?.confidence || null,
            marketTrend: newSchemaResult.valuation_data?.marketTrend || riskAnalysis.valuation?.marketTrend || null,
            tierEstimates: newSchemaResult.valuation_data?.tierEstimates || riskAnalysis.valuation?.tierEstimates || null,
            tierGuidance: newSchemaResult.valuation_data?.tierGuidance || riskAnalysis.valuation?.tierGuidance || null,
            tierPercentiles: newSchemaResult.valuation_data?.tierPercentiles || riskAnalysis.valuation?.tierPercentiles || null,
            valuationMethod: newSchemaResult.valuation_data?.valuationMethod || riskAnalysis.valuation?.valuationMethod || null,
          },
        };
        })(),

        owner: { name: null, phone: null },

        riskAnalysis: {
          overallScore: recalculatedJeonseScore,
          riskLevel: riskAnalysis.riskLevel || newSchemaResult.risk_level,
          verdict: generateVerdict(riskAnalysis.riskLevel || newSchemaResult.risk_level, recalculatedJeonseScore),
          scores: {
            ltvScore: newSchemaResult.ltv_score || riskAnalysis.scores?.ltvScore || 0,
            debtScore: newSchemaResult.debt_score || riskAnalysis.scores?.debtScore || 0,
            legalScore: newSchemaResult.legal_score || riskAnalysis.scores?.legalScore || 0,
            marketScore: newSchemaResult.market_score || riskAnalysis.scores?.marketScore || 0,
            buildingScore: newSchemaResult.building_score || riskAnalysis.scores?.buildingScore || 0,
          },
          metrics: {
            ltv: newSchemaResult.ltv_ratio || riskAnalysis.ltv || 0,
            ltvRange: riskAnalysis.ltvRange || null, // LTV range across tiers for display
            totalDebt: riskAnalysis.totalDebt || riskAnalysis.breakdown?.totalDebt || 0,
            availableEquity: riskAnalysis.availableEquity || riskAnalysis.breakdown?.availableEquity || 0,
            debtCount: filterActiveDebtRanking(riskAnalysis.debtRanking || [], parsedData || riskAnalysis.deunggibu).length,
          },
          risks: filterActiveRisks(newSchemaResult.risks || riskAnalysis.risks || [], parsedData || riskAnalysis.deunggibu),
          debtRanking: filterActiveDebtRanking(riskAnalysis.debtRanking || [], parsedData || riskAnalysis.deunggibu),
          smallAmountPriority: riskAnalysis.smallAmountPriority || null,
        },

        recommendations: {
          mandatory: newSchemaResult.recommendations?.mandatory || riskAnalysis.recommendations?.mandatory || [],
          recommended: newSchemaResult.recommendations?.recommended || riskAnalysis.recommendations?.recommended || [],
          optional: newSchemaResult.recommendations?.optional || riskAnalysis.recommendations?.optional || [],
        },

        summary: {
          safetyScore: recalculatedJeonseScore,
          riskLevel: riskAnalysis.riskLevel || newSchemaResult.risk_level,
          isSafe: (riskAnalysis.riskLevel || newSchemaResult.risk_level) === 'SAFE',
          isModerate: (riskAnalysis.riskLevel || newSchemaResult.risk_level) === 'MODERATE',
          isHigh: (riskAnalysis.riskLevel || newSchemaResult.risk_level) === 'HIGH',
          isCritical: (riskAnalysis.riskLevel || newSchemaResult.risk_level) === 'CRITICAL',
          verdict: generateVerdict(riskAnalysis.riskLevel || newSchemaResult.risk_level, recalculatedJeonseScore),
          criticalIssues: filterActiveRisks(newSchemaResult.risks || riskAnalysis.risks || [], parsedData || riskAnalysis.deunggibu).filter((r: any) => r.severity === 'CRITICAL').length,
          highIssues: filterActiveRisks(newSchemaResult.risks || riskAnalysis.risks || [], parsedData || riskAnalysis.deunggibu).filter((r: any) => r.severity === 'HIGH').length,
          moderateIssues: filterActiveRisks(newSchemaResult.risks || riskAnalysis.risks || [], parsedData || riskAnalysis.deunggibu).filter((r: any) => r.severity === 'MODERATE').length,
        },

        legalInfo: {
          law: '주택임대차보호법 시행령',
          effectiveDate: '2025. 3. 1.',
          decree: '대통령령 제35161호, 2024. 12. 31., 일부개정',
        },

        // Jeonse price analysis (if transaction data available)
        jeonseAnalysis: jeonseAnalysis ? {
          proposedJeonse: jeonseAnalysis.proposedJeonse,
          expectedJeonse: jeonseAnalysis.expectedJeonse,
          jeonseDifference: jeonseAnalysis.jeonseDifference,
          jeonseDifferencePercent: jeonseAnalysis.jeonseDifferencePercent,
          assessment: jeonseAnalysis.assessment,
          assessmentDetails: jeonseAnalysis.assessmentDetails,
          potentialSavings: jeonseAnalysis.potentialSavings,
          trend: jeonseAnalysis.trend,
          transactionData: jeonseAnalysis.transactionData,
          regressionLine: jeonseAnalysis.regressionLine,
          contractCount: jeonseAnalysis.contractCount,
          tieredExpectedJeonse: tieredExpectedJeonse || null,
        } : null,

        documents: documents?.map((d: any) => ({
          id: d.id,
          type: d.document_type,
          fileName: d.file_name,
          uploadedAt: d.created_at,
          parsed: !!d.parsed_data,
        })) || [],
      };

      return NextResponse.json(report, { status: 200 });
    }

    // Fallback to old schema (analysis_results)
    console.log(`📊 Report API [${analysisId}]: Path 3 (fallback) - entering fallback`);
    const { data: initialAnalysis, error: analysisError } = await supabase
      .from('analysis_results')
      .select(`
        *,
        properties (*)
      `)
      .eq('id', analysisId)
      .single();

    let analysis = initialAnalysis;
    console.log(`📊 Report API [${analysisId}]: Path 3 - analysis_results:`, analysis ? { id: analysis.id, status: analysis.status, monthly_rent: analysis.monthly_rent, proposed_jeonse: analysis.proposed_jeonse } : 'null');

    if (analysisError || !analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      );
    }

    // Check if analysis is completed
    if (analysis.status !== 'completed') {
      return NextResponse.json(
        {
          error: 'Analysis not completed yet',
          status: analysis.status,
          message: 'Please wait for analysis to complete before retrieving report',
        },
        { status: 400 }
      );
    }

    // Check if risk analysis exists - retry if data not yet available (handles DB replication delay)
    if (!analysis.deunggibu_data) {
      console.warn(`Report API: deunggibu_data not yet available for ${analysisId}, waiting 2s for DB replication...`);

      // Wait for database replication/commit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Retry query
      const { data: retryAnalysis, error: retryError } = await supabase
        .from('analysis_results')
        .select(`
          *,
          properties (*)
        `)
        .eq('id', analysisId)
        .single();

      if (retryError || !retryAnalysis || !retryAnalysis.deunggibu_data) {
        console.error('Report API Error: Missing deunggibu_data after retry for analysis', analysisId);
        console.error('Analysis object keys:', retryAnalysis ? Object.keys(retryAnalysis) : 'N/A');
        console.error('Analysis status:', retryAnalysis?.status);
        console.error('Analysis safety_score:', retryAnalysis?.safety_score);
        console.error('Analysis risk_level:', retryAnalysis?.risk_level);
        return NextResponse.json(
          { error: 'Risk analysis data not available' },
          { status: 500 }
        );
      }

      // Use the retried data
      analysis = retryAnalysis;
      console.log(`✅ Report API: deunggibu_data found after retry for ${analysisId}`);
    }

    // Fetch documents for additional context
    const { data: documents, error: documentsError } = await supabase
      .from('uploaded_documents')
      .select('*')
      .eq('analysis_id', analysisId)
      .order('created_at', { ascending: false });

    if (documentsError) {
      console.error('Error fetching documents:', documentsError);
    }

    // Fetch wolse price data if available (for wolse reports)
    const { data: wolsePriceData, error: wolseError } = await supabase
      .from('wolse_price_data')
      .select('*')
      .eq('analysis_id', analysisId)
      .single();
    console.log(`📊 Report API [${analysisId}]: Path 3 - wolse_price_data:`, wolsePriceData ? { user_deposit: wolsePriceData.user_deposit, user_monthly_rent: wolsePriceData.user_monthly_rent, expected_rent: wolsePriceData.expected_rent } : 'null', 'error:', wolseError?.message || 'none');

    // Find parsed 등기부등본 data
    // Look for both 'deunggibu' (APick) and 'deunggibu-codef' (CODEF) documents
    const deunggibuDoc = documents?.find((d: any) => d.document_type === 'deunggibu' || d.document_type === 'deunggibu-codef' || d.document_type === 'deunggibu-apick');
    const parsedData = deunggibuDoc?.parsed_data || null;

    // Extract buildingNumber and unit from parsed data (fallback path)
    // CODEF parser stores combined in 'unitNumber' (e.g., "1105동 1층 104호")
    let fallbackBuildingNumber = parsedData?.buildingNumber || null;
    let fallbackUnit = parsedData?.unit || null;

    // Parse CODEF's combined unitNumber format: "1105동 1층 104호" -> dong and floor+ho
    if (parsedData?.unitNumber && (!fallbackBuildingNumber || !fallbackUnit)) {
      const unitNumberStr = parsedData.unitNumber;
      const dongMatch = unitNumberStr.match(/(\d+)동/);
      const floorHoMatch = unitNumberStr.match(/제?(\d+)층\s*제?(\d+)호/);
      if (!fallbackBuildingNumber && dongMatch) {
        fallbackBuildingNumber = `${dongMatch[1]}동`;
      }
      if (!fallbackUnit && floorHoMatch) {
        fallbackUnit = `${floorHoMatch[1]}층 ${floorHoMatch[2]}호`;
      }
    }

    // Fallback: extract from address if still missing
    if ((!fallbackBuildingNumber || !fallbackUnit) && parsedData?.address) {
      const buildingMatch = parsedData.address.match(/제(\d+)동/);
      const unitMatch = parsedData.address.match(/제(\d+)층\s*제(\d+)호/);
      if (!fallbackBuildingNumber && buildingMatch) {
        fallbackBuildingNumber = `${buildingMatch[1]}동`;
      }
      if (!fallbackUnit && unitMatch) {
        fallbackUnit = `${unitMatch[1]}층 ${unitMatch[2]}호`;
      }
    }

    // Build comprehensive report
    const riskAnalysis = analysis.deunggibu_data;

    // Recalculate overall score with new weights (LTV 40%, Legal 30%, Market 15%, Building 15%)
    const recalculateFallbackScore = () => {
      const ltvScore = riskAnalysis.scores?.ltvScore || riskAnalysis.ltvScore || 0;
      const legalScore = riskAnalysis.scores?.legalScore || riskAnalysis.legalScore || 0;
      const marketScore = riskAnalysis.scores?.marketScore || riskAnalysis.marketScore || 0;
      const buildingScore = riskAnalysis.scores?.buildingScore || riskAnalysis.buildingScore || 0;
      return Math.round(
        ltvScore * 0.40 +
        legalScore * 0.30 +
        marketScore * 0.15 +
        buildingScore * 0.15
      );
    };
    const recalculatedFallbackScore = recalculateFallbackScore();

    // Run jeonse price analysis if we have JEONSE transaction data (not sale data)
    let jeonseAnalysisFallback = null;
    let tieredExpectedJeonseFallback = null;
    const allJeonseTransactionsFallback = riskAnalysis.valuation?.allJeonseTransactions;
    if (allJeonseTransactionsFallback && allJeonseTransactionsFallback.length > 0) {
      const analyzer = new JeonsePriceAnalyzer();
      const userArea = riskAnalysis.deunggibu?.area || null;
      jeonseAnalysisFallback = analyzer.analyze(
        analysis.proposed_jeonse,
        allJeonseTransactionsFallback,
        userArea
      );

      // Run tiered analysis for dong-tiered valuations
      const valuationMethodFallback = riskAnalysis.valuation?.valuationMethod;
      if (valuationMethodFallback === 'dong-tiered' && allJeonseTransactionsFallback.length >= 4) {
        const tieredResult = analyzer.analyzeTiered(allJeonseTransactionsFallback, userArea);
        if (tieredResult) {
          tieredExpectedJeonseFallback = tieredResult.tieredExpectedJeonse;
          console.log(`📊 Tiered jeonse analysis (fallback): ${tieredExpectedJeonseFallback.length} tiers computed`);
        }
      }

      // Even if analysis returns null (insufficient data for regression),
      // preserve raw transaction data for the transaction table
      if (!jeonseAnalysisFallback && allJeonseTransactionsFallback.length > 0) {
        console.log('📊 Jeonse analysis (fallback): Insufficient data for regression, but preserving raw transactions');
        const now = new Date();
        jeonseAnalysisFallback = {
          proposedJeonse: analysis.proposed_jeonse,
          expectedJeonse: null,
          jeonseDifference: null,
          jeonseDifferencePercent: null,
          assessment: null,
          assessmentDetails: null,
          potentialSavings: 0,
          trend: null,
          transactionData: allJeonseTransactionsFallback.map((t: any) => {
            const txDate = new Date(t.year, t.month - 1, t.day);
            const daysAgo = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
            return {
              daysAgo,
              price: t.transactionAmount / 100000000, // Convert to 억
              date: `${t.year}.${String(t.month).padStart(2, '0')}.${String(t.day).padStart(2, '0')}`,
              floor: t.floor,
              exclusiveArea: t.exclusiveArea
            };
          }),
          regressionLine: null,
          contractCount: allJeonseTransactionsFallback.length,
        };
      } else {
        console.log('📊 Jeonse analysis (fallback): Using jeonse transactions -', jeonseAnalysisFallback ? 'completed' : 'no result');
      }
    } else {
      console.log('📊 Jeonse analysis (fallback): No jeonse transactions available');
    }

    // Debug logging
    console.log('Report API Debug:', {
      analysisId,
      hasProperties: !!analysis.properties,
      propertiesType: Array.isArray(analysis.properties) ? 'array' : typeof analysis.properties,
      propertiesValue: analysis.properties
    });

    const report = {
      analysisId: analysis.id,
      generatedAt: new Date().toISOString(),
      completedAt: analysis.completed_at,
      monthlyRent: analysis.monthly_rent || wolsePriceData?.user_monthly_rent || null,

      // Property Information
      property: (() => {
        const prop = Array.isArray(analysis.properties) ? analysis.properties[0] : analysis.properties;
        const deunggibuAddr = riskAnalysis.deunggibu?.fullAddress || riskAnalysis.deunggibu?.address || parsedData?.fullAddress || parsedData?.address;
        const deunggibuUnit = deunggibuAddr ? extractUnitFromAddress(deunggibuAddr) : null;
        return {
          address: deunggibuAddr
            ? cleanDeunggibuAddress(deunggibuAddr)
            : prop?.building_name
              ? `${prop?.city || '서울특별시'} ${prop?.district || ''} ${prop?.dong || ''} ${prop?.building_name}`.trim()
              : prop?.address || 'N/A',
          buildingName: prop?.building_name || null,
          buildingNumber: prop?.building_number || riskAnalysis.deunggibu?.buildingNumber || riskAnalysis.buildingNumber || fallbackBuildingNumber || null,
          unit: deunggibuUnit || fallbackUnit || prop?.unit || riskAnalysis.deunggibu?.unit || riskAnalysis.unit || null,
          proposedJeonse: analysis.proposed_jeonse,
          estimatedValue: riskAnalysis.valuation?.valueMid || null,
          // Prioritize LLM-extracted area from 등기부등본
          area: riskAnalysis.deunggibu?.area || riskAnalysis.area || parsedData?.area || null,
          buildingAge: parsedData?.property?.buildingAge || null,
          propertyType: parsedData?.property?.type || null,
          valuation: {
            valueLow: riskAnalysis.valuation?.valueLow || null,
            valueMid: riskAnalysis.valuation?.valueMid || null,
            valueHigh: riskAnalysis.valuation?.valueHigh || null,
            confidence: riskAnalysis.valuation?.confidence || null,
            marketTrend: riskAnalysis.valuation?.marketTrend || null,
            // Tiered hierarchy for multifamily (연립다세대)
            tierEstimates: riskAnalysis.valuation?.tierEstimates || null,
            tierGuidance: riskAnalysis.valuation?.tierGuidance || null,
            tierPercentiles: riskAnalysis.valuation?.tierPercentiles || null,
            valuationMethod: riskAnalysis.valuation?.valuationMethod || null,
          },
        };
      })(),

      // Owner Information (if provided)
      owner: {
        name: analysis.owner_name,
        phone: analysis.owner_phone,
      },

      // Risk Analysis Results
      riskAnalysis: {
        overallScore: recalculatedFallbackScore,
        riskLevel: riskAnalysis.riskLevel,
        verdict: generateVerdict(riskAnalysis.riskLevel, recalculatedFallbackScore),

        // Component Scores
        scores: {
          ltvScore: riskAnalysis.scores?.ltvScore || riskAnalysis.ltvScore || 0,
          debtScore: riskAnalysis.scores?.debtScore || riskAnalysis.debtScore || 0,
          legalScore: riskAnalysis.scores?.legalScore || riskAnalysis.legalScore || 0,
          marketScore: riskAnalysis.scores?.marketScore || riskAnalysis.marketScore || 0,
          buildingScore: riskAnalysis.scores?.buildingScore || riskAnalysis.buildingScore || 0,
        },

        // Key Metrics
        metrics: {
          ltv: riskAnalysis.ltv || (riskAnalysis.ltvRatio ? riskAnalysis.ltvRatio * 100 : 0),
          ltvRange: riskAnalysis.ltvRange || null, // LTV range across tiers for display
          totalDebt: riskAnalysis.totalDebt || riskAnalysis.breakdown?.totalDebt || 0,
          availableEquity: riskAnalysis.availableEquity || riskAnalysis.breakdown?.availableEquity || 0,
          debtCount: filterActiveDebtRanking(riskAnalysis.debtRanking || [], parsedData || riskAnalysis.deunggibu).length,
        },

        // Risk Factors (filtered to remove risks for cancelled debts)
        risks: filterActiveRisks(riskAnalysis.risks || [], parsedData || riskAnalysis.deunggibu),

        // Debt Ranking (filtered to remove cancelled mortgages)
        debtRanking: filterActiveDebtRanking(riskAnalysis.debtRanking || [], parsedData || riskAnalysis.deunggibu),

        // 소액보증금 Priority
        smallAmountPriority: riskAnalysis.smallAmountPriority || null,
      },

      // Recommendations
      recommendations: {
        mandatory: riskAnalysis.recommendations?.mandatory || [],
        recommended: riskAnalysis.recommendations?.recommended || [],
        optional: riskAnalysis.recommendations?.optional || [],
      },

      // Summary for Quick View
      summary: {
        safetyScore: recalculatedFallbackScore,
        riskLevel: riskAnalysis.riskLevel,
        isSafe: riskAnalysis.riskLevel === 'SAFE',
        isModerate: riskAnalysis.riskLevel === 'MODERATE',
        isHigh: riskAnalysis.riskLevel === 'HIGH',
        isCritical: riskAnalysis.riskLevel === 'CRITICAL',
        verdict: generateVerdict(riskAnalysis.riskLevel, recalculatedFallbackScore),
        criticalIssues: filterActiveRisks(riskAnalysis.risks || [], parsedData || riskAnalysis.deunggibu).filter((r: any) => r.severity === 'CRITICAL').length,
        highIssues: filterActiveRisks(riskAnalysis.risks || [], parsedData || riskAnalysis.deunggibu).filter((r: any) => r.severity === 'HIGH').length,
        moderateIssues: filterActiveRisks(riskAnalysis.risks || [], parsedData || riskAnalysis.deunggibu).filter((r: any) => r.severity === 'MODERATE').length,
      },

      // Legal Compliance Info
      legalInfo: {
        law: '주택임대차보호법 시행령',
        effectiveDate: '2025. 3. 1.',
        decree: '대통령령 제35161호, 2024. 12. 31., 일부개정',
      },

      // Jeonse price analysis (if transaction data available)
      jeonseAnalysis: jeonseAnalysisFallback ? {
        proposedJeonse: jeonseAnalysisFallback.proposedJeonse,
        expectedJeonse: jeonseAnalysisFallback.expectedJeonse,
        jeonseDifference: jeonseAnalysisFallback.jeonseDifference,
        jeonseDifferencePercent: jeonseAnalysisFallback.jeonseDifferencePercent,
        assessment: jeonseAnalysisFallback.assessment,
        assessmentDetails: jeonseAnalysisFallback.assessmentDetails,
        potentialSavings: jeonseAnalysisFallback.potentialSavings,
        trend: jeonseAnalysisFallback.trend,
        transactionData: jeonseAnalysisFallback.transactionData,
        regressionLine: jeonseAnalysisFallback.regressionLine,
        contractCount: jeonseAnalysisFallback.contractCount,
        tieredExpectedJeonse: tieredExpectedJeonseFallback || null,
      } : null,

      // Wolse analysis (if wolse price data exists)
      wolseAnalysis: wolsePriceData ? {
        userDeposit: wolsePriceData.user_deposit || analysis.proposed_jeonse || 0,
        userMonthlyRent: wolsePriceData.user_monthly_rent || analysis.monthly_rent || 0,
        userRate: wolsePriceData.user_implied_rate || 0,
        marketRate: wolsePriceData.market_rate || 0,
        marketRateRange: {
          low: wolsePriceData.market_rate_low || 0,
          high: wolsePriceData.market_rate_high || 0,
        },
        legalRate: wolsePriceData.legal_rate || 4.5,
        expectedRent: wolsePriceData.expected_rent || 0,
        rentDifference: wolsePriceData.rent_difference || 0,
        rentDifferencePercent: wolsePriceData.rent_difference_percent || 0,
        assessment: wolsePriceData.assessment || 'FAIR',
        assessmentDetails: wolsePriceData.assessment_details || null,
        contractCount: wolsePriceData.contract_count || 0,
        confidenceLevel: wolsePriceData.confidence_level || null,
        savingsPotential: {
          vsMarket: wolsePriceData.savings_vs_market || 0,
          vsLegal: wolsePriceData.savings_vs_legal || 0,
        },
        trend: wolsePriceData.trend_direction ? {
          direction: wolsePriceData.trend_direction,
          percentage: wolsePriceData.trend_percentage || 0,
          advice: wolsePriceData.trend_advice || '',
        } : null,
        recentTransactions: wolsePriceData.recent_transactions || [],
        negotiationOptions: wolsePriceData.negotiation_options || [],
        // Tiered expected rent for multifamily
        tieredExpectedRent: wolsePriceData.tiered_expected_rent || null,
        selectedTierExpectedRent: wolsePriceData.selected_tier_expected_rent || null,
        filteredTransactions: wolsePriceData.filtered_transactions || null,
      } : null,

      // Documents
      documents: documents?.map((d: any) => ({
        id: d.id,
        type: d.document_type,
        fileName: d.file_name,
        uploadedAt: d.created_at,
        parsed: !!d.parsed_data,
      })) || [],
    };

    // Return success response
    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
