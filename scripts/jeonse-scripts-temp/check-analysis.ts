import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const analysisId = '27512f63-e15b-4eb6-9921-428f1252b4ec';

async function checkAnalysis() {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('id', analysisId)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('='.repeat(80));
  console.log('Analysis Details');
  console.log('='.repeat(80));
  console.log('Building:', data.properties?.building_name);
  console.log('Address:', data.properties?.address);
  console.log('Has deunggibu_data:', !!data.deunggibu_data);

  if (data.deunggibu_data?.deunggibu) {
    const deunggibu = data.deunggibu_data.deunggibu;
    console.log('\n📊 Deunggibu Summary:');
    console.log('Mortgages found:', deunggibu.mortgages?.length || 0);

    if (deunggibu.mortgages && deunggibu.mortgages.length > 0) {
      console.log('\n💰 Mortgage Details:');
      deunggibu.mortgages.forEach((m: any, i: number) => {
        console.log(`  ${i+1}. Creditor: ${m.creditor}`);
        console.log(`     Amount: ₩${m.amount?.toLocaleString()}`);
        console.log(`     Priority: ${m.priority}`);
        console.log(`     Date: ${m.registrationDate}`);
      });
    } else {
      console.log('\n❌ NO MORTGAGES DETECTED');
    }

    console.log('\n💵 Financial Summary:');
    console.log('Total mortgage amount:', deunggibu.totalMortgageAmount?.toLocaleString());
    console.log('Estimated principal:', deunggibu.totalEstimatedPrincipal?.toLocaleString());

    // Check if raw OCR text is in deunggibu_data
    if (data.deunggibu_data.rawText) {
      const rawText = data.deunggibu_data.rawText;
      console.log('\n📄 Raw OCR Text Preview (first 1500 chars):');
      console.log(rawText.substring(0, 1500));

      // Check for mortgage summary section
      if (rawText.includes('(근)저당권 및 전세권 등')) {
        console.log('\n✅ Found mortgage summary section in OCR');
        const summaryStart = rawText.indexOf('3. (근)저당권 및 전세권 등');
        const summarySection = rawText.substring(summaryStart, summaryStart + 800);
        console.log('\nSummary section:');
        console.log(summarySection);
      } else {
        console.log('\n❌ Mortgage summary section NOT found in OCR');
        console.log('Checking for alternative patterns...');
        if (rawText.includes('근저당권')) {
          console.log('  ✓ Found "근저당권" in text');
        }
        if (rawText.includes('전세권')) {
          console.log('  ✓ Found "전세권" in text');
        }
      }
    }
  }

  console.log('\n='.repeat(80));
}

checkAnalysis();
