/**
 * Test Deunggibu Parser
 *
 * Run with: npx tsx scripts/test-parser.ts
 */

import { DeunggibuParser } from '../lib/analyzers/deunggibu-parser';

function testParser() {
  console.log('🧪 Testing 등기부등본 Parser...\n');

  const parser = new DeunggibuParser();

  // Sample 등기부등본 text (Korean property register document)
  const sampleDeunggibu = `
등기부등본
발급일: 2024년 11월 10일
문서번호: 2024-마포-12345

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
표제부 (부동산 표시)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

소재지: 서울특별시 마포구 서교동 123-45
건물명칭: 마포래미안푸르지오
전유면적: 84.9㎡
대지면적: 15.2㎡

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
갑구 (소유권에 관한 사항)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

순위번호: 제1호
등기목적: 소유권이전
소유자: 홍길동
주민등록번호: 801234-1******
접수: 2023년 3월 15일
원인: 매매

순위번호: 제2호
등기목적: 소유권이전
소유자: 김철수
주민등록번호: 850612-1******
접수: 2024년 6월 20일
원인: 매매

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
을구 (소유권 이외의 권리에 관한 사항)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

순위번호: 제1호
등기목적: 근저당권설정
권리자: 국민은행 서교동지점
채권최고액: 금 360,000,000원
채무자: 김철수
접수: 2024년 6월 25일

순위번호: 제2호
등기목적: 근저당권설정
권리자: 신한은행 마포지점
채권최고액: 금 120,000,000원
채무자: 김철수
접수: 2024년 7월 10일

순위번호: 제3호
등기목적: 전세권설정
전세권자: 이영희
전세금: 금 250,000,000원
존속기간: 2024년 8월 1일 ~ 2026년 7월 31일
접수: 2024년 7월 15일
`;

  console.log('📄 Parsing sample 등기부등본...\n');

  try {
    const result = parser.parse(sampleDeunggibu);

    console.log('✅ Parsing Complete!\n');
    console.log('═══════════════════════════════════════════════════');
    console.log('📋 PARSED DEUNGGIBU DATA');
    console.log('═══════════════════════════════════════════════════\n');

    // Property Info
    console.log('🏢 Property Information:');
    console.log(`   Address: ${result.address}`);
    console.log(`   Building: ${result.buildingName || 'N/A'}`);
    console.log(`   Area: ${result.area}㎡`);
    if (result.landArea) {
      console.log(`   Land Area: ${result.landArea}㎡`);
    }
    console.log();

    // Document Metadata
    console.log('📄 Document Details:');
    console.log(`   Issue Date: ${result.issueDate}`);
    console.log(`   Document #: ${result.documentNumber}`);
    console.log();

    // Ownership
    console.log('👤 Current Ownership:');
    if (result.ownership.length > 0) {
      result.ownership.forEach((owner, i) => {
        console.log(`   Owner ${i + 1}: ${owner.ownerName}`);
        console.log(`   Share: ${owner.ownershipPercentage}%`);
        console.log(`   Acquired: ${owner.registrationDate}`);
        console.log(`   Method: ${owner.acquisitionMethod}`);
      });
    }
    console.log(`   Total ownership changes: ${result.ownershipChanges}`);
    if (result.recentOwnershipChange) {
      console.log(`   Most recent change: ${result.recentOwnershipChange}`);
    }
    console.log();

    // Mortgages
    console.log('🏦 Mortgages (근저당권):');
    if (result.mortgages.length > 0) {
      result.mortgages.forEach((m, i) => {
        console.log(`   ${i + 1}. Priority ${m.priority} - ${m.creditor}`);
        console.log(`      Max Secured: ₩${m.maxSecuredAmount.toLocaleString()}`);
        console.log(`      Est. Principal: ₩${m.estimatedPrincipal.toLocaleString()}`);
        console.log(`      Date: ${m.registrationDate}`);
        console.log(`      Status: ${m.status}`);
      });
      console.log();
      console.log(`   💰 Total Max Secured Amount: ₩${result.totalMortgageAmount.toLocaleString()}`);
      console.log(`   💸 Total Estimated Principal: ₩${result.totalEstimatedPrincipal.toLocaleString()}`);
    } else {
      console.log('   None');
    }
    console.log();

    // Jeonse Rights
    console.log('🏠 Jeonse Rights (전세권):');
    if (result.jeonseRights.length > 0) {
      result.jeonseRights.forEach((j, i) => {
        console.log(`   ${i + 1}. Tenant: ${j.tenant}`);
        console.log(`      Amount: ₩${j.amount.toLocaleString()}`);
        console.log(`      Date: ${j.registrationDate}`);
        if (j.expirationDate) {
          console.log(`      Expires: ${j.expirationDate}`);
        }
      });
    } else {
      console.log('   None');
    }
    console.log();

    // Liens and Legal Issues
    console.log('⚠️  Legal Issues:');
    let hasIssues = false;

    if (result.hasSeizure) {
      console.log('   🔴 SEIZURE (압류) detected!');
      hasIssues = true;
    }

    if (result.hasProvisionalSeizure) {
      console.log('   🟡 PROVISIONAL SEIZURE (가압류) detected!');
      hasIssues = true;
    }

    if (result.hasAuction) {
      console.log('   🔴 AUCTION PROCEEDINGS (경매개시결정) detected!');
      hasIssues = true;
    }

    if (result.hasSuperficies) {
      console.log('   🟡 Superficies (지상권) detected');
      hasIssues = true;
    }

    if (result.hasEasement) {
      console.log('   🟡 Easement (지역권) detected');
      hasIssues = true;
    }

    if (result.hasProvisionalRegistration) {
      console.log('   🟡 Provisional Registration (가등기) detected');
      hasIssues = true;
    }

    if (result.hasProvisionalDisposition) {
      console.log('   🟡 Provisional Disposition (가처분) detected');
      hasIssues = true;
    }

    if (result.hasAdvanceNotice) {
      console.log('   🟡 Advance Notice (예고등기) detected');
      hasIssues = true;
    }

    if (result.hasUnregisteredLandRights) {
      console.log('   🟡 Unregistered Land Rights (대지권미등기) detected');
      hasIssues = true;
    }

    if (result.liens.length > 0) {
      console.log(`\n   Detailed Liens (${result.liens.length}):`);
      result.liens.forEach((lien, i) => {
        console.log(`   ${i + 1}. ${lien.type} - ${lien.creditor}`);
        if (lien.amount) {
          console.log(`      Amount: ₩${lien.amount.toLocaleString()}`);
        }
        console.log(`      Date: ${lien.registrationDate}`);
      });
    }

    if (!hasIssues && result.liens.length === 0) {
      console.log('   ✅ No legal issues detected');
    }
    console.log();

    console.log('═══════════════════════════════════════════════════\n');

    // Quick Risk Assessment
    console.log('🎯 Quick Risk Assessment:');

    const totalDebt = result.totalEstimatedPrincipal +
                      result.jeonseRights.reduce((sum, j) => sum + j.amount, 0);

    console.log(`   Total Debt Load:`);
    console.log(`   - Mortgages: ₩${result.totalEstimatedPrincipal.toLocaleString()}`);
    console.log(`   - Jeonse Rights: ₩${result.jeonseRights.reduce((sum, j) => sum + j.amount, 0).toLocaleString()}`);
    console.log(`   - TOTAL: ₩${totalDebt.toLocaleString()}\n`);

    if (result.hasSeizure || result.hasAuction) {
      console.log('   ⛔ CRITICAL RISK: Do NOT proceed with this property!');
    } else if (result.hasProvisionalSeizure || result.liens.length > 0) {
      console.log('   ⚠️  HIGH RISK: Serious legal issues detected');
    } else if (result.mortgages.length > 2) {
      console.log('   ⚠️  MEDIUM RISK: Multiple mortgages');
    } else {
      console.log('   ✅ No critical issues detected');
      console.log('      (Still need to check debt-to-value ratio)');
    }
    console.log();

    console.log('✅ Parser is working correctly!\n');

  } catch (error: any) {
    console.error('❌ Parsing Error:', error.message);
    console.log('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Instructions
console.log('╔════════════════════════════════════════════╗');
console.log('║  등기부등본 PARSER TEST                    ║');
console.log('╚════════════════════════════════════════════╝\n');

console.log('📝 This test parses a sample Korean property register');
console.log('   document and extracts all risk indicators\n');

// Run the test
testParser();
