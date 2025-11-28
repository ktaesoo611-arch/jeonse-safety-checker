// Test if summary section extraction works for 텐즈힐

const fullOCR = `주요 등기사항 요약 (참고용)
[주 의 사 항 ]
본 주요 등기사항 요약은 증명서상에 말소되지 않은 사항을 간략히 요약한 것으로 증명서로서의 기능을 제공하지 않습니다.
실제 권리사항 파악을 위해서는 발급된 증명서를 필히 확인하시기 바랍니다.

고유번호 2401-2016-003167
[집합건물]서울특별시 성동구 상왕십리동 811 텐즈힐 제203동 제14층 제1401호

1. 소유지분현황 ( 갑구 )

등기명의인 (주민)등록번호 최종지분 주 소 순위번호
강윤지(공유자) 880416-******* 2분의 1 서울특별시 성동구 살곶이길 50, 107동 2204호 (마장동,마장동현대아파트) 10
김도현(공유자) 880825-******* 2분의 1 서울특별시 성동구 살곶이길 50, 107동 2204호 (마장동,마장동현대아파트) 11

2. 소유지분을 제외한 소유권에 관한 사항 ( 갑구 )
-기록사항 없음

3. (근)저당권 및 전세권 등( 을구 )

순위번호 등기목적 접수정보 주요등기사항 대상소유자
19 근저당권설정 2024년3월28일 채권최고액 금933,900,000원
제50959호 근저당권자 농협은행주식회사 강윤지 등

[참고 사 항 ]

가. 등기기록에서 유효한 지분을 가진 소유자 혹은 공유자 현황을 가나다 순으로 표시합니다.
나. 최종지분은 등기명의인이 가진 최종지분이며, 2개 이상의 순위번호에 지분을 가진 경우 그 지분을 합산하였습니다.`;

// Pattern from deunggibu-parser.ts line 92
const summaryPattern = /3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)(.*?)(?:11\s+임차권설정|\[?\s*참\s*고\s*사\s*항\s*\]?|$)/s;

console.log('Testing summary section extraction for 텐즈힐...\n');

const match = fullOCR.match(summaryPattern);

if (match) {
  console.log('✅ Summary section FOUND');
  console.log('\nExtracted section:');
  console.log('---');
  console.log(match[1]);
  console.log('---');
  console.log(`\nLength: ${match[1].length} characters`);
  console.log(`Contains mortgage #19: ${match[1].includes('19 근저당권설정')}`);
} else {
  console.log('❌ Summary section NOT FOUND');
  console.log('\nDebugging...');

  // Check if the section header exists
  const headerPattern = /3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)/;
  console.log(`Contains header "3. (근)저당권 및 전세권 등( 을구 )": ${headerPattern.test(fullOCR)}`);

  // Check if 참고사항 exists
  console.log(`Contains "[참고 사 항 ]": ${fullOCR.includes('[참고 사 항 ]')}`);

  // Try simpler extraction
  const simplePattern = /3\.\s*\(근\)저당권\s*및\s*전세권\s*등.*?\(.*?을.*?구.*?\)(.*?)참\s*고\s*사\s*항/s;
  const simpleMatch = fullOCR.match(simplePattern);
  if (simpleMatch) {
    console.log('\n✅ Simpler pattern works:');
    console.log(simpleMatch[1].substring(0, 300));
  }
}
