/**
 * Test Property Valuation Engine
 *
 * Run with: npx tsx scripts/test-valuation.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import { PropertyValuationEngine } from '../lib/analyzers/property-valuation';
import { PropertyDetails } from '../lib/types';

async function testValuation() {
  console.log('🧪 Testing Property Valuation Engine...\n');

  // Check for required environment variables
  const molitKey = process.env.MOLIT_API_KEY;

  if (!molitKey) {
    console.error('❌ Error: MOLIT_API_KEY not found');
    process.exit(1);
  }

  console.log('✓ API keys found\n');

  const engine = new PropertyValuationEngine(molitKey);

  // Test property (using a well-known Seoul apartment complex)
  // You should replace this with a real apartment name from your area
  const testProperty: PropertyDetails = {
    address: '서울특별시 마포구 서교동 395-69',
    city: '서울',
    district: '마포구',
    dong: '서교동',
    buildingName: '마포래미안푸르지오',  // Replace with actual apartment name
    buildingNumber: '395-69',
    floor: 10,
    unit: '1001',
    exclusiveArea: 84.9  // Typical 84㎡ apartment
  };

  console.log('🏢 Test Property:');
  console.log(`   Address: ${testProperty.address}`);
  console.log(`   Building: ${testProperty.buildingName}`);
  console.log(`   Area: ${testProperty.exclusiveArea}㎡`);
  console.log(`   Floor: ${testProperty.floor}\n`);

  try {
    console.log('📊 Fetching transaction data and calculating value...\n');

    const result = await engine.calculatePropertyValue(testProperty);

    console.log('✅ Valuation Complete!\n');
    console.log('═══════════════════════════════════════');
    console.log('📈 PROPERTY VALUATION RESULTS');
    console.log('═══════════════════════════════════════\n');

    // Estimated Value
    console.log('💰 Estimated Value:');
    console.log(`   Low:  ₩${result.valueLow.toLocaleString()}`);
    console.log(`   Mid:  ₩${result.valueMid.toLocaleString()}`);
    console.log(`   High: ₩${result.valueHigh.toLocaleString()}\n`);

    // Per Pyeong Price
    const pyeong = testProperty.exclusiveArea * 0.3025;
    console.log(`📐 Price per Pyeong (${pyeong.toFixed(1)}평):`);
    console.log(`   ₩${result.pricePerPyeong.toLocaleString()} / 평\n`);

    // Confidence (now numeric 0-1 based on R² + data quality)
    const confidencePercent = (result.confidence * 100).toFixed(0);
    const confidenceEmoji = result.confidence >= 0.7 ? '🟢' : result.confidence >= 0.4 ? '🟡' : '🔴';
    const confidenceLabel = result.confidence >= 0.7 ? 'HIGH' : result.confidence >= 0.4 ? 'MEDIUM' : 'LOW';
    console.log(`${confidenceEmoji} Confidence Level: ${confidenceLabel} (${confidencePercent}%)`);

    if (result.confidence < 0.4) {
      console.log('   ⚠️  Warning: Limited transaction data or weak statistical trend');
    }
    console.log();

    // Market Trend
    const trendEmoji = result.trend === 'rising' ? '📈' : result.trend === 'falling' ? '📉' : '➡️';
    console.log(`${trendEmoji} Market Trend: ${result.trend.toUpperCase()}`);
    console.log(`   Change: ${result.trendPercentage.toFixed(2)}%\n`);

    // Recent Sales
    console.log('📋 Recent Sales:');
    if (result.recentSales.length > 0) {
      result.recentSales.forEach((sale, i) => {
        console.log(`   ${i + 1}. ${sale.date} - Floor ${sale.floor}`);
        console.log(`      ₩${sale.price.toLocaleString()}`);
        console.log(`      (${sale.daysAgo} days ago)`);
      });
    } else {
      console.log('   No recent sales data');
    }
    console.log();

    // Data Sources
    console.log('🔍 Data Sources:');
    result.dataSources.forEach(source => {
      console.log(`   ${source.name}: ₩${source.value.toLocaleString()} (weight: ${source.weight}%)`);
    });
    console.log();

    console.log('═══════════════════════════════════════\n');

    // Analysis
    console.log('📊 Quick Analysis:');
    const safeJeonseRatio = 0.7; // 70% LTV is considered safe
    const safeJeonse = Math.floor(result.valueMid * safeJeonseRatio);
    console.log(`   Safe jeonse amount (70% LTV):`);
    console.log(`   ≤ ₩${safeJeonse.toLocaleString()}\n`);

    console.log('✅ Valuation engine is working correctly!\n');

  } catch (error: any) {
    console.error('\n❌ Valuation Error:', error.message);

    if (error.message.includes('No recent transaction data')) {
      console.log('\n💡 This is normal! It means:');
      console.log('   1. The test apartment name might not exist');
      console.log('   2. No transactions in the last 6 months for this exact area');
      console.log('\n   Try with a different apartment:');
      console.log('   - Find a real apartment name in 마포구');
      console.log('   - Update buildingName in this test file');
      console.log('   - Run again\n');
    } else if (error.message.includes('District code not found')) {
      console.log('\n💡 District code issue:');
      console.log('   - Check city and district names match exactly');
      console.log('   - Add more districts to getDistrictCode() if needed\n');
    } else {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check MOLIT API key is valid');
      console.log('   2. Test API directly with test-molit-api.ts first');
      console.log('   3. Verify internet connection\n');
    }

    process.exit(1);
  }
}

// Instructions
console.log('╔════════════════════════════════════════════╗');
console.log('║  PROPERTY VALUATION ENGINE TEST           ║');
console.log('╚════════════════════════════════════════════╝\n');

console.log('📝 Note: This test uses real MOLIT API data');
console.log('   Make sure you have a valid API key configured\n');

// Run the test
testValuation();
