/**
 * Test script to verify mortgage amendment grouping and application
 * This simulates the logic in applyMortgageAmendments()
 */

// Sample text from the user's document
const sampleText = `
10 근저당권설정 2007년7월25일 채권최고액 금390,000,000원 근저당권자 주식회사우리은행
10-3 근저당권변경 박희자 2019년6월13일 채권최고액 금272,510,000원
10-4 근저당권변경 박희자 2022년10월17일 채권최고액 금224,510,000원
21 근저당권설정 2022년10월17일 채권최고액 금840,000,000원 근저당권자 주식회사신한은행
21-1 근저당권변경 2023년4월11일 채권최고액 금900,000,000원
22 근저당권설정 2023년4월11일 채권최고액 금450,000,000원 근저당권자 주식회사신한은행
22-1 근저당권변경 2023년4월11일 채권최고액 금450,000,000원
`;

console.log('Testing mortgage amendment grouping and application...\n');

// Simulate initial mortgages map
interface MortgageInfo {
  priority: number;
  maxSecuredAmount: number;
  creditor: string;
}

const mortgagesMap = new Map<number, MortgageInfo>();

// Extract base mortgages first (근저당권설정)
const basePattern = /(\d+)\s+근저당권설정\s+(\d{4})년(\d{1,2})월(\d{1,2})일\s+채권최고액\s+금([\d,]+)원\s+근저당권자\s+([^\n]+)/g;
let match;

console.log('=== STEP 1: Extract base mortgages ===\n');

while ((match = basePattern.exec(sampleText)) !== null) {
  const [, priorityStr, year, month, day, amountStr, creditor] = match;
  const priority = parseInt(priorityStr);
  const amount = parseInt(amountStr.replace(/,/g, ''));

  mortgagesMap.set(priority, {
    priority,
    maxSecuredAmount: amount,
    creditor: creditor.trim()
  });

  console.log(`  Mortgage #${priority}: ₩${amount.toLocaleString('ko-KR')} from ${creditor.trim()}`);
}

// Apply amendments
const amendmentPattern = /(\d+)-(\d+)\s+근저당권변경\s+[^\d]*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?채권최고액\s+금\s*([\d,\s]+)원/gs;

console.log('\n=== STEP 2: Group amendments by parent ===\n');

const amendmentsByParent = new Map<number, Array<{subNumber: number, amount: number, date: string}>>();

while ((match = amendmentPattern.exec(sampleText)) !== null) {
  const [, parentStr, subStr, year, month, day, amountStr] = match;
  const parent = parseInt(parentStr);
  const sub = parseInt(subStr);
  const amount = parseInt(amountStr.replace(/,/g, '').replace(/\s+/g, ''));
  const date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

  if (!amendmentsByParent.has(parent)) {
    amendmentsByParent.set(parent, []);
  }
  amendmentsByParent.get(parent)!.push({ subNumber: sub, amount, date });

  console.log(`  Found amendment: ${parent}-${sub} → ₩${amount.toLocaleString('ko-KR')} (${date})`);
}

console.log('\n=== STEP 3: Apply most recent amendment for each parent ===\n');

for (const [parent, amendments] of amendmentsByParent.entries()) {
  amendments.sort((a, b) => b.subNumber - a.subNumber);
  const mostRecent = amendments[0];

  const mortgage = mortgagesMap.get(parent);
  if (mortgage) {
    const oldAmount = mortgage.maxSecuredAmount;
    mortgage.maxSecuredAmount = mostRecent.amount;
    console.log(`  ✅ Updated mortgage #${parent}: ₩${oldAmount.toLocaleString('ko-KR')} → ₩${mostRecent.amount.toLocaleString('ko-KR')}`);
    if (amendments.length > 1) {
      console.log(`     (${amendments.length} amendments found, using most recent: ${parent}-${mostRecent.subNumber})`);
    }
  }
}

console.log('\n=== FINAL MORTGAGE AMOUNTS ===\n');

let totalDebt = 0;
for (const [priority, mortgage] of mortgagesMap.entries()) {
  console.log(`  Mortgage #${priority}: ₩${mortgage.maxSecuredAmount.toLocaleString('ko-KR')} - ${mortgage.creditor}`);
  totalDebt += mortgage.maxSecuredAmount;
}

console.log(`\n  Total Debt: ₩${totalDebt.toLocaleString('ko-KR')}`);
console.log(`  Total (억): ₩${(totalDebt / 100000000).toFixed(2)}억`);

console.log('\n=== EXPECTED RESULTS ===');
console.log('  Mortgage #10: ₩224,510,000 (updated from ₩390,000,000 by 10-4)');
console.log('  Mortgage #21: ₩900,000,000 (updated from ₩840,000,000 by 21-1)');
console.log('  Mortgage #22: ₩450,000,000 (no change from 22-1 as amounts match)');
console.log('  Total: ₩1,574,510,000 (₩15.75억)');

const expectedTotal = 224510000 + 900000000 + 450000000;
if (totalDebt === expectedTotal) {
  console.log('\n✅ SUCCESS: All amendments applied correctly!');
} else {
  console.log(`\n❌ FAILURE: Expected ₩${expectedTotal.toLocaleString('ko-KR')}, got ₩${totalDebt.toLocaleString('ko-KR')}`);
}
