import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ncqchpvhvoqeeydtmhut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcWNocHZodm9xZWV5ZHRtaHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTEzOTIsImV4cCI6MjA3ODI2NzM5Mn0.MZaXYLb8OTtrRc9rh3gHTGbylIMa5JVsscTLxlxXyfQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugJeonseOCR() {
  // The analysis ID from the logs
  const analysisId = 'a29d7698-b19c-4f36-811b-704150c71efe';

  console.log('Fetching analysis:', analysisId);

  // Query the documents table to get the OCR text
  const { data: analysis, error: analysisError } = await supabase
    .from('analysis_results')
    .select('*, uploaded_documents(ocr_text)')
    .eq('id', analysisId)
    .single();

  if (analysisError || !analysis) {
    console.error('Error:', analysisError);
    return;
  }

  console.log('\n=== Analysis Info ===');
  console.log('Status:', analysis.status);
  console.log('Building:', analysis.deunggibu_data?.deunggibu?.buildingName || 'N/A');

  const ocrText = analysis.uploaded_documents?.[0]?.ocr_text || analysis.uploaded_documents?.ocr_text;

  if (!ocrText) {
    console.error('❌ No OCR text found');
    return;
  }

  console.log('\n=== OCR Text Length ===');
  console.log(ocrText.length, 'characters');

  // Find the summary section
  const summaryMatch = ocrText.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등[\s\S]*?(?=\[참고사항|출력일시|$)/i);

  if (!summaryMatch) {
    console.error('❌ Could not find summary section (3. (근)저당권 및 전세권 등)');
    return;
  }

  const summarySection = summaryMatch[0];
  console.log('\n=== Summary Section Found ===');
  console.log('Length:', summarySection.length, 'characters');
  console.log('\n--- First 1000 characters ---');
  console.log(summarySection.substring(0, 1000));
  console.log('\n--- Full Summary Section ---');
  console.log(summarySection);

  // Now test the jeonse pattern on this ACTUAL OCR text
  console.log('\n\n=== Testing Jeonse Pattern ===');
  const jeonsePattern = /(\d+)\s+전세권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?전세금\s+금\s*([\d,\s]+)원[^금]*?전세권자\s+((?:(?!대상소유자|\d+\s+근저당권|\d+\s+전세권|\d+\s+임차권|출력일시).)+?)(?=\s+대상소유자|\s+\d+\s+근저당권|\s+\d+\s+전세권|\s+\d+\s+임차권|\s+출력일시|$)/gs;

  let match;
  let matchCount = 0;

  while ((match = jeonsePattern.exec(summarySection)) !== null) {
    matchCount++;
    const [fullMatch, priority, year, month, day, amount, tenant] = match;
    console.log(`\n✅ Match ${matchCount}:`);
    console.log(`  Entry #${priority}`);
    console.log(`  Date: ${year}-${month}-${day}`);
    console.log(`  Amount: ${amount}`);
    console.log(`  Tenant: ${tenant.trim()}`);
  }

  if (matchCount === 0) {
    console.log('\n❌ NO MATCHES FOUND');
    console.log('\n🔍 Diagnostic: Checking for individual components...\n');

    if (summarySection.includes('전세권설정')) {
      console.log('✓ Found "전세권설정" in text');
      const index = summarySection.indexOf('전세권설정');
      console.log('\n--- Context around "전세권설정" (500 chars) ---');
      console.log(summarySection.substring(Math.max(0, index - 100), index + 400));
    } else {
      console.log('✗ "전세권설정" NOT found in text');
    }

    if (summarySection.includes('전세금')) {
      console.log('\n✓ Found "전세금" in text');
    } else {
      console.log('\n✗ "전세금" NOT found in text');
    }

    if (summarySection.includes('전세권자')) {
      console.log('✓ Found "전세권자" in text');
    } else {
      console.log('✗ "전세권자" NOT found in text');
    }
  } else {
    console.log(`\n✅ Total matches: ${matchCount}`);
  }
}

debugJeonseOCR();
