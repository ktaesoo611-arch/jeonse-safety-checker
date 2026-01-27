/**
 * Compare dong codes between address-parser.ts and the authoritative MOLIT data
 */

// From address-parser.ts - 마포구
const ADDRESS_PARSER_MAPO: Record<string, string> = {
  '아현동': '10100',
  '공덕동': '10200',
  '신공덕동': '10300',
  '도화동': '10400',
  '용강동': '10500',
  '토정동': '10600',
  '마포동': '10700',
  '대흥동': '10800',
  '염리동': '10900',
  '노고산동': '11000', // <-- WRONG
  '신수동': '11100',
  '현석동': '11200',
  '구수동': '11300',
  '창전동': '11400',
  '상수동': '11500',
  '하중동': '11600',
  '신정동': '11700',
  '당인동': '11800',
  '서교동': '12000',
  '동교동': '12100',
  '합정동': '12200',
  '망원동': '12300',
  '연남동': '12400',
  '성산동': '12500',
  '중동': '12600',
  '상암동': '12700'
};

// From map-all-dong-codes.mjs (authoritative MOLIT data) - 마포구
const MOLIT_MAPO: Record<string, string> = {
  '공덕동': '10100',
  '노고산동': '10200', // CORRECT!
  '당인동': '10300',
  '대흥동': '10400',
  '도화동': '10500',
  '동교동': '10600',
  '마포동': '10700',
  '망원동': '10800',
  '상수동': '10900',
  '상암동': '11000',
  '서교동': '11100',
  '성산동': '11200',
  '신공덕동': '11300',
  '신수동': '11400',
  '신정동': '11500',
  '아현동': '11600',
  '연남동': '11700',
  '염리동': '11800',
  '용강동': '11900',
  '중동': '12000',
  '창전동': '12100',
  '토정동': '12200',
  '합정동': '12300',
  '현석동': '12400'
};

console.log('=== 마포구 Dong Code Comparison ===\n');
console.log('Format: dong name: address-parser.ts → MOLIT (correct)\n');

// Find discrepancies
let discrepancies = 0;
for (const [dong, parserCode] of Object.entries(ADDRESS_PARSER_MAPO)) {
  const molitCode = MOLIT_MAPO[dong];
  if (!molitCode) {
    console.log(`❓ ${dong}: ${parserCode} → NOT IN MOLIT DATA`);
    discrepancies++;
  } else if (parserCode !== molitCode) {
    console.log(`❌ ${dong}: ${parserCode} → ${molitCode} (MISMATCH!)`);
    discrepancies++;
  }
}

// Find dongs in MOLIT but not in parser
for (const dong of Object.keys(MOLIT_MAPO)) {
  if (!ADDRESS_PARSER_MAPO[dong]) {
    console.log(`⚠️ ${dong}: MISSING from address-parser.ts (MOLIT has ${MOLIT_MAPO[dong]})`);
    discrepancies++;
  }
}

if (discrepancies === 0) {
  console.log('✅ All dong codes match!');
} else {
  console.log(`\nFound ${discrepancies} discrepancies`);
}
