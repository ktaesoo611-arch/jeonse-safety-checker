/**
 * Test Co-owner Extraction Pattern
 *
 * This script tests the co-owner extraction pattern for 텐즈힐 format
 * with table-based ownership structure (공유자).
 */

// Sample OCR text from 텐즈힐 property registry with co-ownership
const sampleText = `
주요 등기사항 요약 (참고용)

1. 소유자분현황 ( 갑구 )

등기명의인         (주민)등록번호      2분의 1
강윤지 (공유자)    880416-*******     2분의 1    (50%, 107동 2204호 마강동,마장동엘마파트)
김도현 (공유자)    880825-*******     2분의 1    (50%, 107동 2204호 마강동,마장동엘마파트)

2. 소유지분을 제외한 소유권에 관한 사항 ( 갑구 )

해당사항 없음
`;

console.log('Testing co-owner extraction for 텐즈힐...\n');

// Test the section match
const ownerStatusMatch = sampleText.match(/1\s*\.\s*소유자분현황\s*\(\s*갑\s*구\s*\)(.*?)(?:2\s*\.\s*소유지분을\s*제외한|$)/s);

if (ownerStatusMatch) {
  console.log('✅ Found "1. 소유자분현황 ( 갑구 )" section');
  const ownerStatusSection = ownerStatusMatch[1];

  console.log('\nSection content:');
  console.log(ownerStatusSection);
  console.log('\n--- Testing co-owner pattern ---\n');

  // Pattern for co-owner table format
  const coOwnerPattern = /([가-힣]+)\s*\(공유자\).*?(\d+)\s*분의\s*(\d+)/gs;

  const owners = [];
  let coOwnerMatch;

  while ((coOwnerMatch = coOwnerPattern.exec(ownerStatusSection)) !== null) {
    const [, name, denominator, numerator] = coOwnerMatch;
    const percentage = (parseInt(numerator) / parseInt(denominator)) * 100;

    owners.push({
      name: name.trim(),
      percentage,
      share: `${numerator}/${denominator}`
    });

    console.log(`✅ Found co-owner: ${name.trim()}`);
    console.log(`   Share: ${numerator}분의${denominator} (${percentage}%)`);
  }

  if (owners.length > 1) {
    console.log(`\n🎯 SUCCESS! Detected ${owners.length} co-owners (공동소유):`);
    owners.forEach(o => console.log(`   - ${o.name}: ${o.percentage}% (${o.share})`));
    console.log('\n✅ This should trigger the shared ownership warning!');
  } else if (owners.length === 1) {
    console.log('\n⚠️  Only found 1 owner - no co-ownership');
  } else {
    console.log('\n❌ No owners found - pattern needs adjustment');
  }
} else {
  console.log('❌ "1. 소유자분현황 ( 갑구 )" section not found');
  console.log('This format may not be present in this document');
}
