// Test document with auction in Section 2 but NO provisional registration (가등기)
// User's screenshot shows:
// - Section 2: Has "임의경매개시결정" (auction) from 2020
// - Section 2: NO "가등기" mentioned
// - Section 3: Shows "- 기록사항 없음"
// But system was reporting hasProvisionalRegistration: true (WRONG!)

const summaryDocument = `주요 등기사항 요약 (참고용)
[주 의 사 항 ]
본 주요 등기사항 요약은 증명서상에 말소되지 않은 사항을 간략히 요약한 것으로 증명서로서의 기능을 제공하지 않습니다.

고유번호 XXXX-XXXX-XXXXXX
[집합건물]서울특별시 XX구 XX동 XXX

1. 소유지분현황 ( 갑구 )

등기명의인 (주민)등록번호 최종지분 주 소 순위번호
박희순 550909-******* 1분의 1 경기도 파주시 조리읍 삼릉로 32 (조리읍) 1

2. 소유지분을 제외한 소유권에 관한 사항 ( 갑구 )

순위번호 등기목적 접수정보 주요등기사항 대상소유자
1 임의경매개시결정 2020년 01월 15일 채권자 XX금융회사 박희순
제12345호

3. (근)저당권 및 전세권 등( 을구 )
- 기록사항 없음

[참고 사 항 ]
가. 등기기록에서 유효한 지분을 가진 소유자 혹은 공유자 현황을 가나다 순으로 표시합니다.
나. 최종지분은 등기명의인이 가진 최종지분이며, 2개 이상의 순위번호에 지분을 가진 경우 그 지분을 합산하였습니다.`;

console.log('Testing document with auction but NO provisional registration...\n');
console.log('='.repeat(80));

// Extract Section 2
const section2Pattern = /2\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\.\s*\(근\)저당권|$)/s;
const section2Match = summaryDocument.match(section2Pattern);

console.log('\nTEST 1: Section 2 Extraction');
console.log('-'.repeat(80));

if (section2Match) {
  const section2Content = section2Match[1];
  console.log('✅ Section 2 extracted successfully');
  console.log(`Content: "${section2Content.trim()}"\n`);

  // Check for key terms
  const hasNoRecords = /[-\s]*기록사항\s*없음/.test(section2Content);
  const hasAuction = /경매개시결정/.test(section2Content);
  const hasProvisionalReg = /가등기/.test(section2Content);

  console.log(`Has "기록사항 없음": ${hasNoRecords ? '✅ YES' : '❌ NO'}`);
  console.log(`Has "경매개시결정" (auction): ${hasAuction ? '✅ YES' : '❌ NO'}`);
  console.log(`Has "가등기" (provisional reg): ${hasProvisionalReg ? '❌ YES (WRONG!)' : '✅ NO (correct!)'}`);

  // Test the actual logic
  let result: boolean;
  if (hasNoRecords) {
    result = false;
    console.log('\n✅ Logic: "기록사항 없음" found → return false');
  } else {
    result = hasProvisionalReg;
    console.log(`\n${hasProvisionalReg ? '❌' : '✅'} Logic: Check for "가등기" in section → return ${result}`);
  }

  console.log(`\nExpected hasProvisionalRegistration: false`);
  console.log(`Actual result: ${result}`);
  console.log(result === false ? '✅✅ CORRECT!' : '❌❌ WRONG!');
} else {
  console.log('❌ Section 2 NOT extracted');
  console.log('This would fall back to checking entire document...');

  const hasProvisionalRegInDocument = /가등기/.test(summaryDocument);
  console.log(`\nFallback: Check "가등기" in entire document: ${hasProvisionalRegInDocument}`);
}

// Check if "가등기" appears anywhere in the document
console.log('\n\nTEST 2: Search for "가등기" in entire document');
console.log('-'.repeat(80));

const entireDocSearch = summaryDocument.match(/가등기/g);
if (entireDocSearch) {
  console.log(`❌ Found "${가등기}" ${entireDocSearch.length} time(s) in document`);

  // Find context
  const contextPattern = /.{0,30}가등기.{0,30}/g;
  const contexts = summaryDocument.match(contextPattern);
  contexts?.forEach((ctx, i) => {
    console.log(`  [${i+1}] "${ctx}"`);
  });
} else {
  console.log('✅ "가등기" NOT found anywhere in document (correct!)');
}

console.log('\n' + '='.repeat(80));
console.log('\nCONCLUSION:');
console.log('For this document:');
console.log('- Section 2 has auction record (임의경매개시결정)');
console.log('- Section 2 does NOT have "기록사항 없음"');
console.log('- Section 2 does NOT mention "가등기" anywhere');
console.log('- Section 3 shows "기록사항 없음" (no mortgages)');
console.log('\nExpected behavior:');
console.log('- hasAuction: true ✅');
console.log('- hasProvisionalRegistration: false ✅');
console.log('- mortgages: [] ✅');
