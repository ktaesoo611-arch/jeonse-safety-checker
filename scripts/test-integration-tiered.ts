/**
 * Integration test: Verify PropertyValuationEngine outputs tiered estimates for multifamily
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PropertyValuationEngine } from '../lib/analyzers/property-valuation';
import { PropertyDetails } from '../lib/types';

const apiKey = process.env.MOLIT_API_KEY;
if (!apiKey) {
  console.error('MOLIT_API_KEY not set in .env.local');
  process.exit(1);
}

async function testIntegration() {
  const engine = new PropertyValuationEngine(apiKey!);

  // Test case: 성동구 행당동 293-8 (previously tested property)
  const property: PropertyDetails = {
    address: '서울특별시 성동구 행당동 293-8',
    city: '서울특별시',
    district: '성동구',
    dong: '행당동',
    buildingName: '',
    buildingNumber: '293-8',
    floor: 3,
    unit: '301',
    exclusiveArea: 29.57,
    buildingType: 'multifamily',
    buildingYear: 2018,
  };

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  INTEGRATION TEST: PropertyValuationEngine Tiered Hierarchy');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Target: ${property.dong} ${property.buildingNumber}`);
  console.log(`Specs: ${property.exclusiveArea}㎡ | Built ${property.buildingYear} | Floor ${property.floor}\n`);

  const result = await engine.calculatePropertyValue(property, 'multifamily');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  RESULTS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Traditional Triple-Weighted Value:');
  console.log(`  • Low:  ${(result.valueLow / 100000000).toFixed(2)}억원`);
  console.log(`  • Mid:  ${(result.valueMid / 100000000).toFixed(2)}억원`);
  console.log(`  • High: ${(result.valueHigh / 100000000).toFixed(2)}억원`);
  console.log(`  • Confidence: ${(result.confidence * 100).toFixed(0)}%`);

  if (result.tierEstimates && result.tierEstimates.length > 0) {
    console.log('\n✅ Tiered Hierarchy Estimates:');
    console.log('┌────────────────┬───────────────┬────────────────┬────────┬───────────┐');
    console.log('│ Tier           │ Est. Value    │ Unit Price     │ Txns   │ Eff. N    │');
    console.log('├────────────────┼───────────────┼────────────────┼────────┼───────────┤');

    for (const est of result.tierEstimates) {
      const value = `${(est.value / 100000000).toFixed(2)}억`;
      const unitPrice = `${(est.unitPrice / 10000).toFixed(0)}만/㎡`;
      console.log(`│ ${est.label.padEnd(14)} │ ${value.padStart(13)} │ ${unitPrice.padStart(14)} │ ${String(est.transactionCount).padStart(6)} │ ${est.effectiveSampleSize.toFixed(1).padStart(9)} │`);
    }
    console.log('└────────────────┴───────────────┴────────────────┴────────┴───────────┘');
  } else {
    console.log('\n❌ No tierEstimates in result');
  }

  if (result.tierPercentiles) {
    console.log('\n✅ Percentile Thresholds (adapts to district):');
    console.log(`  • P25: ${(result.tierPercentiles.p25 / 10000).toFixed(0)}만/㎡ (Budget < this)`);
    console.log(`  • P50: ${(result.tierPercentiles.p50 / 10000).toFixed(0)}만/㎡ (Standard < this)`);
    console.log(`  • P75: ${(result.tierPercentiles.p75 / 10000).toFixed(0)}만/㎡ (Mid < this)`);
  } else {
    console.log('\n❌ No tierPercentiles in result');
  }

  if (result.tierGuidance) {
    console.log('\n✅ Tier Guidance Included:');
    console.log(`  • Premium indicators: ${result.tierGuidance.premium.length} items`);
    console.log(`  • Mid indicators: ${result.tierGuidance.mid.length} items`);
    console.log(`  • Standard indicators: ${result.tierGuidance.standard.length} items`);
    console.log(`  • Budget indicators: ${result.tierGuidance.budget.length} items`);
  } else {
    console.log('\n❌ No tierGuidance in result');
  }

  // Verify actual price comparison
  const actualPrice = 44900; // 만원 (Jun 2025 transaction)
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`  ACTUAL PRICE COMPARISON: ${actualPrice.toLocaleString()}만원 (Jun 2025)`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  if (result.tierEstimates) {
    for (const est of result.tierEstimates) {
      const estValue만 = est.value / 10000;
      const diff = estValue만 - actualPrice;
      const diffPct = (diff / actualPrice) * 100;
      const sign = diff >= 0 ? '+' : '';
      console.log(`  ${est.label}: ${estValue만.toLocaleString()}만원 (${sign}${diffPct.toFixed(1)}%)`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
}

testIntegration().catch(console.error);
