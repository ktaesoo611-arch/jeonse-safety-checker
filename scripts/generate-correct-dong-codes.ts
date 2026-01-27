/**
 * Generate correct SEOUL_DONG_CODES from address-data.ts
 * This script outputs the correct dong codes that should be in address-parser.ts
 */

import { SEOUL_DISTRICTS } from '../lib/data/address-data';

console.log('const SEOUL_DONG_CODES: Record<string, Record<string, string>> = {');

for (const district of SEOUL_DISTRICTS) {
  console.log(`  '${district.name}': {`);

  // Create a map to deduplicate dongs with same code
  const dongMap = new Map<string, string>();
  for (const dong of district.dongs) {
    // Only add basic dong names (not numbered sub-dongs like 번1동, 수유1동)
    // unless it's a "X가" style name which is official
    dongMap.set(dong.name, dong.code);
  }

  const entries = Array.from(dongMap.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ko'));
  for (const [name, code] of entries) {
    console.log(`    '${name}': '${code}',`);
  }

  console.log('  },');
}

console.log('};');
