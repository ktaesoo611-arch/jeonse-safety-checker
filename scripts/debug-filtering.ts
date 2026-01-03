import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';

const API_KEY = process.env.MOLIT_API_KEY || process.env.DATA_GO_KR_API_KEY;

if (!API_KEY) {
  console.error('Missing API key. Set MOLIT_API_KEY or DATA_GO_KR_API_KEY');
  process.exit(1);
}

interface WolseTransaction {
  apartmentName: string;
  exclusiveArea: number;
  floor: number;
  deposit: number;
  monthlyRent: number;
  year: number;
  month: number;
  day: number;
  contractType?: string;
}

async function analyzeFiltering() {
  const api = new MolitWolseAPI(API_KEY);

  const city = '서울특별시';
  const district = '구로구';
  const dong = '개봉동';
  const apartmentName = '현대아이파크';
  const exclusiveArea = 84;
  const monthsBack = 12;

  const lawdCd = getDistrictCode(city, district);
  if (!lawdCd) {
    console.error(`District code not found for ${city} ${district}`);
    return;
  }

  console.log('='.repeat(80));
  console.log(`🔍 Filtering Breakdown: ${apartmentName} ${exclusiveArea}㎡`);
  console.log(`   Location: ${city} ${district} ${dong}`);
  console.log('='.repeat(80));

  // Step 1: Fetch all transactions
  const transactions = await api.getRecentWolseForApartment(
    lawdCd,
    apartmentName,
    exclusiveArea,
    monthsBack
  );

  console.log(`\n📊 STEP 1: Raw API Data`);
  console.log(`   Total transactions fetched: ${transactions.length}`);
  console.log('\n   All transactions:');
  transactions.forEach((t, i) => {
    console.log(`   ${i + 1}. ${t.year}.${t.month}.${t.day} | ${t.exclusiveArea}㎡ | ${t.floor}F | ${(t.deposit/10000).toLocaleString()}만/${(t.monthlyRent/10000).toLocaleString()}만 | ${t.contractType || 'N/A'}`);
  });

  // Step 2: Filter renewal contracts
  console.log(`\n📊 STEP 2: Renewal Contract Filter (갱신 제외)`);
  const renewals = transactions.filter(t => t.contractType === '갱신');
  const newContracts = transactions.filter(t => t.contractType !== '갱신');

  console.log(`   🔄 Renewals (갱신) removed: ${renewals.length}`);
  if (renewals.length > 0) {
    renewals.forEach((t, i) => {
      console.log(`      - ${t.year}.${t.month}.${t.day} | ${(t.deposit/10000).toLocaleString()}만/${(t.monthlyRent/10000).toLocaleString()}만`);
    });
  }
  console.log(`   ✅ New contracts (신규) kept: ${newContracts.length}`);

  // Step 3: Outlier Removal (deposit: 0~80% of property value, rent: IQR with 30% min)
  console.log(`\n📊 STEP 3: Outlier Removal`);

  if (newContracts.length < 4) {
    console.log(`   ⚠️ Not enough data (need 4, have ${newContracts.length})`);
    return;
  }

  const CONVERSION_RATE = 0.045; // 4.5% for implied jeonse
  const JEONSE_TO_VALUE_RATIO = 0.75; // Jeonse ≈ 75% of property value
  const MAX_DEPOSIT_RATIO = 0.80; // Max deposit = 80% of property value
  const MIN_IQR_PERCENT = 0.30; // 30% of median for rent IQR
  const multiplier = 1.5; // building level

  // Step 3a: Estimate property value from transactions
  console.log(`\n   📊 DEPOSIT BOUNDS (0 ~ 80% of property value):`);
  const impliedJeonses = newContracts.map(t =>
    t.deposit + (t.monthlyRent * 12 / CONVERSION_RATE)
  );
  impliedJeonses.sort((a, b) => a - b);
  const medianImpliedJeonse = impliedJeonses[Math.floor(impliedJeonses.length / 2)];
  const estimatedPropertyValue = medianImpliedJeonse / JEONSE_TO_VALUE_RATIO;

  console.log(`      Implied jeonses: ${impliedJeonses.map(j => (j/10000).toFixed(0) + '만').join(', ')}`);
  console.log(`      Median implied jeonse: ${(medianImpliedJeonse/10000).toLocaleString()}만`);
  console.log(`      Estimated property value: ${(estimatedPropertyValue/10000).toLocaleString()}만 (jeonse ÷ 0.75)`);

  const depositLower = 0;
  const depositUpper = estimatedPropertyValue * MAX_DEPOSIT_RATIO;
  console.log(`      Valid deposit range: ${(depositLower/10000).toLocaleString()}만 ~ ${(depositUpper/10000).toLocaleString()}만`);

  // Step 3b: Calculate rent bounds using IQR with 30% minimum
  console.log(`\n   📊 RENT BOUNDS (IQR with 30% min):`);
  const sortedRents = [...newContracts].sort((a, b) => a.monthlyRent - b.monthlyRent);
  const q1RentIdx = Math.floor(newContracts.length * 0.25);
  const q3RentIdx = Math.floor(newContracts.length * 0.75);
  const medianRentIdx = Math.floor(newContracts.length * 0.5);
  const q1Rent = sortedRents[q1RentIdx].monthlyRent;
  const q3Rent = sortedRents[q3RentIdx].monthlyRent;
  const medianRent = sortedRents[medianRentIdx].monthlyRent;

  let iqrRent = q3Rent - q1Rent;
  const minIqrRent = medianRent * MIN_IQR_PERCENT;
  const usedMinRent = iqrRent < minIqrRent;
  if (usedMinRent) {
    iqrRent = minIqrRent;
  }
  const rentLower = q1Rent - multiplier * iqrRent;
  const rentUpper = q3Rent + multiplier * iqrRent;

  console.log(`      Q1: ${(q1Rent/10000).toLocaleString()}만, Q3: ${(q3Rent/10000).toLocaleString()}만, Median: ${(medianRent/10000).toLocaleString()}만`);
  console.log(`      Raw IQR: ${((q3Rent - q1Rent)/10000).toLocaleString()}만, Min IQR (30%): ${(minIqrRent/10000).toLocaleString()}만`);
  console.log(`      Used IQR: ${(iqrRent/10000).toLocaleString()}만 ${usedMinRent ? '← using min 30%' : ''}`);
  console.log(`      Valid rent range: ${(rentLower/10000).toLocaleString()}만 ~ ${(rentUpper/10000).toLocaleString()}만`);

  const clean: WolseTransaction[] = [];
  const removed: WolseTransaction[] = [];

  for (const t of newContracts) {
    const depositOutlier = t.deposit < depositLower || t.deposit > depositUpper;
    const rentOutlier = t.monthlyRent < rentLower || t.monthlyRent > rentUpper;

    if (depositOutlier || rentOutlier) {
      removed.push(t);
    } else {
      clean.push(t);
    }
  }

  console.log(`\n   ❌ Outliers removed: ${removed.length}`);
  if (removed.length > 0) {
    removed.forEach((t, i) => {
      const depositOutlier = t.deposit < depositLower || t.deposit > depositUpper;
      const rentOutlier = t.monthlyRent < rentLower || t.monthlyRent > rentUpper;
      const reason = [];
      if (depositOutlier) reason.push('deposit');
      if (rentOutlier) reason.push('rent');
      console.log(`      - ${t.year}.${t.month}.${t.day} | ${(t.deposit/10000).toLocaleString()}만/${(t.monthlyRent/10000).toLocaleString()}만 | Reason: ${reason.join(' & ')} outlier`);
    });
  }

  console.log(`\n   ✅ Clean transactions: ${clean.length}`);
  clean.forEach((t, i) => {
    console.log(`      ${i + 1}. ${t.year}.${t.month}.${t.day} | ${t.exclusiveArea}㎡ | ${t.floor}F | ${(t.deposit/10000).toLocaleString()}만/${(t.monthlyRent/10000).toLocaleString()}만`);
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 SUMMARY');
  console.log('='.repeat(80));
  console.log(`   Raw API data:        ${transactions.length} contracts`);
  console.log(`   - Renewals removed:  ${renewals.length}`);
  console.log(`   - IQR outliers:      ${removed.length}`);
  console.log(`   ────────────────────────────────`);
  console.log(`   Final clean data:    ${clean.length} contracts`);
  console.log('='.repeat(80));
}

analyzeFiltering().catch(console.error);
