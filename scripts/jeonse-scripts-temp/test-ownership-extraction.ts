/**
 * Test Ownership Extraction
 *
 * This script tests the ownership extraction logic to verify
 * it correctly identifies co-ownership (공동소유) scenarios.
 */

// Sample OCR text from a property registry with shared ownership
const sampleText = `
주요 등기사항 요약 (참고용)

1. 소유권에 관한 사항

순위번호 등기목적 접수정보 주요등기사항 대상소유자

1 소유권이전 2016년4월26일 제29001호 소유자 김선희 지분 2분의1

2 소유권이전 2016년4월26일 제29002호 소유자 김선회 지분 2분의1

2. 소유지분을 제외한 소유권에 관한 사항 ( 갑구 )

해당사항 없음
`;

// Test the pattern
console.log('Testing pattern: /1\\s*\\.\\s*소유권에\\s*관한\\s*사항/');
console.log('Sample text includes "1. 소유권에 관한 사항":', sampleText.includes('1. 소유권에 관한 사항'));

const summarySectionMatch = sampleText.match(/1\s*\.\s*소유권에\s*관한\s*사항(.*?)(?:2\s*\.\s*소유지분을\s*제외한|$)/s);

if (summarySectionMatch) {
  console.log('✅ Found summary section');
  const summarySection = summarySectionMatch[1];
  console.log('Summary section content:');
  console.log(summarySection);
  console.log('\n--- Testing ownership pattern ---\n');

  const sharePattern = /(\d+)\s+소유권이전\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?소유자\s+([가-힣]+).*?지분\s+(\d+)\s*분의\s*(\d+)/gs;

  let shareMatch;
  const owners = [];
  while ((shareMatch = sharePattern.exec(summarySection)) !== null) {
    const [, priority, year, month, day, name, denominator, numerator] = shareMatch;
    const percentage = (parseInt(numerator) / parseInt(denominator)) * 100;

    owners.push({
      priority,
      name: name.trim(),
      percentage,
      date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    });

    console.log(`✅ Found owner #${priority}: ${name.trim()} (${percentage}%)`);
  }

  if (owners.length > 1) {
    console.log(`\n🎯 Detected ${owners.length} co-owners (공동소유):`);
    owners.forEach(o => console.log(`   - ${o.name}: ${o.percentage}%`));
  } else if (owners.length === 1) {
    console.log('\n⚠️  Only found 1 owner - no co-ownership');
  } else {
    console.log('\n❌ No owners found - pattern may need adjustment');
  }
} else {
  console.log('❌ Summary section not found');
}
