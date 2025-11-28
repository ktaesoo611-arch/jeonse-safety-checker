/**
 * Test 청계한신휴플러스 document parsing
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { OCRService } from '../lib/services/ocr-service';
import { DeunggibuParser } from '../lib/analyzers/deunggibu-parser';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testCheongye() {
  console.log('='.repeat(80));
  console.log('Testing: 청계한신휴플러스 108동 2003호');
  console.log('='.repeat(80));
  console.log();

  const testFile = path.join(process.cwd(), 'test/registry_report/청계한신휴플러스 108동 2003호_registry.pdf');

  if (!fs.existsSync(testFile)) {
    console.error('❌ Test file not found:', testFile);
    process.exit(1);
  }

  try {
    // Read PDF
    const buffer = fs.readFileSync(testFile);

    // Extract text via OCR
    const ocrService = new OCRService();
    const text = await ocrService.extractTextFromPDF(buffer);

    console.log(`📄 Extracted ${text.length} characters from OCR\n`);

    // Parse using deunggibu parser
    const parser = new DeunggibuParser();
    const result = parser.parse(text);

    console.log('='.repeat(80));
    console.log('RESULTS');
    console.log('='.repeat(80));

    console.log(`\n✅ Mortgages found: ${result.mortgages.length}`);
    result.mortgages.forEach((m, i) => {
      console.log(`   ${i + 1}. Priority #${m.priority} - ₩${m.maxSecuredAmount.toLocaleString()} (${m.registrationDate}) [${m.seniority}]`);
    });

    console.log(`\n✅ Jeonse/Lease rights found: ${result.jeonseRights.length}`);
    result.jeonseRights.forEach((j, i) => {
      console.log(`   ${i + 1}. ${j.type} - ₩${j.amount.toLocaleString()} (${j.registrationDate})`);
    });

    console.log(`\n💰 Total mortgage amount: ₩${result.totalMortgageAmount.toLocaleString()}`);
    console.log(`💰 Total estimated principal: ₩${result.totalEstimatedPrincipal.toLocaleString()}`);

    console.log('\n' + '='.repeat(80));

    // Expected from the images:
    console.log('\n📋 EXPECTED (from document images):');
    console.log('   Mortgages: #2, #4, #5, #6, #7, #8, #9, #10 (8 mortgages)');
    console.log('   Lease rights: #11 임차권설정 ₩13,000,000');
    console.log('\n⚠️  Compare with actual results above');

  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testCheongye().catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
