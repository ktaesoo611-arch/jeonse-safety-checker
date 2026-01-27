/**
 * Debug script for 마포구 노고산동 54-17 building type detection - Part 2
 */
import { parseKoreanAddress } from '../lib/utils/address-parser';
import { buildingRegistryAPI } from '../lib/apis/building-registry';

// Test address
const testAddress = '서울 마포구 노고산동 54-17';

async function main() {
  console.log('=== Debug: 노고산동 Building Type Detection ===\n');

  // Parse the address
  const parsed = parseKoreanAddress(testAddress);
  console.log('Parsed address:', parsed);

  if (!parsed) {
    console.log('\n❌ Failed to parse address!');
    return;
  }

  console.log('\nAddress components:');
  console.log('  sigunguCd:', parsed.sigunguCd, '(마포구 = 11440)');
  console.log('  bjdongCd:', parsed.bjdongCd, '(노고산동 per address-parser.ts)');
  console.log('  bun:', parsed.bun);
  console.log('  ji:', parsed.ji);

  // Test the building registry API
  console.log('\n--- Calling Building Registry API ---');
  try {
    const buildingType = await buildingRegistryAPI.detectBuildingType(
      parsed.sigunguCd,
      parsed.bjdongCd,
      parsed.bun,
      parsed.ji
    );
    console.log('Detected building type:', buildingType);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
