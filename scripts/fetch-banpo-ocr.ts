/**
 * Fetch the actual OCR text from the 반포자이 document to debug parsing issue
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'set' : 'missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchOCRText() {
  const analysisId = '7ffc6d1d-917e-4858-8598-eff454b92624'; // Latest upload with OCR processor

  console.log('Fetching data for analysis:', analysisId);
  console.log('');

  // First, check the analysis_results table
  console.log('=== Checking analysis_results table ===');
  const { data: analysisResult, error: analysisError } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('id', analysisId)
    .single();

  if (analysisError) {
    console.error('Error fetching analysis_results:', analysisError);
  } else if (analysisResult) {
    console.log('Status:', analysisResult.status);
    console.log('Safety Score:', analysisResult.safety_score);
    console.log('Risk Level:', analysisResult.risk_level);
    console.log('Has deunggibu_data:', !!analysisResult.deunggibu_data);

    if (analysisResult.deunggibu_data) {
      const deunggibu = analysisResult.deunggibu_data;
      console.log('\nDeunggibu data summary:');
      console.log('  Mortgages:', deunggibu.deunggibu?.mortgages?.length || 0);
      console.log('  Jeonse/Lease:', deunggibu.deunggibu?.jeonseRights?.length || 0);
      console.log('  debtRanking:', deunggibu.debtRanking?.length || 0);

      if (deunggibu.debtRanking && deunggibu.debtRanking.length > 0) {
        console.log('\nDebt Ranking:');
        deunggibu.debtRanking.forEach((d: any) => {
          console.log(`  - ${d.type}: ₩${(d.amount / 100000000).toFixed(2)}억 (${d.registrationDate})`);
        });
      }
    }
  } else {
    console.log('No analysis_results found');
  }

  console.log('\n' + '='.repeat(80));
  console.log('=== Checking uploaded_documents table ===\n');

  const { data: documents, error } = await supabase
    .from('uploaded_documents')
    .select('*')
    .eq('analysis_id', analysisId);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!documents || documents.length === 0) {
    console.log('No documents found');
    return;
  }

  console.log(`Found ${documents.length} document(s)\n`);

  for (const doc of documents) {
    console.log('Document:', doc.document_type);
    console.log('File name:', doc.file_name);
    console.log('Created:', doc.created_at);

    if (doc.ocr_text) {
      console.log('\n=== OCR Text (first 2000 chars) ===');
      console.log(doc.ocr_text.substring(0, 2000));
      console.log('\n... (truncated)');

      // Save full OCR text to file
      fs.writeFileSync(
        'C:\\Projects\\jeonse-safety-checker\\scripts\\banpo-ocr-full.txt',
        doc.ocr_text,
        'utf-8'
      );
      console.log('\n✅ Full OCR text saved to: scripts/banpo-ocr-full.txt');

      // Extract and save just the summary section
      const summaryMatch = doc.ocr_text.match(/3\.\s*\(근\)저당권\s+및\s+전세권\s+등[\s\S]*?(?=\[참고사항|출력일시|$)/i);
      if (summaryMatch) {
        fs.writeFileSync(
          'C:\\Projects\\jeonse-safety-checker\\scripts\\banpo-summary-section.txt',
          summaryMatch[0],
          'utf-8'
        );
        console.log('✅ Summary section saved to: scripts/banpo-summary-section.txt');
        console.log('\n=== Summary Section ===');
        console.log(summaryMatch[0]);
      } else {
        console.log('❌ Could not find summary section in OCR text');
      }
    } else {
      console.log('No OCR text available');
    }

    if (doc.parsed_data) {
      console.log('\n=== Parsed Data ===');
      console.log('Mortgages:', doc.parsed_data.deunggibu?.mortgages?.length || 0);
      console.log('Jeonse/Lease:', doc.parsed_data.deunggibu?.jeonseRights?.length || 0);

      if (doc.parsed_data.deunggibu?.mortgages?.length > 0) {
        console.log('\nMortgages found:');
        doc.parsed_data.deunggibu.mortgages.forEach((m: any, i: number) => {
          console.log(`  ${i + 1}. Priority #${m.priorityNumber || m.priority}: ₩${parseInt(m.maxAmount || m.amount).toLocaleString('ko-KR')}`);
          console.log(`     Date: ${m.registrationDate}`);
          console.log(`     Creditor: ${m.creditor}`);
        });
      }

      if (doc.parsed_data.deunggibu?.jeonseRights?.length > 0) {
        console.log('\nJeonse/Lease rights found:');
        doc.parsed_data.deunggibu.jeonseRights.forEach((j: any, i: number) => {
          console.log(`  ${i + 1}. Priority #${j.priorityNumber || j.priority}: ₩${parseInt(j.amount).toLocaleString('ko-KR')}`);
          console.log(`     Type: ${j.type}`);
          console.log(`     Date: ${j.registrationDate}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }
}

fetchOCRText().catch(console.error);
