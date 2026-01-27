/**
 * Debug: Check dong code mapping for 마포구 노고산동
 */

// MOLIT to Registry dong code mapping for 마포구 (11440)
const MAPO_MAPPING = {
  '10100': '10200', '10200': '11000', '10300': '11800', '10400': '10800', '10500': '10400',
  '10600': '12100', '10700': '10700', '10800': '12300', '10900': '11500', '11000': '12700',
  '11100': '12000', '11200': '12500', '11300': '10300', '11400': '11100', '11500': '11700',
  '11600': '10100', '11700': '12400', '11800': '10900', '11900': '10500', '12000': '11600',
  '12100': '11400', '12200': '10600', '12300': '12200', '12400': '11200',
};

// From address-parser.ts: 노고산동 = '11000'
const addressParserCode = '11000';

// From address-data.ts: 노고산동 = '11500' 
const addressDataCode = '11500';

console.log('=== 노고산동 Dong Code Analysis ===\n');

console.log('In address-parser.ts (SEOUL_DONG_CODES):');
console.log('  노고산동 code:', addressParserCode);
console.log('  Maps to registry code:', MAPO_MAPPING[addressParserCode] || 'NOT FOUND');

console.log('\nIn address-data.ts (used for UI dropdown):');
console.log('  노고산동 code:', addressDataCode);
console.log('  Maps to registry code:', MAPO_MAPPING[addressDataCode] || 'NOT FOUND');

console.log('\n--- Analysis ---');
console.log('The codes are DIFFERENT!');
console.log('address-parser.ts uses 11000 which maps to registry code 12700');
console.log('address-data.ts uses 11500 which maps to registry code 11700');
console.log('\nThis inconsistency could cause issues if the registry code 12700');
console.log('corresponds to a different dong than 노고산동');
