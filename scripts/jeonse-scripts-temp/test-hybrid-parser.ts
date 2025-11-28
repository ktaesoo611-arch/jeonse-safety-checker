/**
 * Test Hybrid Parser (OCR + Form Parser)
 * Uses OCR to find section, Form Parser to extract structured data
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { EnhancedOCRService } from '../lib/services/ocr-service-enhanced';
import { HybridDeunggibuParser } from '../lib/analyzers/hybrid-deunggibu-parser';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testHybridParser() {
  console.log('='.repeat(80));
  console.log('Hybrid Parser Test - OCR + Form Parser');
  console.log('='.repeat(80));
  console.log();

  const testDir = path.join(process.cwd(), 'test-documents');

  if (!fs.existsSync(testDir)) {
    console.error('❌ test-documents folder not found');
    process.exit(1);
  }

  // Find all PDF files
  const files = fs.readdirSync(testDir)
    .filter(f => f.endsWith('.pdf'))
    .map(f => path.join(testDir, f));

  if (files.length === 0) {
    console.error('❌ No PDF files found in test-documents/');
    process.exit(1);
  }

  console.log(`Found ${files.length} test document(s)\n`);

  const ocrService = new EnhancedOCRService();
  const parser = new HybridDeunggibuParser();

  let totalSuccess = 0;
  let totalFailed = 0;

  for (const file of files) {
    const fileName = path.basename(file);
    console.log('\n' + '='.repeat(80));
    console.log(`Testing: ${fileName}`);
    console.log('='.repeat(80));

    try {
      // Read PDF
      const buffer = fs.readFileSync(file);

      // Extract with Form Parser (gets both text and tables)
      const { text, tables } = await ocrService.extractStructuredData(buffer);

      console.log(`\n📄 Extracted: ${text.length} chars, ${tables.length} tables`);

      // Parse using hybrid approach
      const mortgages = parser.parseMortgages(text, tables);

      if (mortgages.length > 0) {
        parser.debugPrintMortgages(mortgages);

        const totalAmount = mortgages.reduce((sum, m) => sum + m.maxSecuredAmount, 0);
        const totalPrincipal = mortgages.reduce((sum, m) => sum + m.estimatedPrincipal, 0);

        console.log('='.repeat(80));
        console.log('SUMMARY');
        console.log('='.repeat(80));
        console.log(`✅ Successfully extracted ${mortgages.length} mortgage(s)`);
        console.log(`💰 Total mortgage amount: ₩${totalAmount.toLocaleString()}`);
        console.log(`💵 Estimated principal: ₩${totalPrincipal.toLocaleString()}`);
        console.log('\nCreditors:');
        mortgages.forEach((m, i) => {
          console.log(`  ${i + 1}. ${m.creditor} - ₩${m.maxSecuredAmount.toLocaleString()}`);
        });

        totalSuccess++;
      } else {
        console.log('⚠️  No mortgages found (document may have no active mortgages)');
        totalSuccess++;
      }

    } catch (error: any) {
      console.error(`\n❌ Failed to test ${fileName}: ${error.message}`);
      console.error(error.stack);
      totalFailed++;
    }
  }

  // Final summary
  console.log('\n\n' + '='.repeat(80));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total documents: ${files.length}`);
  console.log(`Successful: ${totalSuccess}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success rate: ${(totalSuccess / files.length * 100).toFixed(1)}%`);
  console.log('='.repeat(80));
}

// Run test
testHybridParser().catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
