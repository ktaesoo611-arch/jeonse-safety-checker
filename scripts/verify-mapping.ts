// Verify 노고산동 mapping after fix

// From building-registry.ts - 마포구 (11440) mapping
const MAPO_MAPPING: Record<string, string> = {
  '10100': '10200', '10200': '11000', '10300': '11800', '10400': '10800', '10500': '10400',
  '10600': '12100', '10700': '10700', '10800': '12300', '10900': '11500', '11000': '12700',
  '11100': '12000', '11200': '12500', '11300': '10300', '11400': '11100', '11500': '11700',
  '11600': '10100', '11700': '12400', '11800': '10900', '11900': '10500', '12000': '11600',
  '12100': '11400', '12200': '10600', '12300': '12200', '12400': '11200',
};

const newBjdongCd = '10200'; // After fix
console.log('=== After Fix ===');
console.log('노고산동 MOLIT code:', newBjdongCd);
console.log('Maps to registry code:', MAPO_MAPPING[newBjdongCd]);
console.log('\nThis should now correctly query the Building Registry API for 노고산동');
