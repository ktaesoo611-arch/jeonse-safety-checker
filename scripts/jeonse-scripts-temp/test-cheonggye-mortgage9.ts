// Test 청계한신휴플러스 mortgage #9 - duplicate owner name issue
// Raw: "김선회 김선회 주식회사오케이저축은행"
// Expected: "주식회사오케이저축은행"

const creditorRaw = "김선회 김선회 주식회사오케이저축은행";

console.log('Testing 청계한신휴플러스 mortgage #9...\n');
console.log(`Raw creditor: "${creditorRaw}"`);
console.log(`Expected: "주식회사오케이저축은행"\n`);
console.log('='.repeat(80));

// Current cleaning logic
let creditor = creditorRaw
  .replace(/제\d+호/g, '')
  .replace(/\d{6}-\*+/g, '')
  .replace(/\s+/g, ' ')
  .trim();

console.log(`\nAfter basic cleaning: "${creditor}"`);

// Current leading name removal (removes ONE leading name)
if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
  const before = creditor;
  creditor = creditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
  console.log(`After first leading name removal: "${creditor}" (was "${before}")`);
}

// Try again?
if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
  const before = creditor;
  creditor = creditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
  console.log(`After second leading name removal: "${creditor}" (was "${before}")`);
}

// Remove names after corporate keywords
if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(creditor)) {
  creditor = creditor.replace(/(은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사)\s+[가-힣]{2,4}(?=\s|$)/g, '$1').trim();
}

// Remove trailing names
let prevCreditor;
do {
  prevCreditor = creditor;
  creditor = creditor.replace(/\s+[가-힣]{2,4}$/, '').trim();
} while (creditor !== prevCreditor && creditor.length > 0);

console.log(`\nFinal result: "${creditor}"`);

if (creditor === '주식회사오케이저축은행') {
  console.log('\n✅✅ SUCCESS! Creditor correctly extracted!');
} else {
  console.log(`\n❌ FAILED! Expected "주식회사오케이저축은행" but got "${creditor}"`);

  console.log('\n' + '='.repeat(80));
  console.log('\nSOLUTION: Need to LOOP the leading name removal like we do for trailing names!');
  console.log('Currently we only remove ONE leading name, but there could be multiple.\n');

  // Test the fix
  console.log('Testing with LOOP for leading names:');
  let fixedCreditor = creditorRaw
    .replace(/제\d+호/g, '')
    .replace(/\d{6}-\*+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // LOOP to remove ALL leading names
  let prevFixed;
  do {
    prevFixed = fixedCreditor;
    if (/은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사/.test(fixedCreditor)) {
      fixedCreditor = fixedCreditor.replace(/^[가-힣]{2,4}\s+(?=.*?(?:은행|주식회사|대부|저축은행|캐피탈|보험|금융|공사))/, '').trim();
    }
  } while (fixedCreditor !== prevFixed && fixedCreditor.length > 0);

  console.log(`  After looped leading name removal: "${fixedCreditor}"`);

  if (fixedCreditor === '주식회사오케이저축은행') {
    console.log('\n  ✅✅✅ FIXED! Loop solution works!');
  }
}
