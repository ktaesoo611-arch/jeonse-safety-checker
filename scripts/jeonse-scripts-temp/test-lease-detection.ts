/**
 * Test Lease Right Detection
 * Specifically tests "임차권설정" pattern detection
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { OCRService } from '../lib/services/ocr-service';
import { DeunggibuParser } from '../lib/analyzers/deunggibu-parser';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testLeaseDetection() {
  console.log('='.repeat(80));
  console.log('Lease Right Detection Test - 임차권설정 Pattern');
  console.log('='.repeat(80));
  console.log();

  const testFile = path.join(process.cwd(), 'test/registry_report/한울아파트 제에이동 제602호_registry.pdf');

  if (!fs.existsSync(testFile)) {
    console.error('❌ Test file not found:', testFile);
    process.exit(1);
  }

  console.log(`Testing: 한울아파트 제에이동 제602호_registry.pdf\n`);

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
      console.log(`   ${i + 1}. Priority #${m.priority} - ₩${m.maxSecuredAmount.toLocaleString()} (${m.registrationDate})`);
    });

    console.log(`\n✅ Jeonse/Lease rights found: ${result.jeonseRights.length}`);
    result.jeonseRights.forEach((j, i) => {
      console.log(`   ${i + 1}. ${j.type} - ₩${j.amount.toLocaleString()} (${j.registrationDate})`);
      console.log(`      Tenant: ${j.tenant}`);
    });

    console.log(`\n✅ Total debt: ₩${result.totalMortgageAmount.toLocaleString()}`);

    if (result.jeonseRights.length > 0) {
      const hasLeaseRight = result.jeonseRights.some(j => j.type === '임차권설정');
      if (hasLeaseRight) {
        console.log('\n🎉 SUCCESS! 임차권설정 (lease right registration) detected correctly!');
      } else {
        console.log('\n⚠️  WARNING: Found jeonse/lease rights but no 임차권설정 type');
      }
    } else {
      console.log('\n❌ FAILED: No jeonse/lease rights detected (expected at least 1 임차권설정)');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testLeaseDetection().catch(error => {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
});
