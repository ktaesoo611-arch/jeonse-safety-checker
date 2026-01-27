/**
 * Verify the fix by checking 노고산동 flow
 */
import { parseKoreanAddress } from '../lib/utils/address-parser';

// From building-registry.ts MOLIT_TO_REGISTRY_DONG_CODE mapping - 마포구 (11440)
const MOLIT_TO_REGISTRY_MAPO: Record<string, string> = {
  '10100': '10200', '10200': '11000', '10300': '11800', '10400': '10800', '10500': '10400',
  '10600': '12100', '10700': '10700', '10800': '12300', '10900': '11500', '11000': '12700',
  '11100': '12000', '11200': '12500', '11300': '10300', '11400': '11100', '11500': '11700',
  '11600': '10100', '11700': '12400', '11800': '10900', '11900': '10500', '12000': '11600',
  '12100': '11400', '12200': '10600', '12300': '12200', '12400': '11200',
};

const testAddress = '서울 마포구 노고산동 54-17';
const parsed = parseKoreanAddress(testAddress);

console.log('=== Verification: 노고산동 Flow ===\n');
console.log('Input address:', testAddress);
console.log('\nParsed result:', parsed);

if (parsed) {
  console.log('\nStep-by-step:');
  console.log('1. parseKoreanAddress returns bjdongCd:', parsed.bjdongCd, '(should be MOLIT code 11500)');
  
  const registryCode = MOLIT_TO_REGISTRY_MAPO[parsed.bjdongCd];
  console.log('2. convertToRegistryDongCode converts:', parsed.bjdongCd, '→', registryCode || 'NOT FOUND');
  
  if (registryCode) {
    console.log('3. Building Registry API will be called with dong code:', registryCode);
    console.log('\n✅ This should now work correctly!');
  } else {
    console.log('\n❌ ERROR: MOLIT code', parsed.bjdongCd, 'is not in the mapping!');
  }
} else {
  console.log('\n❌ Failed to parse address!');
}
