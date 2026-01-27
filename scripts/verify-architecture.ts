/**
 * Verify the code architecture
 * 
 * Flow:
 * 1. parseKoreanAddress() returns bjdongCd (should be MOLIT code)
 * 2. buildingRegistryAPI.detectBuildingType() receives this MOLIT code
 * 3. Inside, it calls convertToRegistryDongCode(sigunguCd, molitDongCode) to convert to Registry code
 * 4. Then queries Building Registry API with the converted code
 */

// From address-data.ts (MOLIT codes) - 마포구
const ADDRESS_DATA_MAPO = {
  '공덕동': '10100',
  '노고산동': '11500',
  '대흥동': '11000',
  '도화동': '10200',
  '동교동': '12100',
  '마포동': '11800',
  '망원동': '10400',
  '상수동': '10500',
  '서교동': '10900',
  '성산동': '10700',
  '신공덕동': '11300',
  '신수동': '11400',
  '신정동': '11900',
  '아현동': '11100',
  '연남동': '10800',
  '염리동': '11200',
  '용강동': '10300',
  '합정동': '10600',
  '현석동': '12000'
};

// From building-registry.ts MOLIT_TO_REGISTRY_DONG_CODE mapping - 마포구 (11440)
const MOLIT_TO_REGISTRY_MAPO: Record<string, string> = {
  '10100': '10200', '10200': '11000', '10300': '11800', '10400': '10800', '10500': '10400',
  '10600': '12100', '10700': '10700', '10800': '12300', '10900': '11500', '11000': '12700',
  '11100': '12000', '11200': '12500', '11300': '10300', '11400': '11100', '11500': '11700',
  '11600': '10100', '11700': '12400', '11800': '10900', '11900': '10500', '12000': '11600',
  '12100': '11400', '12200': '10600', '12300': '12200', '12400': '11200',
};

console.log('=== Verifying Code Architecture ===\n');
console.log('The mapping MOLIT_TO_REGISTRY_DONG_CODE expects MOLIT codes as INPUT.');
console.log('Therefore, address-parser.ts should contain MOLIT codes (same as address-data.ts).\n');

console.log('Checking if address-data.ts MOLIT codes are in the mapping:');
let missingFromMapping = 0;
for (const [dong, molitCode] of Object.entries(ADDRESS_DATA_MAPO)) {
  const registryCode = MOLIT_TO_REGISTRY_MAPO[molitCode];
  if (registryCode) {
    console.log(`✅ ${dong}: MOLIT ${molitCode} → Registry ${registryCode}`);
  } else {
    console.log(`❌ ${dong}: MOLIT ${molitCode} → NOT IN MAPPING!`);
    missingFromMapping++;
  }
}

if (missingFromMapping > 0) {
  console.log(`\n⚠️ ${missingFromMapping} dongs are missing from the mapping!`);
} else {
  console.log('\n✅ All dongs are properly mapped!');
}
