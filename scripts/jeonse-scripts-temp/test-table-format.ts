// Test table format with multi-line entries
// User's screenshot shows mortgages in a table with columns separated by |
// Format:
// 순위번호 | 등기목적 | 접수정보 | 주요등기사항 | 대상소유자
//   10    | 근저당권설정 | 2007년... | 채권최고액 금890,000,000원 | 박희자
//         |            |           | 근저당권자 주식회사국민은행 |

const tableSummary = `3. (근)저당권 및 전세권 등 ( 을구 )

순위번호 등기목적 접수정보 주요등기사항 대상소유자
10 근저당권설정 2007년7월25일 채권최고액 금890,000,000원 박희자
제35508호 근저당권자 주식회사국민은행
10-3 근저당권변경 2019년6월13일 채권최고액 금272,510,000원 박희자
제86908호
10-4 근저당권변경 2022년10월17일 채권최고액 금224,510,000원 박희자
제125737호
21 근저당권설정 2021년12월23일 채권최고액 금112,000,000원 박희자
제203061호 근저당권자 나눔파트너스대부주식회사
21-1 질권 2022년1월5일 채권액 금96,000,000원 박희자
제983호 채권자 메리츠캐피탈주식회사
22 근저당권설정 2022년1월3일 채권최고액 금1,008,000,000원 박희자
제203호 근저당권자 나눔파트너스대부주식회사
22-1 질권 2022년1월6일 채권액 금864,000,000원 박희자
제1588호 채권자 메리츠캐피탈주식회사`;

console.log('Testing table format mortgage parsing...\n');
console.log('='.repeat(80));
console.log('\nDocument format: Table with multi-line entries');
console.log('Expected mortgages: #10, #21, #22 (근저당권설정)');
console.log('Expected amendments: #10-3, #10-4 (근저당권변경)');
console.log('Expected liens: #21-1, #22-1 (질권)');
console.log('\n='.repeat(80));

// Pattern 1: Standard inline format (won't work for multi-line)
const pattern1 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+-?\d*\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+-?\d*\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('\nTEST 1: Current Pattern (expects inline format)');
console.log('-'.repeat(80));

let matches1 = 0;
let match1;
while ((match1 = pattern1.exec(tableSummary)) !== null) {
  matches1++;
  console.log(`Match ${matches1}: #${match1[1]} - ${match1[2]}-${match1[3]}-${match1[4]} - ₩${match1[5]} - "${match1[6]}"`);
}

if (matches1 === 0) {
  console.log('❌ No matches found (expected - multi-line format not supported)');
}

// Pattern 2: Multi-line table format
// Allow newlines between 채권최고액 and 근저당권자
const pattern2 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[\s\S]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|[\r\n]\d+-?\d*\s+근저당권|[\r\n]\d+-?\d*\s+질권|[\r\n]\d+\s+근저당권|[\r\n]\d+\s+질권|[\r\n]\d+\s+전세권|[\r\n]\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|[\r\n]\d+-?\d*\s+근저당권|[\r\n]\d+-?\d*\s+질권|[\r\n]\d+\s+근저당권|[\r\n]\d+\s+질권|[\r\n]\d+\s+전세권|[\r\n]\d+\s+임차권|출력일시|$)/gs;

console.log('\n\nTEST 2: Multi-line Pattern (allows \\s\\S between keywords)');
console.log('-'.repeat(80));

let matches2 = 0;
let match2;
while ((match2 = pattern2.exec(tableSummary)) !== null) {
  matches2++;
  const creditor = match2[6].replace(/제\d+호/g, '').replace(/\d{6}-\*+/g, '').replace(/\s+/g, ' ').trim();
  console.log(`✅ Match ${matches2}: #${match2[1]} - ${match2[2]}-${match2[3]}-${match2[4]} - ₩${match2[5].replace(/,/g, '').replace(/\s+/g, '')} - "${creditor}"`);
}

console.log(`\nTotal matches: ${matches2}/3 expected`);

console.log('\n' + '='.repeat(80));
console.log('\nDIAGNOSIS:');
console.log('The current patterns expect inline format:');
console.log('  "...채권최고액 금XXX원 근저당권자 YYY..."');
console.log('\nBut table format has multi-line entries:');
console.log('  "...채권최고액 금XXX원"');
console.log('  "제12345호 근저당권자 YYY..."');
console.log('\nFIX NEEDED:');
console.log('Use [\\s\\S]*? instead of [^근]*? to allow newlines between keywords');
