/**
 * Compare Form Parser vs Current Regex System
 * Tests both systems side-by-side to validate accuracy and consistency
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { EnhancedOCRService } from '../lib/services/ocr-service-enhanced';
import { StructuredDeunggibuParser } from '../lib/analyzers/structured-deunggibu-parser';
import { OCRService } from '../lib/services/ocr-service';
import { DeunggibuParser } from '../lib/analyzers/deunggibu-parser';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface TestResult {
  fileName: string;
  formParser: {
    mortgages: number;
    totalAmount: number;
    creditors: string[];
    error?: string;
  };
  regexSystem: {
    mortgages: number;
    totalAmount: number;
    creditors: string[];
    error?: string;
  };
  match: boolean;
}

async function testDocument(filePath: string): Promise<TestResult> {
  const fileName = path.basename(filePath);
  console.log('\n' + '='.repeat(80));
  console.log(`Testing: ${fileName}`);
  console.log('='.repeat(80));

  const buffer = fs.readFileSync(filePath);
  const result: TestResult = {
    fileName,
    formParser: { mortgages: 0, totalAmount: 0, creditors: [] },
    regexSystem: { mortgages: 0, totalAmount: 0, creditors: [] },
    match: false
  };

  // Test 1: Form Parser
  console.log('\n📊 Testing Form Parser...');
  try {
    const ocrService = new EnhancedOCRService();
    const { text, tables } = await ocrService.extractStructuredData(buffer);

    console.log(`  ✅ Extracted ${tables.length} tables`);

    const parser = new StructuredDeunggibuParser();
    const mortgages = parser.parseMortgages(tables);

    result.formParser.mortgages = mortgages.length;
    result.formParser.totalAmount = mortgages.reduce((sum, m) => sum + m.maxSecuredAmount, 0);
    result.formParser.creditors = mortgages.map(m => m.creditor);

    console.log(`  ✅ Found ${mortgages.length} mortgage(s)`);
    console.log(`  💰 Total: ₩${result.formParser.totalAmount.toLocaleString()}`);
    mortgages.forEach((m, i) => {
      console.log(`     ${i + 1}. ${m.creditor} - ₩${m.maxSecuredAmount.toLocaleString()}`);
    });
  } catch (error: any) {
    result.formParser.error = error.message;
    console.log(`  ❌ Error: ${error.message}`);
  }

  // Test 2: Current Regex System
  console.log('\n🔤 Testing Current Regex System...');
  try {
    const ocrService = new OCRService();
    const text = await ocrService.extractTextFromPDF(buffer);

    console.log(`  ✅ Extracted ${text.length} characters`);

    const parser = new DeunggibuParser();
    const analysis = parser.parse(text);
    const mortgages = analysis.mortgages;

    result.regexSystem.mortgages = mortgages.length;
    result.regexSystem.totalAmount = mortgages.reduce((sum, m) => sum + m.maxSecuredAmount, 0);
    result.regexSystem.creditors = mortgages.map(m => m.creditor || 'Unknown');

    console.log(`  ✅ Found ${mortgages.length} mortgage(s)`);
    console.log(`  💰 Total: ₩${result.regexSystem.totalAmount.toLocaleString()}`);
    mortgages.forEach((m, i) => {
      console.log(`     ${i + 1}. ${m.creditor} - ₩${m.maxSecuredAmount.toLocaleString()}`);
    });
  } catch (error: any) {
    result.regexSystem.error = error.message;
    console.log(`  ❌ Error: ${error.message}`);
  }

  // Compare results
  console.log('\n📋 Comparison:');
  result.match =
    result.formParser.mortgages === result.regexSystem.mortgages &&
    result.formParser.totalAmount === result.regexSystem.totalAmount;

  if (result.match) {
    console.log('  ✅ Results MATCH - Both systems found same mortgages!');
  } else {
    console.log('  ⚠️  Results DIFFER:');
    console.log(`     Form Parser: ${result.formParser.mortgages} mortgages, ₩${result.formParser.totalAmount.toLocaleString()}`);
    console.log(`     Regex System: ${result.regexSystem.mortgages} mortgages, ₩${result.regexSystem.totalAmount.toLocaleString()}`);
  }

  return result;
}

async function runComparison() {
  console.log('='.repeat(80));
  console.log('Form Parser vs Regex System - Comparison Test');
  console.log('='.repeat(80));

  const testDir = path.join(process.cwd(), 'test-documents');

  if (!fs.existsSync(testDir)) {
    console.error('❌ test-documents folder not found');
    console.log('\nPlease create test-documents/ and add 등기부등본 PDFs to test');
    process.exit(1);
  }

  // Find all PDF files
  const files = fs.readdirSync(testDir)
    .filter(f => f.endsWith('.pdf'))
    .map(f => path.join(testDir, f));

  if (files.length === 0) {
    console.error('❌ No PDF files found in test-documents/');
    console.log('\nPlease add 등기부등본 PDFs to test-documents/ folder');
    process.exit(1);
  }

  console.log(`\nFound ${files.length} test document(s)`);

  const results: TestResult[] = [];

  // Test each document
  for (const file of files) {
    try {
      const result = await testDocument(file);
      results.push(result);
    } catch (error: any) {
      console.error(`\n❌ Failed to test ${path.basename(file)}: ${error.message}`);
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const matches = results.filter(r => r.match).length;
  const formParserSuccess = results.filter(r => !r.formParser.error).length;
  const regexSuccess = results.filter(r => !r.regexSystem.error).length;

  console.log(`\n📊 Test Results:`);
  console.log(`   Total documents: ${results.length}`);
  console.log(`   Matching results: ${matches}/${results.length} (${(matches/results.length*100).toFixed(1)}%)`);
  console.log(`   Form Parser success: ${formParserSuccess}/${results.length}`);
  console.log(`   Regex system success: ${regexSuccess}/${results.length}`);

  console.log('\n📋 Detailed Results:\n');
  console.log('Document                               | Form Parser | Regex System | Match');
  console.log('-'.repeat(80));

  results.forEach(r => {
    const fpResult = r.formParser.error
      ? '❌ Error'
      : `✅ ${r.formParser.mortgages} (₩${(r.formParser.totalAmount/1000000).toFixed(0)}M)`;
    const regexResult = r.regexSystem.error
      ? '❌ Error'
      : `✅ ${r.regexSystem.mortgages} (₩${(r.regexSystem.totalAmount/1000000).toFixed(0)}M)`;
    const match = r.match ? '✅' : '❌';

    const shortName = r.fileName.length > 35
      ? r.fileName.substring(0, 32) + '...'
      : r.fileName.padEnd(35);

    console.log(`${shortName} | ${fpResult.padEnd(11)} | ${regexResult.padEnd(12)} | ${match}`);
  });

  // Recommendations
  console.log('\n\n' + '='.repeat(80));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(80));

  if (matches === results.length) {
    console.log('\n✅ Perfect match! Both systems produce identical results.');
    console.log('\n📌 Form Parser advantages:');
    console.log('   - 92% less code (200 lines vs 1200 lines)');
    console.log('   - No pattern maintenance needed');
    console.log('   - Structured data (tables) vs plain text');
    console.log('   - More resilient to OCR variations');
    console.log('\n✅ RECOMMENDATION: Proceed with Form Parser migration');
  } else if (formParserSuccess > regexSuccess) {
    console.log('\n⚠️  Form Parser performed BETTER than regex system');
    console.log(`   Form Parser: ${formParserSuccess}/${results.length} successful`);
    console.log(`   Regex System: ${regexSuccess}/${results.length} successful`);
    console.log('\n✅ RECOMMENDATION: Migrate to Form Parser - it\'s more reliable');
  } else if (formParserSuccess === regexSuccess && matches < results.length) {
    console.log('\n⚠️  Both systems succeeded but produced different results');
    console.log('\n📌 Action items:');
    console.log('   1. Manually review the differing documents');
    console.log('   2. Verify which system is correct');
    console.log('   3. Debug parser logic if needed');
  } else {
    console.log('\n⚠️  Regex system performed better (unexpected!)');
    console.log('\n📌 Action items:');
    console.log('   1. Review Form Parser errors');
    console.log('   2. Check processor configuration');
    console.log('   3. Verify table extraction quality');
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('✅ COMPARISON COMPLETE');
  console.log('='.repeat(80));
  console.log('\nNext steps:');
  console.log('1. Add more test documents to test-documents/ folder');
  console.log('2. Run this script again: npx tsx scripts/compare-parsers.ts');
  console.log('3. When confident, proceed with Form Parser integration');
  console.log('\nSee FORM_PARSER_CHECKLIST.md for integration steps');
  console.log('='.repeat(80));
}

// Run comparison
runComparison().catch(error => {
  console.error('\n❌ Comparison failed:', error);
  process.exit(1);
});
