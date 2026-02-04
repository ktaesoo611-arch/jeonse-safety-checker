import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { MolitWolseAPI, getDistrictCode } from '../lib/apis/molit-wolse';
import { getAdjacentDongs, getAdjacentDistricts } from '../lib/data/adjacent-dongs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const analysisId = '57dc0e0a-7f36-4922-9ed6-f5310d00c00d';

  // Get property info from analysis
  const { data: analysis } = await supabase
    .from('analyses')
    .select('*, properties(*)')
    .eq('id', analysisId)
    .single();

  if (!analysis) {
    console.log('Analysis not found');
    return;
  }

  const property = analysis.properties;
  console.log('=== Property Info ===');
  console.log('Address:', property?.address);
  console.log('District:', property?.district);
  console.log('Dong:', property?.dong);
  console.log('Exclusive Area:', property?.exclusive_area);
  console.log('Building Type:', property?.building_type);

  // Get wolse_price_data
  const { data: wolseData } = await supabase
    .from('wolse_price_data')
    .select('*')
    .eq('analysis_id', analysisId)
    .single();

  console.log('\n=== Stored Wolse Data ===');
  console.log('Contract Count:', wolseData?.contract_count);
  console.log('Confidence Level:', wolseData?.confidence_level);
  console.log('Data Source Note:', wolseData?.data_source_note);
  console.log('Recent Transactions:', wolseData?.recent_transactions?.length || 0);

  // Now let's test the MOLIT API directly
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.log('\nMOLIT_API_KEY not found');
    return;
  }

  const wolseAPI = new MolitWolseAPI(apiKey);

  // Extract parameters
  const district = property?.district || '마포구';
  const dong = property?.dong || '서교동';
  const area = property?.exclusive_area || 154.3;
  const city = '서울';

  const lawdCd = getDistrictCode(city, district);
  console.log('\n=== MOLIT API Parameters ===');
  console.log('City:', city);
  console.log('District:', district);
  console.log('Dong:', dong);
  console.log('Area:', area, '㎡');
  console.log('LawdCd:', lawdCd);
  console.log('Building Type: multifamily (연립/다세대)');

  if (!lawdCd) {
    console.log('ERROR: District code not found');
    return;
  }

  // Test 1: Single dong query
  console.log('\n=== Test 1: Single Dong Query ===');
  console.log(`Querying ${dong} for area ${area}㎡ ±10%...`);

  const singleDongTxns = await wolseAPI.getRecentWolseForMultifamilyByDong(
    lawdCd,
    dong,
    area,
    12,  // 12 months
    0.10  // ±10% area tolerance
  );
  console.log(`Results: ${singleDongTxns.length} transactions`);

  if (singleDongTxns.length > 0) {
    console.log('\nSample transactions:');
    singleDongTxns.slice(0, 3).forEach((t, i) => {
      console.log(`  ${i+1}. ${t.dong} - ${t.exclusiveArea}㎡ - 보증금 ${t.deposit/10000}만 / 월세 ${t.monthlyRent/10000}만`);
    });
  }

  // Test 2: Adjacent dongs
  const adjacentDongs = getAdjacentDongs(district, dong);
  console.log('\n=== Test 2: Adjacent Dongs ===');
  console.log(`Adjacent dongs for ${dong}:`, adjacentDongs);

  if (adjacentDongs.length > 0) {
    const allDongs = [dong, ...adjacentDongs];
    console.log(`\nQuerying ${allDongs.length} dongs: [${allDongs.join(', ')}]...`);

    const multiDongTxns = await wolseAPI.getRecentWolseForMultifamilyByDongs(
      lawdCd,
      allDongs,
      area,
      12,  // 12 months
      0.10  // ±10% area tolerance
    );
    console.log(`Results: ${multiDongTxns.length} transactions`);

    if (multiDongTxns.length > 0) {
      console.log('\nSample transactions:');
      multiDongTxns.slice(0, 5).forEach((t, i) => {
        console.log(`  ${i+1}. ${t.dong} - ${t.exclusiveArea}㎡ - 보증금 ${t.deposit/10000}만 / 월세 ${t.monthlyRent/10000}만`);
      });

      // Group by dong
      const byDong = new Map<string, number>();
      multiDongTxns.forEach(t => {
        byDong.set(t.dong, (byDong.get(t.dong) || 0) + 1);
      });
      console.log('\nTransactions by dong:');
      byDong.forEach((count, d) => console.log(`  ${d}: ${count}`));
    }
  }

  // Test 3: District-level with strict area tolerance (±10%)
  console.log('\n=== Test 3: DISTRICT-LEVEL (마포구) with ±10% Area Tolerance ===');
  console.log(`Querying entire 마포구 for area ${area}㎡ ±10% (${(area * 0.9).toFixed(1)} ~ ${(area * 1.1).toFixed(1)}㎡)...`);

  const districtTxns = await wolseAPI.getRecentWolseForMultifamilyByDongs(
    lawdCd,
    [],  // Empty array = no dong filter, district-wide
    area,
    12,
    0.10  // Strict ±10% area tolerance
  );
  console.log(`Results: ${districtTxns.length} transactions`);

  if (districtTxns.length > 0) {
    console.log('\nDistrict-level transactions (±10% area):');
    districtTxns.forEach((t, i) => {
      console.log(`  ${i+1}. ${t.dong || '?'} - ${t.exclusiveArea}㎡ - 보증금 ${t.deposit/10000}만 / 월세 ${t.monthlyRent/10000}만 (${t.year}.${t.month})`);
    });
  }

  // Test 4: Adjacent Districts (using getAdjacentDistricts)
  console.log('\n=== Test 4: ADJACENT DISTRICTS with ±10% Area Tolerance ===');

  // Get adjacent districts from the data file
  const adjacentDistricts = getAdjacentDistricts(district);
  console.log(`Adjacent districts to ${district}:`, adjacentDistricts.map(d => d.name).join(', '));

  // Use the new getRecentWolseForMultifamilyByDistricts method
  const allDistricts = [
    { name: district, code: lawdCd },
    ...adjacentDistricts
  ];

  console.log(`\nQuerying all districts using getRecentWolseForMultifamilyByDistricts...`);
  const allDistrictTxns = await wolseAPI.getRecentWolseForMultifamilyByDistricts(
    allDistricts,
    area,
    12,
    0.10
  );

  // Summary
  console.log('\n=== SUMMARY: All Districts Combined ===');
  console.log(`Total transactions (±10% area, 154.3㎡ target):`);
  // Count by district
  const byDistrict = new Map<string, number>();
  allDistrictTxns.forEach((t: any) => {
    const d = t.district || '?';
    byDistrict.set(d, (byDistrict.get(d) || 0) + 1);
  });
  byDistrict.forEach((count, d) => console.log(`  ${d}: ${count}`));
  console.log(`  ----------------`);
  console.log(`  TOTAL: ${allDistrictTxns.length}`);

  if (allDistrictTxns.length > 0) {
    console.log('\nAll matching transactions:');
    allDistrictTxns.forEach((t: any, i) => {
      console.log(`  ${i+1}. [${t.district}] ${t.dong || '?'} - ${t.exclusiveArea}㎡ - 보증금 ${t.deposit/10000}만 / 월세 ${t.monthlyRent/10000}만 (${t.year}.${t.month})`);
    });

    // Area statistics
    const areas = allDistrictTxns.map(t => t.exclusiveArea).sort((a, b) => a - b);
    console.log(`\nArea range: ${areas[0].toFixed(1)}㎡ ~ ${areas[areas.length - 1].toFixed(1)}㎡`);

    // Rent statistics
    const rents = allDistrictTxns.map(t => t.monthlyRent).sort((a, b) => a - b);
    const medianRent = rents[Math.floor(rents.length / 2)];
    console.log(`Rent range: ${rents[0]/10000}만 ~ ${rents[rents.length-1]/10000}만, median: ${medianRent/10000}만`);
  }

  // Test 4: Check what areas exist in the data
  console.log('\n=== Test 4: All Transactions in Dong (no area filter) ===');
  const allInDong = await wolseAPI.getRecentWolseForMultifamilyByDong(
    lawdCd,
    dong,
    undefined,  // No area filter
    12,
    0.10
  );
  console.log(`All transactions in ${dong}: ${allInDong.length}`);

  if (allInDong.length > 0) {
    // Show area distribution
    const areas = allInDong.map(t => t.exclusiveArea).sort((a, b) => a - b);
    const minArea = Math.min(...areas);
    const maxArea = Math.max(...areas);
    const targetMin = area * 0.9;
    const targetMax = area * 1.1;

    console.log(`\nArea range in data: ${minArea}㎡ ~ ${maxArea}㎡`);
    console.log(`Target area range: ${targetMin.toFixed(1)}㎡ ~ ${targetMax.toFixed(1)}㎡ (${area}㎡ ±10%)`);

    // Count how many fall in target range
    const inRange = allInDong.filter(t => t.exclusiveArea >= targetMin && t.exclusiveArea <= targetMax);
    console.log(`Transactions in target range: ${inRange.length}`);

    // Show area distribution
    const areaGroups = new Map<string, number>();
    allInDong.forEach(t => {
      const bucket = `${Math.floor(t.exclusiveArea / 10) * 10}-${Math.floor(t.exclusiveArea / 10) * 10 + 10}`;
      areaGroups.set(bucket, (areaGroups.get(bucket) || 0) + 1);
    });
    console.log('\nArea distribution (㎡):');
    [...areaGroups.entries()].sort().forEach(([range, count]) => {
      console.log(`  ${range}: ${count} transactions`);
    });
  }
}

main().catch(console.error);
