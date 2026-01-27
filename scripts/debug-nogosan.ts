/**
 * Debug script for 마포구 노고산동 54-17 building type detection
 */
import { parseKoreanAddress } from '../lib/utils/address-parser';

// Test address
const testAddress = '서울 마포구 노고산동 54-17';

console.log('=== Debug: 노고산동 Building Type Detection ===\n');

// Parse the address
const parsed = parseKoreanAddress(testAddress);
console.log('Parsed address:', parsed);

if (parsed) {
  console.log('\nAddress components:');
  console.log('  sigunguCd:', parsed.sigunguCd, '(마포구 = 11440)');
  console.log('  bjdongCd:', parsed.bjdongCd, '(노고산동)');
  console.log('  bun:', parsed.bun);
  console.log('  ji:', parsed.ji);
} else {
  console.log('\n❌ Failed to parse address!');
}
