/**
 * Test parser with sample data matching the actual PDF structure
 */

import { DeunggibuParser } from '../lib/analyzers/deunggibu-parser';

function testSummaryParser() {
  console.log('🧪 Testing parser with "주요 등기사항 요약 (참고용)" section...\n');

  const parser = new DeunggibuParser();

  // Sample text matching your PDF structure with proper section "3. (근)저당권 및 전세권 등"
  const sampleText = `
등기부등본

[집합건물]서울특별시 동대문구 청계천로 108동 2003호

주요 등기사항 요약 (참고용)

본 등기부 등본은 중명서로 활용할 수 없으며, 편리를 위한 것이므로 생략된 사항은 꼭 위의 등기사항을 확인하시기 바랍니다.
실제 권리관계와 부합되지 않으므로 특정 법률행위를 위한 목적상 제공하되 위의 등기사항을 꼭 확인하시기 바랍니다.

1. 소유지분현황 ( 갑구 )
등기명의인 (주민)등록번호 최종지분
김선회 (소유자) 550107-******* 단독소유

2. 소유지분을 제외한 소유권에 관한 사항 ( 갑구 )
순위번호  등기목적  접수정보  주요등기사항  대상소유자

2  임의경매개시결정  2023년11월10일  채권자 주식회사현대부동산연구소  김선회
   제166137호

3  임의경매개시결정  2023년11월16일  채권자 비엔케이캐피탈 주식회사  김선회
   제169478호

4  가압류  2024년1월10일  청구금액 금10,213,538 원  김선희
   제4716호  채권자 주식회사 케이비국민카드

5  가압류  2024년1월11일  청구금액 금28,166,652 원  김선희
   제5057호  채권자 서울신용보증재단

3. (근)저당권 및 전세권 등 ( 을구 )
순위번호  등기목적  접수정보  주요등기사항  대상소유자

2  근저당권설정  2013년8월29일  채권최고액  근저당권자  김선회
   제29777호  금288,000,000원  중소기업은행

2-2  근저당권이전  2024년2월2일  근저당권자  주식회사아라에이엠씨대부  김선회
   제18453호

4  근저당권설정  2017년6월9일  채권최고액  금84,000,000원  김선회
   제40569호  근저당권자  중소기업은행

4-1  근저당권이전  2024년2월2일  근저당권자  주식회사아라에이엠씨대부  김선희
   제18453호

5  근저당권설정  2020년9월25일  채권최고액  근저당권자  김선희
   제214720호  금260,000,000원  흥국화재해상보험주식회사

6  근저당권설정  2020년11월10일  채권최고액  근저당권자  김선희
   제246682호  금240,000,000원  비엔케이캐피탈주식회사

7  근저당권설정  2021년2월15일  채권최고액  근저당권자  김선희
   제28712호  금96,000,000원  비엔케이캐피탈주식회사

8  근저당권설정  2022년4월12일  채권최고액  근저당권자  김선희
   제52622호  금 120,000,000원  비엔케이캐피탈주식회사

9  근저당권설정  2022년8월16일  채권최고액  근저당권자  김선희
   제119208호  금106,800,000원  주식회사오케이저축은행

10  근저당권설정  2023년5월30일  채권최고액  근저당권자  김선희
   제76144호  금19,500,000원  주식회사현대부동산연구소

10-1  근저당권이전  2023년12월14일  근저당권자  주식회사아라에이엠씨대부  김선희
   제186638호

11  임차권설정  2023년6월7일  임차보증금  금13,000,000원  김선희
   제80667호  임차권자  권미리

[ 참 고 사 항 ]
`;

  try {
    const result = parser.parse(sampleText);

    console.log('\n✅ PARSING RESULTS:\n');
    console.log('═══════════════════════════════════════════════════\n');

    console.log(`🏦 MORTGAGES FOUND: ${result.mortgages.length}\n`);

    result.mortgages.forEach((m, i) => {
      console.log(`${i + 1}. Priority ${m.priority} - ${m.seniority?.toUpperCase() || 'N/A'}`);
      console.log(`   Creditor: ${m.creditor}`);
      console.log(`   Amount: ₩${m.maxSecuredAmount.toLocaleString()}`);
      console.log(`   Date: ${m.registrationDate}`);
    });

    console.log(`\n💰 Total: ₩${result.totalMortgageAmount.toLocaleString()}`);
    console.log(`💸 Est. Principal: ₩${result.totalEstimatedPrincipal.toLocaleString()}`);

    console.log('\n⚠️  LIENS FOUND:', result.liens.length);
    result.liens.forEach((lien, i) => {
      console.log(`\n${i + 1}. ${lien.type}`);
      console.log(`   Creditor: ${lien.creditor}`);
      if (lien.amount) {
        console.log(`   Amount: ₩${lien.amount.toLocaleString()}`);
      }
    });

    console.log('\n🏠 JEONSE/LEASE RIGHTS:', result.jeonseRights.length);
    result.jeonseRights.forEach((j, i) => {
      console.log(`\n${i + 1}. ${j.type || 'Lease'}`);
      console.log(`   Tenant: ${j.tenant}`);
      console.log(`   Amount: ₩${j.amount.toLocaleString()}`);
    });

    console.log('\n═══════════════════════════════════════════════════\n');

    // Verify expected results
    console.log('🎯 VERIFICATION:\n');
    const expectedMortgages = 8; // Should find 8 mortgages (entries 2, 4, 5, 6, 7, 8, 9, 10) with transfers applied
    const expectedLiens = 4; // Should find 2 auctions + 2 provisional seizures

    if (result.mortgages.length === expectedMortgages) {
      console.log(`✅ Mortgages: Expected ${expectedMortgages}, Got ${result.mortgages.length}`);
    } else {
      console.log(`❌ Mortgages: Expected ${expectedMortgages}, Got ${result.mortgages.length}`);
    }

    if (result.liens.length >= expectedLiens) {
      console.log(`✅ Liens: Expected at least ${expectedLiens}, Got ${result.liens.length}`);
    } else {
      console.log(`❌ Liens: Expected at least ${expectedLiens}, Got ${result.liens.length}`);
    }

    // Check seniority classification
    console.log('\n🏅 SENIORITY CHECK:');
    const biLienkai = result.mortgages.filter(m => m.creditor.includes('비엔케이'));
    console.log(`비엔케이캐피탈 mortgages: ${biLienkai.length}`);
    biLienkai.forEach((m, i) => {
      console.log(`  #${m.priority}: ${m.seniority} - ₩${m.maxSecuredAmount.toLocaleString()}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testSummaryParser();
