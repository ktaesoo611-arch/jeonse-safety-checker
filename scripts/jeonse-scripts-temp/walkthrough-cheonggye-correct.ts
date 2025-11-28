/**
 * Correct walkthrough for 청계한신휴플러스 in 동대문구 답십리동
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { MolitAPI, getDistrictCode } from '../lib/apis/molit';
import { getBuildingNameVariants } from '../lib/data/address-data';

async function walkthrough() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 CORRECT WALKTHROUGH: 청계한신휴플러스 (동대문구 답십리동)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const userInput = {
    city: '서울특별시',
    district: '동대문구',
    dong: '답십리동',
    building: '청계한신휴플러스',
    proposedJeonse: 500000000,
    address: '서울특별시 동대문구 답십리동'
  };

  console.log('📝 STEP 1: User Input');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('City:', userInput.city);
  console.log('District:', userInput.district, '← CORRECT: 동대문구 (not 종로구!)');
  console.log('Dong:', userInput.dong);
  console.log('Building:', userInput.building);
  console.log('Proposed Jeonse:', `₩${(userInput.proposedJeonse / 100000000).toFixed(1)}억`);

  // Get district code
  const lawdCd = getDistrictCode(userInput.city, userInput.district);

  console.log('\n\n💰 STEP 2: MOLIT API Query');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('District:', userInput.district);
  console.log('District Code:', lawdCd);

  if (!lawdCd) {
    console.log('⚠️  No district code found!');
    return;
  }

  // Get building name variants
  const buildingNameVariants = getBuildingNameVariants(userInput.building);
  console.log('Building Name Variants:', buildingNameVariants);

  // Initialize MOLIT API
  const molit = new MolitAPI(process.env.MOLIT_API_KEY!);

  console.log('\nSearching MOLIT transactions...\n');

  // Try to find transactions
  const assumedArea = 84; // We'll use typical apartment size
  let transactions: any[] = [];
  let usedBuildingName = userInput.building;

  for (const nameVariant of buildingNameVariants) {
    console.log(`Trying variant: "${nameVariant}"`);

    const result = await molit.getRecentTransactionsForApartment(
      lawdCd,
      nameVariant,
      assumedArea,
      6
    );

    if (result.length > 0) {
      transactions = result;
      usedBuildingName = nameVariant;
      console.log(`✓ SUCCESS: Found ${transactions.length} transactions`);
      break;
    } else {
      console.log(`✗ No transactions found`);
    }
  }

  console.log('\n\n📈 STEP 3: Valuation Calculation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (transactions.length > 0) {
    console.log(`✓ REAL MOLIT DATA FOUND!`);
    console.log(`Building: ${usedBuildingName}`);
    console.log(`Transactions: ${transactions.length}\n`);

    // Show transactions
    let totalAmount = 0;
    transactions.forEach((t, i) => {
      console.log(`${i + 1}. ${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`);
      console.log(`   Area: ${t.exclusiveArea}㎡, Floor: ${t.floor}층`);
      console.log(`   Amount: ₩${t.transactionAmount.toLocaleString()}`);
      totalAmount += t.transactionAmount;
    });

    const avgPrice = totalAmount / transactions.length;
    const confidence = Math.min(0.9, 0.5 + (transactions.length * 0.05));

    console.log(`\nCalculation:`);
    console.log(`  Total: ₩${totalAmount.toLocaleString()}`);
    console.log(`  Count: ${transactions.length}`);
    console.log(`  Average: ₩${Math.round(avgPrice).toLocaleString()}`);
    console.log(`  Confidence: ${confidence} (${(confidence * 100).toFixed(0)}%)`);

    console.log('\nFinal Valuation:');
    console.log(`  valueMid: ₩${Math.round(avgPrice).toLocaleString()}`);
    console.log(`  valueLow: ₩${Math.round(avgPrice * 0.95).toLocaleString()}`);
    console.log(`  valueHigh: ₩${Math.round(avgPrice * 1.05).toLocaleString()}`);
  } else {
    console.log(`⚠️  NO TRANSACTIONS FOUND - Using jeonse ratio fallback`);
    const estimatedValue = Math.round(userInput.proposedJeonse / 0.70);
    console.log(`\nJeonse Ratio Estimation:`);
    console.log(`  Jeonse: ₩${userInput.proposedJeonse.toLocaleString()}`);
    console.log(`  ÷ 0.70`);
    console.log(`  = ₩${estimatedValue.toLocaleString()}`);
    console.log(`  Confidence: 0.5 (50% - estimation only)`);
  }

  // Now search for what buildings ARE in this district
  console.log('\n\n🔍 STEP 4: What buildings ARE in 동대문구?');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Searching for buildings with "청계", "한신", or "휴플러스" in 동대문구...\n');

  const testMonths = ['202510', '202509'];
  for (const month of testMonths) {
    const allTransactions = await molit.getApartmentTransactions(lawdCd, month);

    const buildings = new Map<string, any[]>();
    allTransactions.forEach(t => {
      const name = t.apartmentName.trim();
      if (name.includes('청계') || name.includes('한신') || name.includes('휴플러스')) {
        if (!buildings.has(name)) {
          buildings.set(name, []);
        }
        buildings.get(name)!.push(t);
      }
    });

    if (buildings.size > 0) {
      console.log(`📅 ${month}:`);
      Array.from(buildings.entries()).forEach(([name, txs]) => {
        console.log(`   • ${name} (${txs.length} transactions)`);
      });
      console.log('');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ WALKTHROUGH COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

walkthrough();
