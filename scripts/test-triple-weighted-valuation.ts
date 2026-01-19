/**
 * Test the new triple-weighted valuation for 신당동 620 201호
 *
 * Run with: npx tsx scripts/test-triple-weighted-valuation.ts
 */

import 'dotenv/config';
import { PropertyValuationEngine } from '../lib/analyzers/property-valuation';
import { PropertyDetails } from '../lib/types';

async function main() {
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('❌ MOLIT_API_KEY not set');
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('🧪 TESTING TRIPLE-WEIGHTED VALUATION');
  console.log('═'.repeat(80));

  const engine = new PropertyValuationEngine(apiKey);

  // Test property: 신당동 620 201호
  const property: PropertyDetails = {
    address: '서울특별시 중구 신당동 620',
    city: '서울특별시',
    district: '중구',
    dong: '신당동',
    buildingName: '', // Multifamily doesn't use building name
    buildingNumber: '620',
    floor: 2,
    unit: '201호',
    exclusiveArea: 61.78,
    buildingType: 'multifamily',
    buildingYear: 2000, // Assumed
  };

  console.log('\n📋 Property Details:');
  console.log(`   Address: ${property.address} ${property.unit}`);
  console.log(`   Area: ${property.exclusiveArea}㎡`);
  console.log(`   Floor: ${property.floor}층`);
  console.log(`   Built: ${property.buildingYear}`);
  console.log(`   Type: ${property.buildingType}`);

  console.log('\n' + '─'.repeat(80));
  console.log('Running valuation with triple-weighted approach...');
  console.log('─'.repeat(80));

  try {
    const result = await engine.calculatePropertyValue(property, 'multifamily');

    console.log('\n' + '═'.repeat(80));
    console.log('📊 VALUATION RESULT');
    console.log('═'.repeat(80));

    console.log(`\n   Est.Value: ₩${(result.valueMid / 100000000).toFixed(2)}억`);
    console.log(`   Range: ₩${(result.valueLow / 100000000).toFixed(2)}억 ~ ₩${(result.valueHigh / 100000000).toFixed(2)}억`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`   Trend: ${result.trend} (${result.trendPercentage.toFixed(1)}%)`);
    console.log(`   Price/평: ₩${(result.pricePerPyeong / 10000).toFixed(0)}만원`);

    console.log('\n   Recent Sales:');
    result.recentSales.forEach((sale, i) => {
      console.log(`   ${i + 1}. ${sale.date}: ₩${(sale.price / 100000000).toFixed(2)}억 (${sale.floor}층, ${sale.daysAgo}d ago)`);
    });

    // Compare with expected value
    const expectedValue = 5.6; // ₩5.6억 from actual transaction
    const actualValue = result.valueMid / 100000000;
    const error = Math.abs(actualValue - expectedValue);

    console.log('\n' + '─'.repeat(80));
    console.log('📈 ACCURACY CHECK');
    console.log('─'.repeat(80));
    console.log(`\n   Expected (Nov 2025 txn): ₩${expectedValue}억`);
    console.log(`   Calculated: ₩${actualValue.toFixed(2)}억`);
    console.log(`   Error: ₩${error.toFixed(2)}억 (${(error / expectedValue * 100).toFixed(1)}%)`);

    if (error < 0.1) {
      console.log(`\n   ✅ EXCELLENT: Error < ₩0.1억`);
    } else if (error < 0.3) {
      console.log(`\n   ✓ GOOD: Error < ₩0.3억`);
    } else {
      console.log(`\n   ⚠️ HIGH ERROR: Consider tuning parameters`);
    }

  } catch (error) {
    console.error('❌ Valuation failed:', error);
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

main().catch(console.error);
