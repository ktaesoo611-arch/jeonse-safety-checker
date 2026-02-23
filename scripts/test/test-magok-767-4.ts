/**
 * Test 5-tier valuation for 마곡동 767-4, 522호
 *
 * Verifies that the new Top tier (P90+) properly captures high-value properties
 * that were previously undervalued by the broad Premium tier (P75+).
 *
 * Property area: 46.4㎡ (confirmed from 등기부등본)
 * Known reference: ₩85,300만 transaction on 2026-01-05 (same area, 6F)
 *
 * Run with: npx tsx scripts/test/test-magok-767-4.ts
 */

import 'dotenv/config';
import { PropertyValuationEngine } from '../../lib/analyzers/property-valuation';
import { JeonsePriceAnalyzer } from '../../lib/analyzers/jeonse-price-analyzer';
import { PropertyDetails, BuildingType } from '../../lib/types';
import { buildingRegistryAPI } from '../../lib/apis/building-registry';
import { parseKoreanAddress } from '../../lib/utils/address-parser';

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('❌ MOLIT_API_KEY not set');
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('🧪 TEST: 5-TIER VALUATION FOR 마곡동 767-4, 522호');
  console.log('═'.repeat(80));

  // Step 1: Detect building type via Building Registry API
  console.log('\n📋 Step 1: Detecting building type...');
  let detectedBuildingType: BuildingType = 'apartment';
  try {
    const address = '서울특별시 강서구 마곡동 767-4';
    const components = parseKoreanAddress(address);
    if (components) {
      console.log('   Address components:', components);
      detectedBuildingType = await buildingRegistryAPI.detectBuildingType(
        components.sigunguCd,
        components.bjdongCd,
        components.bun,
        components.ji
      );
      console.log(`   ✅ Detected building type: ${detectedBuildingType}`);
    }
  } catch (error) {
    console.error('   ⚠️ Building type detection failed, defaulting to apartment:', error);
  }

  // Step 2: Set up property details
  // Confirmed area: 46.4㎡ (from 등기부등본 document)
  const testArea = 46.4;

  {
    console.log('\n' + '─'.repeat(80));
    console.log(`🏠 Testing with area: ${testArea}㎡, type: ${detectedBuildingType}`);
    console.log('─'.repeat(80));

    const property: PropertyDetails = {
      address: '서울특별시 강서구 마곡동 767-4',
      city: '서울특별시',
      district: '강서구',
      dong: '마곡동',
      buildingName: '', // Will test dong-level
      buildingNumber: '767-4',
      floor: 5,
      unit: '522호',
      exclusiveArea: testArea,
    };

    const engine = new PropertyValuationEngine(apiKey);

    try {
      // Use the detected building type, but if apartment with no building name,
      // it would fall back to multifamily in the parse route.
      // Let's test the path the production system would take.
      let effectiveType = detectedBuildingType;
      if (effectiveType === 'apartment' && !property.buildingName) {
        console.log('   ⚠️ Apartment with no building name → falling back to multifamily (dong-level)');
        effectiveType = 'multifamily';
      }

      const result = await engine.calculatePropertyValue(property, effectiveType);

      console.log('\n' + '═'.repeat(80));
      console.log(`📊 VALUATION RESULT (area=${testArea}㎡, type=${effectiveType})`);
      console.log('═'.repeat(80));

      console.log(`\n   Est.Value (valueMid): ₩${(result.valueMid / 100000000).toFixed(2)}억`);
      console.log(`   Range: ₩${(result.valueLow / 100000000).toFixed(2)}억 ~ ₩${(result.valueHigh / 100000000).toFixed(2)}억`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Trend: ${result.trend} (${result.trendPercentage.toFixed(1)}%)`);
      console.log(`   Valuation Method: ${result.valuationMethod || 'N/A'}`);

      // Show tier estimates
      if (result.tierEstimates && result.tierEstimates.length > 0) {
        console.log('\n   📊 Tier Estimates:');
        for (const tier of result.tierEstimates) {
          const marker = tier.tier === 'top' ? ' ← NEW' : '';
          console.log(`   ${tier.label}: ₩${(tier.value / 100000000).toFixed(2)}억 (${(tier.unitPrice / 10000).toFixed(0)}만/㎡, ${tier.transactionCount} txns)${marker}`);
        }

        // Show percentile thresholds
        if (result.tierPercentiles) {
          console.log(`\n   Percentile Thresholds:`);
          console.log(`   P25=${(result.tierPercentiles.p25/10000).toFixed(0)}만/㎡, P50=${(result.tierPercentiles.p50/10000).toFixed(0)}만/㎡, P75=${(result.tierPercentiles.p75/10000).toFixed(0)}만/㎡, P90=${(result.tierPercentiles.p90/10000).toFixed(0)}만/㎡`);
        }
      }

      // Show recent sales (to find the ₩85,300만 transaction)
      console.log('\n   Recent Sales (top 10):');
      result.recentSales.slice(0, 10).forEach((sale, i) => {
        console.log(`   ${i + 1}. ${sale.date}: ₩${(sale.price / 10000).toFixed(0)}만 (${sale.floor}층, ${sale.daysAgo}d ago)`);
      });

      // Run jeonse analysis too
      if (result.allJeonseTransactions && result.allJeonseTransactions.length > 0) {
        console.log(`\n   📊 Jeonse Analysis (${result.allJeonseTransactions.length} transactions):`);
        const jeonseAnalyzer = new JeonsePriceAnalyzer();

        // Non-tiered analysis
        const jeonseResult = jeonseAnalyzer.analyze(
          630000000, // ₩6.3억 proposed jeonse (from user's report)
          result.allJeonseTransactions,
          testArea
        );
        if (jeonseResult) {
          console.log(`\n   Expected Jeonse (regression): ₩${(jeonseResult.expectedJeonse / 100000000).toFixed(2)}억`);
          console.log(`   Contract count: ${jeonseResult.contractCount}`);
        }

        // Tiered jeonse analysis
        const tieredJeonse = jeonseAnalyzer.analyzeTiered(
          result.allJeonseTransactions,
          testArea
        );
        if (tieredJeonse) {
          console.log('\n   📊 Tiered Expected Jeonse:');
          for (const tier of tieredJeonse.tieredExpectedJeonse) {
            const marker = tier.tier === 'top' ? ' ← NEW' : '';
            console.log(`   ${tier.label}: ₩${(tier.expectedJeonse / 100000000).toFixed(2)}억 (${(tier.unitJeonse / 10000).toFixed(0)}만/㎡, ${tier.transactionCount} txns)${marker}`);
          }
        }
      }

      // Accuracy check against known transaction
      const expectedValue = 8.53; // ₩85,300만
      const topTier = result.tierEstimates?.find(t => t.tier === 'top');
      const premiumTier = result.tierEstimates?.find(t => t.tier === 'premium');

      console.log('\n' + '─'.repeat(80));
      console.log('📈 ACCURACY CHECK (vs ₩85,300만 actual transaction)');
      console.log('─'.repeat(80));
      console.log(`   Known transaction: ₩${expectedValue}億 (Jan 2026, 6F, same area)`);
      console.log(`   valueMid (Mid tier): ₩${(result.valueMid / 100000000).toFixed(2)}億`);
      if (premiumTier) {
        const premiumError = Math.abs(premiumTier.value / 100000000 - expectedValue);
        console.log(`   Premium tier: ₩${(premiumTier.value / 100000000).toFixed(2)}億 (error: ${(premiumError / expectedValue * 100).toFixed(1)}%)`);
      }
      if (topTier) {
        const topError = Math.abs(topTier.value / 100000000 - expectedValue);
        console.log(`   Top tier: ₩${(topTier.value / 100000000).toFixed(2)}億 (error: ${(topError / expectedValue * 100).toFixed(1)}%) ← NEW`);
      } else {
        console.log(`   Top tier: Not available (merged into Premium — < 3 transactions)`);
      }

      console.log('\n' + '═'.repeat(80));

    } catch (error) {
      console.error(`   ❌ Valuation failed for area ${testArea}:`, error);
    }
  }

  console.log('\n');
}

main().catch(console.error);
