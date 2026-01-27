/**
 * Compare dong codes between address-parser.ts and address-data.ts for ALL Seoul districts
 */

// Import from address-data.ts
import { SEOUL_DISTRICTS } from '../lib/data/address-data';
import { parseKoreanAddress } from '../lib/utils/address-parser';

console.log('=== Comparing ALL Seoul District Dong Codes ===\n');
console.log('Comparing address-parser.ts codes with address-data.ts (authoritative MOLIT codes)\n');

let totalMismatches = 0;
let totalMissing = 0;

for (const district of SEOUL_DISTRICTS) {
  let districtMismatches = 0;
  let districtMissing = 0;
  const issues: string[] = [];
  
  for (const dong of district.dongs) {
    const testAddress = `서울 ${district.name} ${dong.name} 1-1`;
    const parsed = parseKoreanAddress(testAddress);
    
    if (!parsed) {
      issues.push(`  ❌ ${dong.name}: NOT IN address-parser.ts (expected ${dong.code})`);
      districtMissing++;
    } else if (parsed.bjdongCd !== dong.code) {
      issues.push(`  ❌ ${dong.name}: parser has ${parsed.bjdongCd}, expected ${dong.code}`);
      districtMismatches++;
    }
  }
  
  if (issues.length > 0) {
    console.log(`\n${district.name} (${district.code}):`);
    for (const issue of issues) {
      console.log(issue);
    }
    totalMismatches += districtMismatches;
    totalMissing += districtMissing;
  }
}

console.log('\n' + '='.repeat(50));
if (totalMismatches === 0 && totalMissing === 0) {
  console.log('✅ All dong codes match between address-parser.ts and address-data.ts!');
} else {
  console.log(`❌ Found ${totalMismatches} mismatches and ${totalMissing} missing dongs`);
}
