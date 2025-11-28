import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ncqchpvhvoqeeydtmhut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcWNocHZodm9xZWV5ZHRtaHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTEzOTIsImV4cCI6MjA3ODI2NzM5Mn0.MZaXYLb8OTtrRc9rh3gHTGbylIMa5JVsscTLxlxXyfQ'
);

async function debugMortgage43() {
  const analysisId = '0dea49fc-722a-4082-a673-7a5332c6426a';

  console.log('Fetching analysis:', analysisId);

  const { data: analysis, error } = await supabase
    .from('analysis_results')
    .select('*, uploaded_documents(ocr_text)')
    .eq('id', analysisId)
    .single();

  if (error || !analysis) {
    console.error('Error:', error);
    return;
  }

  console.log('\n=== Analysis Info ===');
  console.log('Building:', analysis.deunggibu_data?.deunggibu?.buildingName || 'N/A');

  const ocrText = analysis.uploaded_documents?.[0]?.ocr_text || analysis.uploaded_documents?.ocr_text;

  if (!ocrText) {
    console.error('❌ No OCR text found');
    return;
  }

  // Find the summary section
  const summaryMatch = ocrText.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등[^\n]*?\n([\s\S]*?)(?=\[?\s*참\s*고\s*사\s*항\s*\]?|$)/i);

  if (!summaryMatch) {
    console.error('❌ Could not find summary section');
    return;
  }

  const summarySection = summaryMatch[1];
  console.log('\n=== Summary Section ===');
  console.log(summarySection);

  console.log('\n\n=== Looking for entry #43 ===');

  // Search for "43" in the summary section
  if (summarySection.includes('43')) {
    console.log('✓ Found "43" in summary section');

    // Find the context around "43"
    const index = summarySection.indexOf('43');
    const context = summarySection.substring(Math.max(0, index - 50), index + 300);
    console.log('\n--- Context around "43" ---');
    console.log(context);
    console.log('--- End context ---\n');
  } else {
    console.log('✗ "43" NOT found in summary section');
  }

  // Test all 6 mortgage patterns
  console.log('\n=== Testing Mortgage Patterns ===\n');

  // Pattern 1: Standard format with creditor after registration number
  const pattern1 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^제]*?제(\d+)호\s+근저당권자\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+\d+\s+근저당권|$)/gs;

  // Pattern 2: Creditor name before date
  const pattern2 = /(\d+)\s+근저당권설정\s+([^\d]+?)\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원/gs;

  // Pattern 3: No registration number, creditor at end
  const pattern3 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+\d+(?:-\d+)?\s+근저당권|\s+\d+(?:-\d+)?\s+전세권|\s+대상소유자|$)/gs;

  // Pattern 4: Generic fallback
  const pattern4 = /(\d+)\s+근저당권설정[^\d]*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?채권최고액\s+금\s*([\d,\s]+)원/gs;

  // Pattern 5: Creditor before amount
  const pattern5 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^근]*?근저당권자\s+([^\s]+(?:\s+[^\s]+)*?)\s+채권최고액\s+금\s*([\d,\s]+)원/gs;

  // Pattern 6: For malformed OCR where date comes before 근저당권설정
  const pattern6 = /(\d+)\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^근]*?근저당권설정.*?채권최고액\s+금\s*([\d,\s]+)원.*?근저당권자\s+([^\n]+?)(?=\s+\d+\s+|$)/gs;

  const patterns = [pattern1, pattern2, pattern3, pattern4, pattern5, pattern6];
  const patternNames = ['Pattern 1', 'Pattern 2', 'Pattern 3', 'Pattern 4', 'Pattern 5', 'Pattern 6'];

  patterns.forEach((pattern, i) => {
    let match;
    let found = false;
    while ((match = pattern.exec(summarySection)) !== null) {
      const priority = parseInt(match[1]);
      if (priority === 43) {
        console.log(`✅ ${patternNames[i]} MATCHED entry #43!`);
        console.log('Full match:', match[0]);
        console.log('Match groups:', match);
        found = true;
      }
    }
    if (!found) {
      console.log(`❌ ${patternNames[i]} did not match entry #43`);
    }
  });
}

debugMortgage43();
