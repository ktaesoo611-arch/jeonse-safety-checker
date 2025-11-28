/**
 * Test that the apartment database loads correctly
 */

import { SEOUL_APARTMENTS, searchApartments } from '../lib/data/address-data';

console.log('🧪 Testing Apartment Database\n');
console.log('='.repeat(80));

console.log(`\n📊 Total apartments loaded: ${SEOUL_APARTMENTS.length.toLocaleString()}`);

// Test search for 텐즈힐
console.log('\n🔍 Searching for "텐즈힐"...');
const tenszhill = searchApartments('텐즈힐');
console.log(`   Found: ${tenszhill.length} results`);
tenszhill.forEach(apt => {
  console.log(`   - ${apt.name} (${apt.district}, dongs: ${apt.dongs?.join(', ') || apt.dong || 'N/A'})`);
});

// Test search for 청계한신휴플러스
console.log('\n🔍 Searching for "청계한신휴플러스"...');
const cheonggye = searchApartments('청계한신휴플러스');
console.log(`   Found: ${cheonggye.length} results`);
cheonggye.forEach(apt => {
  console.log(`   - ${apt.name} (${apt.district}, dongs: ${apt.dongs?.join(', ') || apt.dong || 'N/A'})`);
});

// Test district filtering
console.log('\n🔍 Searching for apartments in 성동구...');
const seongdong = SEOUL_APARTMENTS.filter(apt => apt.district === '성동구');
console.log(`   Found: ${seongdong.length} apartments in 성동구`);
console.log(`   Sample (first 10):`);
seongdong.slice(0, 10).forEach(apt => {
  console.log(`   - ${apt.name}`);
});

// Test dong filtering
console.log('\n🔍 Searching for "힐" in 하왕십리동...');
const hilInDong = searchApartments('힐', '하왕십리동', '성동구');
console.log(`   Found: ${hilInDong.length} results`);
hilInDong.forEach(apt => {
  console.log(`   - ${apt.name} (${apt.district}, dongs: ${apt.dongs?.join(', ') || apt.dong})`);
});

console.log('\n' + '='.repeat(80));
console.log('✅ Test complete!\n');
