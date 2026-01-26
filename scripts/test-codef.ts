/**
 * Test script for CODEF API - 부동산등기부등본 열람/발급
 * Run with: npx tsx scripts/test-codef.ts
 *
 * Tests both the API call (sandbox/demo) and the parser.
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { CodefAPI, CodefRegistryData } from '../lib/apis/codef';
import { parseCodefRegistryData } from '../lib/analyzers/codef-deunggibu-parser';
import fs from 'fs';

async function testCodefLookup() {
  console.log('=== CODEF API Test - 부동산등기부등본 열람/발급 ===\n');

  const mode = process.env.CODEF_MODE || 'demo';
  console.log(`Mode: ${mode}`);
  console.log(`IROS ID: ${process.env.CODEF_IROS_ID || '(using testuser default)'}`);

  const codefAPI = new CodefAPI();

  // Test address
  const testAddress = '서울특별시 강남구 역삼동 649-7';
  const propertyType: '집합건물' = '집합건물';

  console.log(`\nAddress: ${testAddress}`);
  console.log(`Type: ${propertyType}`);
  console.log('---\n');

  console.log('Calling CODEF registry API...');
  const start = Date.now();

  const result = await codefAPI.getRegistry(testAddress, propertyType);

  const duration = Date.now() - start;
  console.log(`Duration: ${duration}ms`);
  console.log(`Success: ${result.success}`);

  if (!result.success) {
    console.error(`Error: ${result.error}`);
    if (result.rawResponse) {
      console.log('\nFull response:');
      console.log(JSON.stringify(result.rawResponse, null, 2).substring(0, 2000));
    }
    console.log('\nTroubleshooting:');
    console.log('- CF-13320: Missing e-money credentials. Set CODEF_EMONEY_* env vars.');
    console.log('- CF-13007: Address too vague. Use more specific address.');
    console.log('- CF-12826: Password format error. Password should be 4 digits.');
    console.log('- CF-13006: No results found. Check address spelling.');
    return;
  }

  // Check if we got an address list (multiple matches)
  if (result.addressList && result.addressList.length > 0) {
    console.log(`\nAddress search returned ${result.addressList.length} matches:`);
    for (const addr of result.addressList) {
      console.log(`  [${addr.resType}] ${addr.commAddrLotNumber} (${addr.commUniqueNo}) - ${addr.resState}`);
      console.log(`  Full object:`, JSON.stringify(addr, null, 2));
    }
    console.log('\nTo get the full registry, call with a specific uniqueNo.');
    console.log('\nFull data object:', JSON.stringify(result.data, null, 2));
    return;
  }

  // Parse the response
  if (!result.data) {
    console.log('No data in response');
    return;
  }

  console.log('\nParsing CODEF response...');
  const data = result.data;

  console.log('Response structure:');
  console.log(`  resRegisterEntriesList: ${data.resRegisterEntriesList?.length || 0} entries`);
  if (data.resRegisterEntriesList?.length > 0) {
    const entry = data.resRegisterEntriesList[0];
    console.log(`  resDocTitle: ${entry.resDocTitle}`);
    console.log(`  resRealty: ${entry.resRealty}`);
    console.log(`  Sections: ${entry.resRegistrationHisList?.map(s => `${s.resType}(${s.resType1})`).join(', ')}`);
  }

  // Parse into ExcelDeunggibuData format
  const parsedData = parseCodefRegistryData(data);

  console.log('\nParsed Data (ExcelDeunggibuData):');
  console.log(`  Property Type: ${parsedData.propertyType}`);
  console.log(`  Address: ${parsedData.address}`);
  console.log(`  Building: ${parsedData.buildingName}`);
  console.log(`  Unit: ${parsedData.unitNumber}`);
  console.log(`  Area: ${parsedData.area}㎡`);
  console.log(`  Structure: ${parsedData.buildingStructure}`);
  console.log(`  Total Floors: ${parsedData.totalFloors}`);
  console.log(`  Current Owner: ${parsedData.currentOwner?.name || 'N/A'}`);
  console.log(`  Owner History: ${parsedData.ownerHistory.length} entries`);
  console.log(`  Mortgages: ${parsedData.mortgages.length} (active: ${parsedData.activeMortgages.length})`);
  console.log(`  Total Mortgage: ${parsedData.totalMortgageAmount.toLocaleString()}원`);
  console.log(`  Est. Principal: ${parsedData.totalEstimatedPrincipal.toLocaleString()}원`);
  console.log(`  Jeonse Rights: ${parsedData.jeonseRights.length} (active: ${parsedData.activeJeonseRights.length})`);
  console.log(`  Total Jeonse: ${parsedData.totalJeonseAmount.toLocaleString()}원`);
  console.log(`  Liens: ${parsedData.liens.length} (active: ${parsedData.activeLiens.length})`);
  console.log(`  Flags:`);
  console.log(`    Auction: ${parsedData.hasAuction}`);
  console.log(`    Seizure: ${parsedData.hasSeizure}`);
  console.log(`    Provisional Seizure: ${parsedData.hasProvisionalSeizure}`);
  console.log(`    Provisional Disposition: ${parsedData.hasProvisionalDisposition}`);
  console.log(`  Confidence: ${(parsedData.confidence * 100).toFixed(1)}%`);
  console.log(`  Parsing Method: ${(parsedData as any).parsingMethod}`);

  // Print details
  if (parsedData.activeMortgages.length > 0) {
    console.log('\n  Active Mortgages:');
    for (const m of parsedData.activeMortgages) {
      console.log(`    #${m.rank}: ${m.maxAmount.toLocaleString()}원 (${m.creditor || 'unknown'}) - ${m.registrationDate}`);
    }
  }

  if (parsedData.activeLiens.length > 0) {
    console.log('\n  Active Liens:');
    for (const l of parsedData.activeLiens) {
      console.log(`    ${l.type}: ${l.creditor || 'unknown'} - ${l.registrationDate}`);
    }
  }

  console.log(`\n=== Test Complete (${duration}ms) ===`);
}

// Also test parser directly with sandbox response if available
async function testParserWithSandbox() {
  const sandboxFile = 'scripts/codef-sandbox-response.json';
  if (!fs.existsSync(sandboxFile)) {
    console.log('\nNo sandbox response file found, skipping parser-only test.');
    return;
  }

  console.log('\n\n=== Parser Test (Sandbox Response) ===\n');
  const sandboxData = JSON.parse(fs.readFileSync(sandboxFile, 'utf-8'));

  if (sandboxData.result?.code !== 'CF-00000') {
    console.log('Sandbox response is not successful, skipping.');
    return;
  }

  const data = sandboxData.data as CodefRegistryData;
  const parsed = parseCodefRegistryData(data);

  console.log(`Property: ${parsed.propertyType} - ${parsed.address}`);
  console.log(`Building: ${parsed.buildingName}, Unit: ${parsed.unitNumber}`);
  console.log(`Area: ${parsed.area}㎡, Floors: ${parsed.totalFloors}`);
  console.log(`Owner: ${parsed.currentOwner?.name} (${parsed.ownerHistory.length} total)`);
  console.log(`Mortgages: ${parsed.mortgages.length} (active: ${parsed.activeMortgages.length})`);
  console.log(`  Total: ${parsed.totalMortgageAmount.toLocaleString()}원`);
  console.log(`Liens: ${parsed.liens.length} (active: ${parsed.activeLiens.length})`);
  console.log(`Flags: auction=${parsed.hasAuction}, seizure=${parsed.hasSeizure}, 가압류=${parsed.hasProvisionalSeizure}`);
}

// Run both tests
testCodefLookup()
  .then(() => testParserWithSandbox())
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
