/**
 * Test Form Parser vs Generic OCR
 * Compares structured table extraction with regex-based approach
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { EnhancedOCRService } from '../lib/services/ocr-service-enhanced';
import { StructuredDeunggibuParser } from '../lib/analyzers/structured-deunggibu-parser';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testFormParser() {
  console.log('='.repeat(80));
  console.log('Document AI Form Parser - Test Script');
  console.log('='.repeat(80));
  console.log();

  // Check if processor ID is configured
  const processorId = process.env.DOCUMENT_AI_PROCESSOR_ID;
  if (!processorId) {
    console.error('❌ DOCUMENT_AI_PROCESSOR_ID not found in .env.local');
    console.log('\nPlease follow these steps:');
    console.log('1. Create Form Parser processor in Google Cloud Console');
    console.log('2. Copy the processor ID');
    console.log('3. Add to .env.local: DOCUMENT_AI_PROCESSOR_ID=your-processor-id');
    console.log('\nSee: scripts/setup-form-parser.md for detailed instructions');
    process.exit(1);
  }

  console.log('✅ Processor ID configured:', processorId);
  console.log();

  // Check for test PDF file
  const testFilePath = path.join(process.cwd(), 'test-documents', '센트라스 제101동 제402호_registry.pdf');

  if (!fs.existsSync(testFilePath)) {
    console.error(`❌ Test file not found: ${testFilePath}`);
    console.log('\nPlease:');
    console.log('1. Create a "test-documents" folder in project root');
    console.log('2. Add a test PDF (e.g., 센트라스 등기부등본)');
    console.log('3. Name it: sentras.pdf');
    console.log('\nOr update the testFilePath in this script');
    process.exit(1);
  }

  console.log('✅ Test file found:', testFilePath);
  console.log();

  try {
    // Read PDF file
    console.log('📄 Reading PDF file...');
    const buffer = fs.readFileSync(testFilePath);
    console.log(`   File size: ${(buffer.length / 1024).toFixed(2)} KB`);
    console.log();

    // Initialize Form Parser
    console.log('🚀 Initializing Form Parser...');
    const ocrService = new EnhancedOCRService();
    console.log();

    // Extract structured data
    console.log('📊 Extracting structured data from PDF...');
    const { text, tables, formFields } = await ocrService.extractStructuredData(buffer);
    console.log();

    // Show results
    console.log('='.repeat(80));
    console.log('EXTRACTION RESULTS');
    console.log('='.repeat(80));
    console.log();

    console.log(`📝 Text extracted: ${text.length} characters`);
    console.log(`📋 Tables found: ${tables.length}`);
    console.log(`📌 Form fields: ${Object.keys(formFields).length}`);
    console.log();

    // Show table details
    if (tables.length > 0) {
      console.log('📊 Table Details:');
      tables.forEach((table, index) => {
        console.log(`\n  Table ${index + 1}:`);
        console.log(`    Headers: [${table.headers.join(', ')}]`);
        console.log(`    Rows: ${table.rows.length}`);

        // Show first few rows as preview
        if (table.rows.length > 0) {
          console.log(`    Preview (first 3 rows):`);
          table.rows.slice(0, 3).forEach((row, rowIndex) => {
            console.log(`      Row ${rowIndex + 1}: [${row.join(' | ')}]`);
          });
        }
      });
      console.log();
    }

    // Parse mortgages using structured parser
    console.log('='.repeat(80));
    console.log('PARSING MORTGAGES');
    console.log('='.repeat(80));
    console.log();

    const parser = new StructuredDeunggibuParser();
    const mortgages = parser.parseMortgages(tables);

    if (mortgages.length > 0) {
      parser.debugPrintMortgages(mortgages);

      console.log('='.repeat(80));
      console.log('SUMMARY');
      console.log('='.repeat(80));
      console.log();
      console.log(`✅ Successfully extracted ${mortgages.length} mortgage(s)`);
      console.log();

      const totalAmount = mortgages.reduce((sum, m) => sum + m.maxSecuredAmount, 0);
      const totalPrincipal = mortgages.reduce((sum, m) => sum + m.estimatedPrincipal, 0);

      console.log(`💰 Total mortgage amount: ₩${totalAmount.toLocaleString()}`);
      console.log(`💵 Estimated principal: ₩${totalPrincipal.toLocaleString()}`);
      console.log();

      console.log('Creditors:');
      mortgages.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.creditor} - ₩${m.maxSecuredAmount.toLocaleString()}`);
      });

    } else {
      console.log('❌ No mortgages found');
      console.log('\nPossible reasons:');
      console.log('1. Document has no active mortgages');
      console.log('2. Table structure different from expected format');
      console.log('3. OCR quality issues');
      console.log('\nCheck the table details above to debug');
    }

    console.log();
    console.log('='.repeat(80));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(80));
    console.error();
    console.error('Error:', error.message);
    console.error();

    if (error.message.includes('NOT_FOUND')) {
      console.error('Processor not found. Please check:');
      console.error('1. Processor ID in .env.local is correct');
      console.error('2. Processor exists in Google Cloud Console');
      console.error('3. Region matches (us vs eu)');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.error('Permission denied. Please check:');
      console.error('1. Service account credentials are correct');
      console.error('2. Service account has "Document AI API User" role');
    } else if (error.message.includes('INVALID_ARGUMENT')) {
      console.error('Invalid argument. Please check:');
      console.error('1. PDF file is valid');
      console.error('2. File is not corrupted');
      console.error('3. File is not password-protected');
    }

    console.error();
    console.error('Full error stack:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testFormParser();
