import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ncqchpvhvoqeeydtmhut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcWNocHZodm9xZWV5ZHRtaHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTEzOTIsImV4cCI6MjA3ODI2NzM5Mn0.MZaXYLb8OTtrRc9rh3gHTGbylIMa5JVsscTLxlxXyfQ'
);

async function debugGangnamLH() {
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

  console.log('OCR text length:', ocrText.length);

  // Find the summary section
  const summaryMatch = ocrText.match(/3\.\s*\(근\)저당권\s*및\s*전세권\s*등\s*\(\s*을\s*구\s*\)(.*?)(?=\[?\s*참\s*고\s*사\s*항\s*\]?|$)/s);

  if (!summaryMatch) {
    console.error('❌ Could not find summary section');
    return;
  }

  const summarySection = summaryMatch[1];
  console.log('\n=== Summary Section ===');
  console.log('Length:', summarySection.length);

  // Clean the text (same as the parser does)
  const cleanedSection = summarySection.replace(/\s+/g, ' ').trim();
  console.log('Cleaned length:', cleanedSection.length);

  // Search for entry #43
  console.log('\n=== Looking for entry #43 ===');
  if (cleanedSection.includes('43')) {
    console.log('✓ Found "43" in cleaned section');

    const index = cleanedSection.indexOf('43');
    const context = cleanedSection.substring(Math.max(0, index - 50), Math.min(cleanedSection.length, index + 400));
    console.log('\n--- Context around "43" (450 chars) ---');
    console.log(context);
    console.log('--- End context ---\n');
  } else {
    console.log('✗ "43" NOT found in cleaned section');
  }

  // Test the mortgage pattern
  console.log('\n=== Testing Mortgage Pattern ===\n');

  // Pattern 3: No registration number, creditor at end
  const pattern3 = /(\d+)\s+근저당권설정\s+(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일[^금]*?채권최고액\s+금\s*([\d,\s]+)원[^근]*?근저당권자\s+([^\s]+(?:\s+[^\s]+)*?)(?=\s+\d+(?:-\d+)?\s+근저당권|\s+\d+(?:-\d+)?\s+전세권|\s+대상소유자|$)/gs;

  let match;
  let found43 = false;

  while ((match = pattern3.exec(cleanedSection)) !== null) {
    const priority = parseInt(match[1]);
    if (priority === 43) {
      console.log(`✅ Pattern 3 MATCHED entry #43!`);
      console.log('Full match:', match[0]);
      console.log('Groups:', {
        priority: match[1],
        year: match[2],
        month: match[3],
        day: match[4],
        amount: match[5],
        creditor: match[6]
      });
      found43 = true;
    }
  }

  if (!found43) {
    console.log('❌ Pattern 3 did not match entry #43');

    // Try a simpler pattern
    console.log('\n=== Testing simpler pattern ===');
    const simplePattern = /43\s+근저당권설정.*?(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일.*?채권최고액\s+금\s*([\d,\s]+)원/s;
    const simpleMatch = cleanedSection.match(simplePattern);

    if (simpleMatch) {
      console.log('✅ Simple pattern matched!');
      console.log('Match:', simpleMatch[0]);
    } else {
      console.log('❌ Simple pattern also failed');
    }
  }
}

debugGangnamLH();
