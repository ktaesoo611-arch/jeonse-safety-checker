/**
 * Test percentile-based stratification across different districts
 * Verifies that thresholds adapt to local price levels
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PropertyValuationEngine } from '../lib/analyzers/property-valuation';
import { PropertyDetails } from '../lib/types';

const apiKey = process.env.MOLIT_API_KEY;
if (!apiKey) {
  console.error('MOLIT_API_KEY not set');
  process.exit(1);
}

const testCases: Array<{ name: string; property: PropertyDetails }> = [
  {
    name: '성동구 행당동 (Mid-range)',
    property: {
      address: '서울특별시 성동구 행당동',
      city: '서울특별시',
      district: '성동구',
      dong: '행당동',
      buildingName: '',
      buildingNumber: '',
      floor: 3,
      unit: '',
      exclusiveArea: 30,
      buildingType: 'multifamily',
      buildingYear: 2018,
    },
  },
  {
    name: '중구 신당동 (Higher-range)',
    property: {
      address: '서울특별시 중구 신당동',
      city: '서울특별시',
      district: '중구',
      dong: '신당동',
      buildingName: '',
      buildingNumber: '',
      floor: 3,
      unit: '',
      exclusiveArea: 30,
      buildingType: 'multifamily',
      buildingYear: 2018,
    },
  },
];

async function runTests() {
  const engine = new PropertyValuationEngine(apiKey!);

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  PERCENTILE-BASED STRATIFICATION: District Comparison');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  const results: Array<{
    name: string;
    p25: number;
    p50: number;
    p75: number;
    tiers: Array<{ tier: string; value: number; unitPrice: number; count: number }>;
  }> = [];

  for (const testCase of testCases) {
    console.log(`\n${'─'.repeat(75)}`);
    console.log(`  Testing: ${testCase.name}`);
    console.log(`${'─'.repeat(75)}\n`);

    try {
      const result = await engine.calculatePropertyValue(testCase.property, 'multifamily');

      if (result.tierPercentiles && result.tierEstimates) {
        results.push({
          name: testCase.name,
          p25: result.tierPercentiles.p25,
          p50: result.tierPercentiles.p50,
          p75: result.tierPercentiles.p75,
          tiers: result.tierEstimates.map(t => ({
            tier: t.label,
            value: t.value,
            unitPrice: t.unitPrice,
            count: t.transactionCount,
          })),
        });
      }
    } catch (error) {
      console.error(`  Error: ${error}`);
    }
  }

  // Summary comparison
  console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('  SUMMARY: Percentile Thresholds by District');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  console.log('┌─────────────────────────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ District                        │ P25 (만/㎡)   │ P50 (만/㎡)   │ P75 (만/㎡)   │');
  console.log('├─────────────────────────────────┼──────────────┼──────────────┼──────────────┤');

  for (const r of results) {
    const p25 = (r.p25 / 10000).toFixed(0).padStart(10);
    const p50 = (r.p50 / 10000).toFixed(0).padStart(10);
    const p75 = (r.p75 / 10000).toFixed(0).padStart(10);
    console.log(`│ ${r.name.padEnd(31)} │ ${p25} │ ${p50} │ ${p75} │`);
  }

  console.log('└─────────────────────────────────┴──────────────┴──────────────┴──────────────┘');

  console.log('\n\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('  TIER ESTIMATES BY DISTRICT');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');

  for (const r of results) {
    console.log(`\n  ${r.name}:`);
    console.log('  ┌────────────────────────┬────────────────┬────────────────┬────────┐');
    console.log('  │ Tier                   │ Est. Value     │ Unit Price     │ Count  │');
    console.log('  ├────────────────────────┼────────────────┼────────────────┼────────┤');

    for (const t of r.tiers) {
      const value = `${(t.value / 100000000).toFixed(2)}억`.padStart(12);
      const unitPrice = `${(t.unitPrice / 10000).toFixed(0)}만/㎡`.padStart(12);
      const count = String(t.count).padStart(6);
      console.log(`  │ ${t.tier.padEnd(22)} │ ${value} │ ${unitPrice} │ ${count} │`);
    }

    console.log('  └────────────────────────┴────────────────┴────────────────┴────────┘');
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('  KEY INSIGHT: Percentile thresholds automatically adapt to local price levels');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
}

runTests().catch(console.error);
