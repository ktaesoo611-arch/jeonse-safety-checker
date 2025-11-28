/**
 * Test parsing of 반포자이 summary section
 * Based on the visible summary entries from the PDF
 */

// Sample summary text (cleaned) from the 반포자이 document
const sampleSummaryText = `3. (근)저당권 및 전세권 등( 을구 ) 순위번호 등기목적 접수정보 주요등기사항 대상소유자 3 전세권설정 2018년10월1일 전세금 금1,400,000,000원 전세권자 김성민 25 근저당권설정 2013년3월13일 채권최고액 금1,534,000,000원 근저당권자 신한은행 27 근저당권설정 2016년7월20일 채권최고액 금130,000,000원 근저당권자 서울보증보험 28 근저당권설정 2017년2월24일 채권최고액 금130,000,000원 근저당권자 서울보증보험 29 근저당권설정 2020년8월27일 채권최고액 금455,000,000원 근저당권자 한국주택금융공사 30 근저당권설정 2021년4월9일 채권최고액 금91,000,000원 근저당권자 서울보증보험 출력일시 : 2024년 11월 25일 16시 17분 11초`;

// Apply cleanText() normalization
const cleanedText = sampleSummaryText.replace(/\s+/g, ' ').trim();

console.log('=== Testing 반포자이 Document Parsing ===\n');
console.log('Cleaned text length:', cleanedText.length);
console.log('');

// Pattern 2 from deunggibu-parser.ts (the FIXED one)
const pattern2 = /(\d+)(?:\s+\d+)*\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(?:[가-힣]{2,4}\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

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
}

console.log(`Found ${mortgages.length} mortgages using Pattern 2:\n`);
mortgages.forEach(m => {
  console.log(`  #${m.priority}: ${m.year}-${m.month.padStart(2, '0')}-${m.day.padStart(2, '0')}`);
  console.log(`    Amount: ₩${parseInt(m.amount).toLocaleString('ko-KR')}`);
  console.log(`    Creditor: ${m.creditor}`);
  console.log('');
});

// Now test jeonse rights pattern
console.log('=== Testing 전세권 Parsing ===\n');

const jeonsePattern = /(\d+)\s+전세권설정\s+(?:[가-힣]{2,4}\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?전세금\s+금\s*([\d,\s]+)원[^전]*?전세권자\s+((?:(?!순위번호|등기|채무자|대상소유자|\s+등(?:\s|$)|\d+\s+근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=순위번호|등기|채무자|대상소유자|\s+등(?:\s|$)|\s+\d+\s+근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

const jeonseRights: any[] = [];

while ((match = jeonsePattern.exec(cleanedText)) !== null) {
  const priority = parseInt(match[1]);
  const year = match[2];
  const month = match[3];
  const day = match[4];
  const amount = match[5].replace(/,/g, '').replace(/\s+/g, '');
  const lessee = match[6].trim();

  jeonseRights.push({ priority, year, month, day, amount, lessee });
}

console.log(`Found ${jeonseRights.length} jeonse rights:\n`);
jeonseRights.forEach(j => {
  console.log(`  #${j.priority}: ${j.year}-${j.month.padStart(2, '0')}-${j.day.padStart(2, '0')}`);
  console.log(`    Amount: ₩${parseInt(j.amount).toLocaleString('ko-KR')}`);
  console.log(`    Lessee: ${j.lessee}`);
  console.log('');
});

console.log('\n=== Summary ===');
console.log(`Expected: 5 mortgages (#25, #27, #28, #29, #30) + 1 jeonse (#3)`);
console.log(`Got: ${mortgages.length} mortgages + ${jeonseRights.length} jeonse`);

if (mortgages.length === 5 && jeonseRights.length === 1) {
  console.log('✅ SUCCESS: All entries detected correctly!');
} else {
  console.log('❌ FAILURE: Not all entries detected');
  console.log('');
  console.log('Expected mortgages: #25, #27, #28, #29, #30');
  console.log(`Got mortgages: ${mortgages.map(m => `#${m.priority}`).join(', ') || 'none'}`);
  console.log('');
  console.log('Expected jeonse: #3');
  console.log(`Got jeonse: ${jeonseRights.map(j => `#${j.priority}`).join(', ') || 'none'}`);
}
