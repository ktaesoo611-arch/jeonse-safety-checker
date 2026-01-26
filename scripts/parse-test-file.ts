/**
 * Parse the downloaded 등기부등본 test file
 * Run with: npx tsx scripts/parse-test-file.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseDeunggibuExcel } from '../lib/analyzers/excel-deunggibu-parser';

const filePath = path.join(process.cwd(), 'test-output', 'deunggibu-test.xlsx');

if (!fs.existsSync(filePath)) {
  console.error('❌ File not found:', filePath);
  process.exit(1);
}

console.log('📄 Parsing:', filePath);
console.log('');

const buffer = fs.readFileSync(filePath);
const parsed = parseDeunggibuExcel(buffer);

console.log('='.repeat(60));
console.log('📋 등기부등본 분석 결과');
console.log('='.repeat(60));

console.log('\n📍 물건 정보:');
console.log('  유형:', parsed.propertyType);
console.log('  주소:', parsed.address || parsed.fullAddress);
console.log('  건물명:', parsed.buildingName || '(미추출)');
console.log('  동/호:', parsed.unitNumber || '(미추출)');
console.log('  전용면적:', parsed.area ? `${parsed.area}㎡ (약 ${(parsed.area / 3.3058).toFixed(1)}평)` : '(미추출)');
console.log('  구조:', parsed.buildingStructure || '(미추출)');
console.log('  층수:', parsed.totalFloors ? `${parsed.totalFloors}층` : '(미추출)');
console.log('  고유번호:', parsed.uniqueNumber || '(미추출)');
console.log('  열람일시:', parsed.documentDate || '(미추출)');

console.log('\n👤 현재 소유자:');
if (parsed.currentOwner) {
  console.log('  성명:', parsed.currentOwner.name);
  console.log('  주민번호:', parsed.currentOwner.registrationNumber);
  console.log('  주소:', parsed.currentOwner.address || '(미기재)');
  console.log('  소유형태:', parsed.currentOwner.share || '(미확인)');
  console.log('  취득일:', parsed.currentOwner.registrationDate || '(미확인)');
  console.log('  취득원인:', parsed.currentOwner.cause || '(미확인)');
  if (parsed.currentOwner.transactionAmount) {
    console.log('  거래가액:', formatMoney(parsed.currentOwner.transactionAmount));
  }
} else {
  console.log('  (소유자 정보 미추출)');
}

console.log('\n📜 소유권 변동 이력 (갑구):');
if (parsed.ownerHistory.length > 0) {
  parsed.ownerHistory.forEach((owner, i) => {
    console.log(`  ${i + 1}. ${owner.name} (${owner.share || '미확인'})`);
    console.log(`     등기일: ${owner.registrationDate}, 원인: ${owner.cause || '미확인'}`);
    if (owner.transactionAmount) {
      console.log(`     거래가액: ${formatMoney(owner.transactionAmount)}`);
    }
  });
} else {
  console.log('  (이력 없음)');
}

console.log('\n🏦 근저당권 (을구):');
console.log(`  전체: ${parsed.mortgages.length}건, 유효: ${parsed.activeMortgages.length}건`);
if (parsed.mortgages.length > 0) {
  parsed.mortgages.forEach((m, i) => {
    const status = m.status === 'active' ? '✅ 유효' : '❌ 말소';
    console.log(`  ${i + 1}. [${status}] ${formatMoney(m.maxAmount)} - ${m.creditor || '채권자 미확인'}`);
    console.log(`     등기일: ${m.registrationDate}, 채무자: ${m.debtor || '미확인'}`);
  });
} else {
  console.log('  (없음)');
}

console.log('\n🏠 전세권 (을구):');
console.log(`  전체: ${parsed.jeonseRights.length}건, 유효: ${parsed.activeJeonseRights.length}건`);
if (parsed.jeonseRights.length > 0) {
  parsed.jeonseRights.forEach((j, i) => {
    const status = j.status === 'active' ? '✅ 유효' : '❌ 말소';
    console.log(`  ${i + 1}. [${status}] ${formatMoney(j.amount)}`);
  });
} else {
  console.log('  (없음)');
}

console.log('\n⚠️ 압류/경매 등 (을구):');
console.log(`  전체: ${parsed.liens.length}건, 유효: ${parsed.activeLiens.length}건`);
if (parsed.liens.length > 0) {
  parsed.liens.forEach((l, i) => {
    const status = l.status === 'active' ? '✅ 유효' : '❌ 해제';
    console.log(`  ${i + 1}. [${status}] ${l.type}`);
  });
} else {
  console.log('  (없음)');
}

console.log('\n' + '='.repeat(60));
console.log('📊 요약');
console.log('='.repeat(60));

console.log('\n💰 권리 현황 (유효한 것만):');
console.log('  총 근저당액:', formatMoney(parsed.totalMortgageAmount));
console.log('  추정 실채무 (77%):', formatMoney(parsed.totalEstimatedPrincipal));
console.log('  총 전세금:', formatMoney(parsed.totalJeonseAmount));

console.log('\n🚨 위험 플래그:');
console.log('  경매:', parsed.hasAuction ? '⚠️ 있음' : '✅ 없음');
console.log('  압류:', parsed.hasSeizure ? '⚠️ 있음' : '✅ 없음');
console.log('  가압류:', parsed.hasProvisionalSeizure ? '⚠️ 있음' : '✅ 없음');
console.log('  가처분:', parsed.hasProvisionalDisposition ? '⚠️ 있음' : '✅ 없음');

console.log('\n✅ 파싱 신뢰도:', (parsed.confidence * 100) + '%');

// Safety analysis for 전세
console.log('\n' + '='.repeat(60));
console.log('🔍 전세 안전성 분석 (5.4억 기준)');
console.log('='.repeat(60));

const jeonseAmount = 540000000;  // 5.4억
const priorityDebt = parsed.totalMortgageAmount + parsed.totalJeonseAmount;

console.log('\n선순위 채권 현황:');
console.log('  유효 근저당:', formatMoney(parsed.totalMortgageAmount));
console.log('  유효 전세권:', formatMoney(parsed.totalJeonseAmount));
console.log('  합계:', formatMoney(priorityDebt));

if (priorityDebt === 0) {
  console.log('\n✅ 결론: 선순위 채권이 없어 전세 5.4억 안전합니다.');
} else {
  console.log('\n⚠️ 주의: 선순위 채권이 있습니다. 추가 분석 필요.');
}

function formatMoney(amount: number): string {
  if (amount === 0) return '0원';
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000);
    const remainder = amount % 100000000;
    if (remainder > 0) {
      return `${eok}억 ${(remainder / 10000).toLocaleString()}만원`;
    }
    return `${eok}억원`;
  } else if (amount >= 10000) {
    return `${(amount / 10000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}
