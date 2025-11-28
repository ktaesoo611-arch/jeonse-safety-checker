// Test 아남1 mortgage format - amount AFTER creditor name!
// Issue: Mortgages #10 and #21 not being extracted

const summaryText = `순위번호 등기목적 접수정보 주요등기사항 10 근저당권설정 2007년7월25일 채권최고액 제35508호 근저당권자 금390,000,000원 대상소유자 박희자 주식회사국민은행 10-3 근저당권변경 2019년6월13일 채권최고액 금272,510,000원 제86908호 박희자 10-4 근저당권변경 2022년 10월 17일 채권최고액 금224,510,000원 제125737호 박희자 21 근저당권설정 2021년12월23일 채권최고액 제203061호 근저당권자 나눔파트너스대부주식회사 금112,000,000원 박희자 21-1 질권 2022년 1월5일 제983호 채권액 금96,000,000원 박희자 채권자 메리츠캐피탈주식회사 22 22 근저당권설정 2022년 1월3일 제203호 채권최고액 금1,008,000,000원 박희자 근저당권자 나눔파트너스대부주식회사`;

console.log('Testing 아남1 document mortgage format...\n');
console.log('WEIRD FORMAT: Amount comes AFTER creditor name!\n');
console.log('Expected to find:');
console.log('- #10: ₩390,000,000 from 주식회사국민은행 (2007-07-25)');
console.log('- #21: ₩112,000,000 from 나눔파트너스대부주식회사 (2021-12-23)');
console.log('- #22: ₩1,008,000,000 from 나눔파트너스대부주식회사 (2022-01-03)');
console.log('\n' + '='.repeat(80) + '\n');

// Current pattern (expects amount BEFORE creditor)
const currentPattern = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('TEST 1: Current Pattern (amount BEFORE creditor)');
console.log('-'.repeat(80));

let count1 = 0;
let match1;
while ((match1 = currentPattern.exec(summaryText)) !== null) {
  count1++;
  console.log(`Match ${count1}: #${match1[1]} - ${match1[2]}-${match1[3]}-${match1[4]} - ₩${match1[5]} - "${match1[6]}"`);
}

console.log(`\nTotal: ${count1}/3 expected (FAIL!)\n`);

// NEW pattern for mortgage #10 format:
// "채권최고액 제XXX호 근저당권자 금XXX원 대상소유자 NAME CREDITOR"
// Creditor name comes AFTER owner name!

const newPattern1 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^근]*?채권최고액\s+제\d+호\s+근저당권자\s+금\s*([\d,\s]+)원\s+대상소유자\s+[가-힣]+\s+((?:(?!채무자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+근저당권|\d+\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+근저당권|\s+\d+\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('\nTEST 2: NEW Pattern #1 (format: "근저당권자 금XXX원 대상소유자 NAME CREDITOR")');
console.log('-'.repeat(80));

let count2 = 0;
let match2;
while ((match2 = newPattern1.exec(summaryText)) !== null) {
  count2++;
  const amount = match2[5].replace(/,/g, '').replace(/\s+/g, '');
  const creditor = match2[6].replace(/\s+/g, ' ').trim();
  console.log(`✅ Match ${count2}: #${match2[1]} - ${match2[2]}-${match2[3]}-${match2[4]} - ₩${amount} - "${creditor}"`);
}

console.log(`\nTotal: ${count2}/3 expected (should get #10)`);

// NEW pattern for mortgage #21 format:
// "채권최고액 제XXX호 근저당권자 CREDITOR 금XXX원"
// Creditor comes first, then amount
const newPattern2 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^근]*?채권최고액\s+제\d+호\s+근저당권자\s+((?:(?!금\d|채무자|대상소유자|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+근저당권|\d+\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)\s+금\s*([\d,\s]+)원/gs;

console.log('\n\nTEST 3: NEW Pattern #2 (format: "근저당권자 CREDITOR 금XXX원")');
console.log('-'.repeat(80));

let count3 = 0;
let match3;
while ((match3 = newPattern2.exec(summaryText)) !== null) {
  count3++;
  const creditor = match3[5].replace(/\s+/g, ' ').trim();
  const amount = match3[6].replace(/,/g, '').replace(/\s+/g, '');
  console.log(`✅ Match ${count3}: #${match3[1]} - ${match3[2]}-${match3[3]}-${match3[4]} - ₩${amount} - "${creditor}"`);
}

console.log(`\nTotal: ${count3}/3 expected (should get #21)`);

console.log('\n' + '='.repeat(80));
console.log('\nDIAGNOSIS:');
console.log('아남1 document has THREE different formats!');
console.log('\n1. Standard format (#22 - already working):');
console.log('   "채권최고액 금1,008,000,000원 ... 근저당권자 나눔파트너스대부주식회사"');
console.log('\n2. Amount after 근저당권자, creditor after owner (#10):');
console.log('   "채권최고액 제35508호 근저당권자 금390,000,000원 대상소유자 박희자 주식회사국민은행"');
console.log('   Amount: ₩390,000,000');
console.log('   Owner: 박희자');
console.log('   Creditor: 주식회사국민은행');
console.log('\n3. Creditor before amount (#21):');
console.log('   "채권최고액 제203061호 근저당권자 나눔파트너스대부주식회사 금112,000,000원"');
console.log('   Creditor: 나눔파트너스대부주식회사');
console.log('   Amount: ₩112,000,000');
console.log('\nFIX NEEDED:');
console.log('Add TWO new patterns to handle these reversed formats!');
