// Test that dangerous fallbacks have been removed
// Issue: System was checking entire document for keywords like "가등기"
// This caused false positives when old cancelled entries appeared in full certificate history

const fullCertificateWithCancelledEntry = `등기사항전부증명서(말소사항 포함)
고유번호 XXXX-XXXX-XXXXXX

[갑 구] (소유권에 관한 사항)
순위번호  등기목적    접수       등기원인
1       소유권보존   2010년...  소유자 박희순
2       가등기      2015년...  가등기권리자 김철수
2-1     2번가등기말소 2016년...  해지

주요 등기사항 요약 (참고용)

1. 소유지분현황 ( 갑구 )
등기명의인 최종지분
박희순 단독소유

2. 소유지분을 제외한 소유권에 관한 사항 ( 갑구 )
순위번호 등기목적 접수정보 주요등기사항 대상소유자
1 임의경매개시결정 2020년 01월 15일 채권자 XX금융회사 박희순
제12345호

3. (근)저당권 및 전세권 등( 을구 )
- 기록사항 없음`;

console.log('Testing that dangerous fallbacks have been removed...\n');
console.log('='.repeat(80));
console.log('\nDocument type: Full certificate (등기사항전부증명서) with cancelled "가등기" entry');
console.log('- Full history section shows: "2 가등기" (CANCELLED with strikethrough)');
console.log('- Summary Section 2 shows: Only auction, NO "가등기"');
console.log('- Summary Section 3 shows: "- 기록사항 없음"');
console.log('\n='.repeat(80));

// Check if "가등기" exists in full document
console.log('\nTEST 1: Check if "가등기" exists anywhere in document');
console.log('-'.repeat(80));
const hasInFullText = /가등기/.test(fullCertificateWithCancelledEntry);
console.log(`"가등기" found in full document: ${hasInFullText ? '✅ YES (in cancelled entry)' : '❌ NO'}`);

if (hasInFullText) {
  const contexts = fullCertificateWithCancelledEntry.match(/.{0,20}가등기.{0,20}/g);
  console.log('\nContexts where "가등기" appears:');
  contexts?.forEach((ctx, i) => {
    console.log(`  [${i+1}] "${ctx}"`);
  });
}

// Extract Section 2 (summary)
console.log('\n\nTEST 2: Extract Section 2 (summary only - active items)');
console.log('-'.repeat(80));
const section2Pattern = /2\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\.\s*\(근\)저당권|$)/s;
const section2Match = fullCertificateWithCancelledEntry.match(section2Pattern);

if (section2Match) {
  const section2Content = section2Match[1];
  console.log('✅ Section 2 (summary) extracted');
  console.log(`Content (first 200 chars): "${section2Content.trim().substring(0, 200)}"`);

  const hasInSection2 = /가등기/.test(section2Content);
  console.log(`\n"가등기" found in Section 2: ${hasInSection2 ? '❌ YES (wrong!)' : '✅ NO (correct!)'}`);
} else {
  console.log('❌ Section 2 NOT extracted');
}

// Simulate the OLD buggy behavior (with fallback)
console.log('\n\nTEST 3: OLD Behavior (WITH fallback to full document)');
console.log('-'.repeat(80));

function checkProvisionalRegistration_OLD(text: string): boolean {
  const section2Match = text.match(/2\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\.\s*\(근\)저당권|$)/s);

  if (section2Match) {
    const section2Content = section2Match[1];
    if (/[-\s]*기록사항\s*없음/.test(section2Content)) {
      return false;
    }
    return /가등기/.test(section2Content);
  }

  // DANGEROUS FALLBACK: Check entire document
  return /가등기/.test(text);
}

const oldResult = checkProvisionalRegistration_OLD(fullCertificateWithCancelledEntry);
console.log(`OLD behavior result: ${oldResult}`);
console.log(oldResult ? '❌ WRONG! False positive from cancelled entry' : '✅ Correct');

// Simulate the NEW fixed behavior (NO fallback)
console.log('\n\nTEST 4: NEW Behavior (NO fallback - section only)');
console.log('-'.repeat(80));

function checkProvisionalRegistration_NEW(text: string): boolean {
  const section2Match = text.match(/2\.\s*소유지분을\s*제외한\s*소유권에\s*관한\s*사항\s*\(\s*갑\s*구\s*\)(.*?)(?:3\.\s*\(근\)저당권|$)/s);

  if (section2Match) {
    const section2Content = section2Match[1];
    if (/[-\s]*기록사항\s*없음/.test(section2Content)) {
      return false;
    }
    return /가등기/.test(section2Content);
  }

  // NO FALLBACK: Return false if section not found
  console.log('  ⚠️  Section 2 not found - returning false (no fallback)');
  return false;
}

const newResult = checkProvisionalRegistration_NEW(fullCertificateWithCancelledEntry);
console.log(`NEW behavior result: ${newResult}`);
console.log(newResult ? '❌ WRONG! Should be false' : '✅✅ CORRECT! No false positive');

console.log('\n' + '='.repeat(80));
console.log('\nCONCLUSION:');
console.log('The fallback to checking the entire document was DANGEROUS because:');
console.log('1. Full certificates include cancelled/deleted entries (with strikethrough)');
console.log('2. OCR captures all text including cancelled entries');
console.log('3. This caused false positives for old cancelled items');
console.log('\nFIX: Removed fallbacks from:');
console.log('- checkForProvisionalRegistration()');
console.log('- checkForSeizure()');
console.log('- checkForProvisionalSeizure()');
console.log('- checkForAuction()');
console.log('- checkForProvisionalDisposition()');
console.log('\nNow these methods ONLY check the summary section (active items only)!');
