/**
 * Test parsing of the malformed summary section from 반포자이 document
 */

const summaryText = `3. (근)저당권 및 전세권 등 ( 을구 )
순위번호
등기목적
접수정보
주요등기사항
3
전세권설정
2014년1월15일 전세금 금 1,400,000,000원
제11740호 전세권자 유재왕
대상소유자
강규식 등
3-2
전세권변경
2018년1월22일 | 전세금 금1,900,000,000원
제11482호
강규식 등
8
전세권변경
25
근저당권설정
2022년2월9일
제18787호
2022년1월27일 | 전세금 금3,200,000,000원
제14713호
채권최고액 금1,534,000,000원
근저당권자 유한회사 우리이지론대부
강규식 등
강규식 등
25-2
근저당권이전
2023년11월27일 근저당권자 여해자산관리대부유한회사
제178910호
강규식 등`;

console.log('=== Testing 반포자이 Summary Section Parsing ===\n');

// Normalize like the parser does
const cleanedText = summaryText.replace(/\s+/g, ' ').trim();

// Pattern 2 for mortgages (from deunggibu-parser.ts line 176)
const mortgagePattern = /(\d+)(?:\s+\d+)*\s+근저당권설정\s+(?:\d+-\d+\s+근저당권이전\s+)?(?:[가-힣]{2,4}\s+)?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+((?:(?!채무자|대상소유자|\s+등(?:\s|$)|\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\d+-?\d*\s+질권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+채무자|\s+대상소유자|\s+등(?:\s|$)|\s+\d+\s+(?:[\d\s]+|[가-힣]{2,4}\s+)*근저당권|\s+\d+-?\d*\s+질권|\s+\d+\s+전세권|\s+\d+\s+임차권|출력일시|$)/gs;

console.log('🔍 Testing Mortgage Pattern 2:\n');
let match;
const mortgages: any[] = [];

while ((match = mortgagePattern.exec(cleanedText)) !== null) {
  console.log('Match found:', match[0].substring(0, 150) + '...');
  console.log(`  Priority: ${match[1]}`);
  console.log(`  Date: ${match[2]}-${match[3]}-${match[4]}`);
  console.log(`  Amount: ${match[5]}`);
  console.log(`  Creditor: ${match[6]}`);
  console.log('');

  mortgages.push({
    priority: parseInt(match[1]),
    date: `${match[2]}-${match[3]}-${match[4]}`,
    amount: parseInt(match[5].replace(/,/g, '').replace(/\s+/g, '')),
    creditor: match[6]
  });
}

console.log(`\n✅ Found ${mortgages.length} mortgage(s)`);
console.log(`Expected: 1 mortgage (#25)`);
console.log(`Detected: ${mortgages.map(m => `#${m.priority}`).join(', ') || 'NONE'}`);

if (mortgages.some(m => m.priority === 25)) {
  console.log('\n✅ Entry #25 FOUND');
} else {
  console.log('\n❌ Entry #25 MISSING - Pattern failed to match');
  console.log('\nDEBUG: Looking for "25" in cleaned text:');
  const lines = cleanedText.split('25');
  console.log(`Found ${lines.length - 1} occurrence(s) of "25"`);
  lines.slice(0, 2).forEach((part, i) => {
    if (i < lines.length - 1) {
      console.log(`\nContext around #${i + 1}:`);
      console.log('"...' + part.slice(-100) + '25' + lines[i + 1].slice(0, 200) + '..."');
    }
  });
}

// Test jeonse pattern
console.log('\n\n=== Testing Jeonse Change Pattern ===\n');

// The existing jeonse change pattern
const jeonseChangePattern = /(\d+)\s+\d*번?전세권변경\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일(?:[^금]*?)(?:전세금\s+금\s*([\d,\s]+)원|금\s*([\d,\s]+)원)/gs;

const jeonseRights: any[] = [];
while ((match = jeonseChangePattern.exec(cleanedText)) !== null) {
  console.log('Match found:', match[0].substring(0, 100));
  console.log(`  Priority: ${match[1]}`);
  console.log(`  Date: ${match[2]}-${match[3]}-${match[4]}`);
  console.log(`  Amount: ${match[5] || match[6]}`);
  console.log('');

  jeonseRights.push({
    priority: parseInt(match[1]),
    date: `${match[2]}-${match[3]}-${match[4]}`,
    amount: parseInt((match[5] || match[6]).replace(/,/g, '').replace(/\s+/g, ''))
  });
}

console.log(`\n✅ Found ${jeonseRights.length} jeonse change(s)`);
console.log(`Expected: Entry #3-2 and #8 (with #8 showing ₩3.2B)`);
console.log(`Detected: ${jeonseRights.map(j => `#${j.priority} (₩${(j.amount / 100000000).toFixed(1)}억)`).join(', ') || 'NONE'}`);

if (jeonseRights.some(j => j.priority === 8)) {
  const entry8 = jeonseRights.find(j => j.priority === 8);
  if (entry8 && entry8.amount === 3200000000) {
    console.log('\n✅ Entry #8 with ₩3.2억 FOUND');
  } else {
    console.log(`\n❌ Entry #8 found but wrong amount: ₩${entry8 ? (entry8.amount / 100000000).toFixed(1) : '?'}억`);
  }
} else {
  console.log('\n❌ Entry #8 MISSING');
}
