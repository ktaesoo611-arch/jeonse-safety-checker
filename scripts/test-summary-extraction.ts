/**
 * Test summary section extraction with actual OCR format
 */

// Sample cleaned text matching the actual OCR output format
const sampleText = `
주요 등기사항 요약 (참고용) [주의 사항] 본 주요 등기사항 요약은 증명서상에 말소되지 않은 사항을 간략히 요약한 것으로 증명서로서의 기능을 제공하지 않습니다. 실제 권리사항 파악을 위해서는 발급된 증명서를 필히 확인하시기 바랍니다. 고유번호 2641-2011-000728 [집합건물]서울특별시 동대문구 답십리동 1002 청계한신 휴플러스 제108동 제20층 제2003호 1. 소유지분현황 ( 갑구 ) 등기명의인 (주민)등록번호 최종지분 김선회 (소유자) 550107-******* 단독소유 주 소 순위번호 서울특별시 동대문구 서울시립대로 14, 108동 2003호 (답십리동,청계한신휴플러스) 1 2. 소유지분을 제외한 소유권에 관한 사항 ( 갑구 ) 순위번호 등기목적 접수정보 주요등기사항 대상소유자 2 임의경매개시결정 2023년 11월 10일 채권자 주식회사현대부동산연구소 제166137호 김선회 3 임의경매개시결정 2023년11월16일 채권자 비엔케이캐피탈 주식회사 제169478호 김선회 4 가압류 2024년1월10일 청구금액 금10,213,538 원 제4716호 김선회 채권자 주식회사 케이비국민카드 5 가압류 2024년1월11일 청구금액 금28,166,652원 제5057호 채권자 서울신용보증재단 김선회 6 가압류 2024년1월23일 제11492호 청구금액 금27,282,340 원 채권자 하나캐피탈 주식회사 김선회 7 압류 김선회 2024년2월13일 권리자 동대문구(서울특별시) 제23308호 3. (근)저당권 및 전세권 등 ( 을구 ) 순위번호 등기목적 접수정보 주요등기사항 2 근저당권설정 2013년8월29일 제29777호 채권최고액 근저당권자 금288,000,000원 중소기업은행 대상소유자 김선회 2-2 근저당권이전 2024년2월2일 제18453호 근저당권자 주식회사아라에이엠씨대부 김선회 2-3 근질권 2024년2월2일 제18454호 채권최고액 금288,000,000원 김선회 채권자 통조림가공수산업협동조합 2-4 질권 2024년3월25일 채권액 금 45,500,000원 제49444호 채권자 이무용 김선회 4 근저당권설정 2017년6월9일 제40569호 채권최고액 금84,000,000원 근저당권자 중소기업은행 김선회 4-1 근저당권이전 2024년2월2일 근저당권자 주식회사아라에이엠씨대부 김선회 제18453호 4-2 근질권 2024년2월2일 제18455호 채권최고액 금84,000,000원 채권자 통조림가공수산업협동조합 김선회 4-3 질권 2024년3월25일 채권액 금 45,500,000원 제49445호 김선회 채권자 이무용 5 근저당권설정 2020년9월25일 제214720호 채권최고액 근저당권자 금260,000,000원 김선회 흥국화재해상보험주식회사 6 근저당권설정 2020년 11월 10일 제246682호 채권최고액 근저당권자 금240,000,000원 김선회 비엔케이캐피탈주식회사 7 근저당권설정 2021년2월15일 제28712호 채권최고액 근저당권자 금96,000,000원 비엔케이캐피탈주식회사 8 근저당권설정 2022년4월12일 제52622호 채권최고액 근저당권자 금 120,000,000원 비엔케이캐피탈주식회사 9 근저당권설정 2022년8월16일 제119208호 채권최고액 근저당권자 금106,800,000원 김선회 김선회 김선회 주식회사오케이저축은행 10 근저당권설정 2023년5월30일 제76144호 채권최고액 근저당권자 금19,500,000원 김선회 주식회사현대부동산연구소 10-1 근저당권이전 2023년 12월 14일 근저당권자 제186638호 주식회사아라에이엠씨대부 김선회 11 임차권설정 2023년6월7일 제80667호 임차보증금 금13,000,000원 임차권자 권미리 김선회 [참고사항]
`;

console.log('Testing summary section pattern matching...\n');

// Test 1: Can we find the section?
const sectionMatch = sampleText.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)(.*?)(?:4\.|11\s+임차권설정|\[?\s*참\s*고\s*사\s*항\s*\]?|출력일시|$)/s);

if (sectionMatch) {
  console.log('✅ Found section "3. (근)저당권 및 전세권 등 ( 을구 )"');
  console.log('\nExtracted section content (first 500 chars):');
  console.log(sectionMatch[1].substring(0, 500));
  console.log('\n');

  const summarySection = sectionMatch[1];

  // Test 2: Extract individual entries
  // Looking at the format: "2 근저당권설정 2013년8월29일 제29777호 채권최고액 근저당권자 금288,000,000원 중소기업은행 대상소유자 김선회"
  // Note: Sometimes "채권최고액" comes before amount, sometimes "금XXX원 근저당권자"

  // Updated pattern to handle:
  // - Spaces in dates: "11월 10일" vs "11월10일"
  // - Spaces in amounts: "금 120,000,000원" vs "금120,000,000원"
  // - Variable order: "채권최고액 근저당권자 금XXX원 은행" vs "채권최고액 금XXX원 근저당권자 은행"
  // - Owner name before creditor: "금XXX원 김선회 비엔케이캐피탈" (skip 김선회)

  const pattern1 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s+제\d+호\s+채권최고액\s+(?:근저당권자\s+)?금\s*([\d,]+)원\s+(?:김선회\s+)?([가-힣\s()]+?(?:주식회사|은행|저축은행|캐피탈|금융|농협|신협|새마을금고|유한회사|보험|카드|대부|파트너))/gs;

  console.log('Testing pattern 1...');
  let match;
  let count = 0;
  while ((match = pattern1.exec(summarySection)) !== null) {
    count++;
    const [, priority, year, month, day, amount, creditor] = match;
    console.log(`  ${count}. Mortgage #${priority}: ₩${parseInt(amount.replace(/,/g, '')).toLocaleString()} - ${creditor.trim()} (${year}-${month}-${day})`);
  }

  console.log(`\nTotal mortgages found: ${count}`);
  console.log('Expected: 8');

  if (count !== 8) {
    console.log('\n⚠️  Not all mortgages extracted. Debugging...\n');

    // Show all "근저당권설정" entries
    const allMortgages = summarySection.match(/\d+\s+근저당권설정[^\d]+?금[\d,]+원/gs);
    console.log('All mortgage entries found in text:');
    allMortgages?.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.substring(0, 150)}`);
    });
  }
} else {
  console.log('❌ Section "3. (근)저당권 및 전세권 등" not found');
}
