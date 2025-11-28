// Test handling of "기록사항 없음" (No Records) in summary sections
// Issue: System reports provisional registration exists, but document shows "기록사항 없음"

const summaryWithNoRecords = `주요 등기사항 요약 (참고용)
[주 의 사 항 ]
본 주요 등기사항 요약은 증명서상에 말소되지 않은 사항을 간략히 요약한 것으로 증명서로서의 기능을 제공하지 않습니다.

1. 소유지분현황 ( 갑구 )

등기명의인 (주민)등록번호 최종지분 주 소 순위번호
박희순 550909-******* 1분의 1 경기도 파주시 조리읍 삼릉로 32 (조리읍) 1

2. 소유지분을 제외한 소유권에 관한 사항 ( 갑구 )
-기록사항 없음

3. (근)저당권 및 전세권 등( 을구 )
- 기록사항 없음

[참고 사 항 ]`;

console.log('Testing "기록사항 없음" (No Records) handling...\n');
console.log('='.repeat(80));
console.log('\nDocument format: Summary-only with "기록사항 없음" in sections 2 and 3\n');

// Test Section 2 extraction (provisional registration check)
console.log('TEST 1: Section 2 (갑구) - Provisional Registration Check');
console.log('-'.repeat(80));

const section2Pattern = /2\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\.\s*\(근\)저당권|$)/s;
const section2Match = summaryWithNoRecords.match(section2Pattern);

if (section2Match) {
  const section2Content = section2Match[1];
  console.log(`✅ Section 2 extracted: "${section2Content.trim()}"`);

  const hasNoRecords = /[-\s]*기록사항\s*없음/.test(section2Content);
  console.log(`\nContains "기록사항 없음": ${hasNoRecords ? '✅ YES' : '❌ NO'}`);

  const hasProvisionalReg = /가등기/.test(section2Content);
  console.log(`Contains "가등기": ${hasProvisionalReg ? '❌ YES (wrong!)' : '✅ NO (correct!)'}`);

  if (hasNoRecords && !hasProvisionalReg) {
    console.log('\n✅✅ CORRECT: Should return hasProvisionalRegistration = false');
  } else {
    console.log('\n❌ FAILED: Should detect "기록사항 없음" and return false');
  }
} else {
  console.log('❌ Section 2 NOT extracted');
}

// Test Section 3 extraction (mortgages)
console.log('\n\nTEST 2: Section 3 (을구) - Mortgage Extraction');
console.log('-'.repeat(80));

const section3Pattern = /3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)(.*?)(?:11\s+임차권설정|\[?\s*참\s*고\s*사\s*항\s*\]?|$)/s;
const section3Match = summaryWithNoRecords.match(section3Pattern);

if (section3Match) {
  const section3Content = section3Match[1];
  console.log(`✅ Section 3 extracted: "${section3Content.trim()}"`);

  const hasNoRecords = /[-\s]*기록사항\s*없음/.test(section3Content);
  console.log(`\nContains "기록사항 없음": ${hasNoRecords ? '✅ YES' : '❌ NO'}`);

  const hasMortgages = /\d+\s+근저당권설정/.test(section3Content);
  console.log(`Contains mortgage entries: ${hasMortgages ? '❌ YES (wrong!)' : '✅ NO (correct!)'}`);

  if (hasNoRecords && !hasMortgages) {
    console.log('\n✅✅ CORRECT: Should return empty mortgages array []');
  } else {
    console.log('\n❌ FAILED: Should detect "기록사항 없음" and return empty array');
  }
} else {
  console.log('❌ Section 3 NOT extracted');
}

// Test Section 2 checks (seizure, provisional seizure, auction)
console.log('\n\nTEST 3: Additional Section 2 Checks');
console.log('-'.repeat(80));

if (section2Match) {
  const section2Content = section2Match[1];
  const hasNoRecords = /[-\s]*기록사항\s*없음/.test(section2Content);

  console.log(`Section 2 content: "${section2Content.trim()}"`);
  console.log(`\nHas "기록사항 없음": ${hasNoRecords ? '✅ YES' : '❌ NO'}`);

  // Test all section 2 checks
  const checks = {
    'hasSeizure (압류)': /(?<!가)압류/.test(section2Content),
    'hasProvisionalSeizure (가압류)': /가압류/.test(section2Content),
    'hasAuction (경매개시결정)': /경매개시결정/.test(section2Content),
    'hasProvisionalRegistration (가등기)': /가등기/.test(section2Content)
  };

  console.log('\nChecks with "기록사항 없음":');
  Object.entries(checks).forEach(([name, result]) => {
    const expected = false; // All should be false when "기록사항 없음" is present
    const status = (!hasNoRecords || result === expected) ? '✅' : '❌';
    console.log(`  ${status} ${name}: ${result} (expected: ${expected})`);
  });

  if (hasNoRecords && Object.values(checks).every(v => v === false)) {
    console.log('\n✅✅ CORRECT: All section 2 checks return false when "기록사항 없음"');
  } else if (!hasNoRecords) {
    console.log('\n⚠️  Cannot test: Section 2 does not contain "기록사항 없음"');
  } else {
    console.log('\n❌ FAILED: Some checks returned true despite "기록사항 없음"');
  }
}

console.log('\n' + '='.repeat(80));
console.log('\nEXPECTED BEHAVIOR:');
console.log('When document shows "기록사항 없음":');
console.log('- Section 2 (갑구): hasProvisionalRegistration, hasSeizure, hasProvisionalSeizure, hasAuction should all be false');
console.log('- Section 3 (을구): mortgages array should be empty []');
console.log('\nCURRENT ISSUE:');
console.log('- System was reporting provisional registration/mortgages exist');
console.log('- But document explicitly states "기록사항 없음" (no records)');
console.log('\nFIXES IMPLEMENTED:');
console.log('1. extractMortgages(): Added check for "기록사항 없음" in section 3');
console.log('2. checkForProvisionalRegistration(): Extract section 2 and check for "기록사항 없음"');
console.log('3. checkForSeizure(): Added "기록사항 없음" check');
console.log('4. checkForProvisionalSeizure(): Added "기록사항 없음" check');
console.log('5. checkForAuction(): Added "기록사항 없음" check');
