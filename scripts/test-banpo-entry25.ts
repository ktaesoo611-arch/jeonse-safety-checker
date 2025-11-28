/**
 * Test parsing of entry #25 from 반포자이 summary section
 */

// The actual summary section text from the OCR
const summaryText = `3. (근)저당권 및 전세권 등 ( 을구 )
순위번호 등기목적 접수정보 주요등기사항 대상소유자
3 전세권설정 2014년1월15일 제11740호 전세금 금 1,400,000,000원 전세권자 유재왕 강규식 등
3-2 전세권변경 2018년1월22일 제11482호 전세금 금1,900,000,000원 강규식 등
8 전세권변경 2022년1월27일 제14713호 전세금 금3,200,000,000원 강규식 등
25 근저당권설정 2022년2월9일 제18787호 채권최고액 금1,534,000,000원 근저당권자 유한회사 우리이지론대부 강규식 등
25-2 근저당권이전 2023년11월27일 제178910호 근저당권자 여해자산관리대부유한회사 강규식 등
25-3 근질권 2023년11월27일 제178911호 채권최고액 금1,534,000,000원 채권자 제이비우리캐피탈주식회사 강규식 등
27 근저당권설정 2022년3월25일 제44342호 채권최고액 금 130,000,000원 근저당권자 유한회사우리이지론대부 강규식 등
27-2 근저당권이전 2023년11월27일 제178912호 근저당권자 여해자산관리대부유한회사 강규식 등
27-3 근질권 2023년11월27일 제178913호 채권최고액 금 130,000,000원 채권자 제이비우리캐피탈주식회사 강규식 등
28 근저당권설정 2022년5월9일 제68005호 채권최고액 금130,000,000원 근저당권자 유한회사우리이지론대부 강규식 등
28-2 근저당권이전 2023년11월27일 제178914호 근저당권자 여해자산관리대부유한회사 강규식 등
28-3 근질권 2023년11월27일 제178915호 채권최고액 금 130,000,000원 채권자 제이비우리캐피탈주식회사 강규식 등
29 근저당권설정 2022년5월31일 제80280호 채권최고액 금455,000,000원 근저당권자 유한회사우리이지론대부 강규식 등
29-1 질권 2022년8월9일 제116510호 채권액 금221,000,000원 채권자 박서준 강규식 등
29-2 질권 2022년11월15일 제164822호 채권액 금 156,000,000원 채권자 장민수 강규식 등
29-4 질권 2023년10월30일 제163479호 채권액 금60,000,000원 채권자 오케이에프앤아이대부주식회사 강규식 등
30 근저당권설정 2022년9월20일 제135490호 채권최고액 금91,000,000원 근저당권자 유한회사우리이지론대부 강규식 등
30-1 질권 2022년9월26일 제138454호 채권액 금91,000,000원 채권자 주식회사행복의열매대부 강규식 등`;

console.log('=== Testing Entry #25 Detection ===\n');

// Normalize like the parser does
const cleanedText = summaryText.replace(/\s+/g, ' ').trim();
console.log('Cleaned text length:', cleanedText.length);
console.log('\nCleaned text:\n', cleanedText);
console.log('\n' + '='.repeat(80) + '\n');

// Pattern 2 from deunggibu-parser.ts (should match most summary entries)
const pattern2 = /(\d+)\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(?:[가-힣]{2,4}\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

let match;
const mortgages: any[] = [];

while ((match = pattern2.exec(cleanedText)) !== null) {
  const priority = parseInt(match[1]);
  const year = match[2];
  const month = match[3];
  const day = match[4];
  const amount = match[5].replace(/,/g, '').replace(/\s+/g, '');
  const creditor = match[6].trim();

  mortgages.push({ priority, year, month, day, amount, creditor });
  console.log(`Found #${priority}: ${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  console.log(`  Amount: ₩${parseInt(amount).toLocaleString('ko-KR')}`);
  console.log(`  Creditor: ${creditor}`);
  console.log('');
}

console.log('=== Summary ===');
console.log(`Expected: 5 mortgages (#25, #27, #28, #29, #30)`);
console.log(`Found: ${mortgages.length} mortgages`);
console.log(`Detected: ${mortgages.map(m => `#${m.priority}`).join(', ')}`);

if (mortgages.some(m => m.priority === 25)) {
  console.log('✅ Entry #25 FOUND');
} else {
  console.log('❌ Entry #25 MISSING');
}
