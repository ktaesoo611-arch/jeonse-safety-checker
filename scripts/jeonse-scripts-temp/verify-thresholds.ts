/**
 * Verify 소액보증금 Thresholds (2025 Legal Values)
 *
 * Reference: 주택임대차보호법 시행령 [시행 2025. 3. 1.] [대통령령 제35161호, 2024. 12. 31., 일부개정]
 */

import { RiskAnalyzer } from '../lib/analyzers/risk-analyzer';

const analyzer = new RiskAnalyzer();

console.log('🔍 Verifying 소액보증금 Thresholds (2025 Legal Values)\n');
console.log('════════════════════════════════════════════════════════════════\n');

// Test addresses for each region
const testCases = [
  {
    address: '서울특별시 강남구 역삼동 123-45',
    expectedRegion: '서울',
    expectedThreshold: 165000000,  // ₩1.65억
    expectedProtected: 55000000,   // ₩5,500만원
  },
  {
    address: '인천광역시 남동구 구월동 123-45',
    expectedRegion: '수도권 과밀억제권역',
    expectedThreshold: 145000000,  // ₩1.45억
    expectedProtected: 48000000,   // ₩4,800만원
  },
  {
    address: '경기도 의정부시 의정부동 123-45',
    expectedRegion: '수도권 과밀억제권역',
    expectedThreshold: 145000000,  // ₩1.45억
    expectedProtected: 48000000,   // ₩4,800만원
  },
  {
    address: '세종특별자치시 세종로 123',
    expectedRegion: '세종·용인·화성·김포',
    expectedThreshold: 145000000,  // ₩1.45억
    expectedProtected: 48000000,   // ₩4,800만원
  },
  {
    address: '경기도 용인시 기흥구 구갈동 123-45',
    expectedRegion: '세종·용인·화성·김포',
    expectedThreshold: 145000000,  // ₩1.45억
    expectedProtected: 48000000,   // ₩4,800만원
  },
  {
    address: '경기도 화성시 동탄면 123-45',
    expectedRegion: '세종·용인·화성·김포',
    expectedThreshold: 145000000,  // ₩1.45억
    expectedProtected: 48000000,   // ₩4,800만원
  },
  {
    address: '경기도 김포시 김포동 123-45',
    expectedRegion: '세종·용인·화성·김포',
    expectedThreshold: 145000000,  // ₩1.45억
    expectedProtected: 48000000,   // ₩4,800만원
  },
  {
    address: '부산광역시 해운대구 우동 123-45',
    expectedRegion: '광역시·경기도',
    expectedThreshold: 85000000,   // ₩8,500만원
    expectedProtected: 28000000,   // ₩2,800만원
  },
  {
    address: '경기도 안산시 단원구 고잔동 123-45',
    expectedRegion: '광역시·경기도',
    expectedThreshold: 85000000,   // ₩8,500만원
    expectedProtected: 28000000,   // ₩2,800만원
  },
  {
    address: '전라남도 순천시 조례동 123-45',
    expectedRegion: '기타 지역',
    expectedThreshold: 75000000,   // ₩7,500만원
    expectedProtected: 25000000,   // ₩2,500만원
  },
];

let allPassed = true;

testCases.forEach((testCase, index) => {
  console.log(`📍 Test ${index + 1}: ${testCase.address}`);

  const result = analyzer.checkSmallAmountPriority(
    testCase.expectedThreshold - 10000000, // Test with amount just below threshold
    testCase.address,
    1000000000  // ₩10억 property value (high enough to not trigger 제10조② cap)
  );

  const regionMatch = result.region === testCase.expectedRegion;
  const thresholdMatch = result.threshold === testCase.expectedThreshold;
  const protectedMatch = result.protectedAmount === testCase.expectedProtected;
  const eligible = result.isEligible;

  console.log(`   Region: ${result.region} ${regionMatch ? '✅' : '❌ Expected: ' + testCase.expectedRegion}`);
  console.log(`   Threshold: ₩${(result.threshold / 100000000).toFixed(2)}억 ${thresholdMatch ? '✅' : '❌ Expected: ₩' + (testCase.expectedThreshold / 100000000).toFixed(2) + '억'}`);
  console.log(`   Protected: ₩${(result.protectedAmount / 10000000).toFixed(0)}만원 ${protectedMatch ? '✅' : '❌ Expected: ₩' + (testCase.expectedProtected / 10000000).toFixed(0) + '만원'}`);
  console.log(`   Eligible: ${eligible ? 'YES' : 'NO'} ${eligible ? '✅' : '❌'}`);

  if (!regionMatch || !thresholdMatch || !protectedMatch || !eligible) {
    allPassed = false;
  }

  console.log('');
});

console.log('════════════════════════════════════════════════════════════════\n');

if (allPassed) {
  console.log('✅ All thresholds verified! 2025 legal values are correctly implemented.\n');
} else {
  console.log('❌ Some thresholds are incorrect. Please review the implementation.\n');
  process.exit(1);
}

console.log('📚 Reference: 주택임대차보호법 시행령 [별표 1] 과밀억제권역');
console.log('   Effective Date: 2025. 3. 1.');
console.log('   법령: 대통령령 제35161호, 2024. 12. 31., 일부개정\n');
