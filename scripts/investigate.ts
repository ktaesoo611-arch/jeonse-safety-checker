import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const analysisId = '57dc0e0a-7f36-4922-9ed6-f5310d00c00d';

  console.log('=== Analysis:', analysisId, '===\n');

  // 1. Check analyses table
  const { data: analysis, error: aError } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', analysisId)
    .single();

  if (aError) {
    console.log('analyses error:', aError.message);
    return;
  }

  console.log('=== Analysis Record ===');
  console.log('Status:', analysis.status);
  console.log('Created:', analysis.created_at);
  console.log('Property ID:', analysis.property_id);

  // 2. Check uploaded_documents for parsed deunggibu data
  console.log('\n\n=== Uploaded Documents ===');
  const { data: uploadedDocs, error: uploadError } = await supabase
    .from('uploaded_documents')
    .select('*')
    .eq('analysis_id', analysisId);

  if (uploadError) {
    console.log('uploaded_documents error:', uploadError.message);
  } else if (uploadedDocs && uploadedDocs.length > 0) {
    console.log('Count:', uploadedDocs.length);
    uploadedDocs.forEach((doc: any, i: number) => {
      console.log(`\n${i+1}. document_type: ${doc.document_type}`);
      console.log('   Has parsed_data:', !!doc.parsed_data);
      if (doc.parsed_data) {
        const parsed = doc.parsed_data;
        console.log('   Building Year:', parsed.buildingYear);
        console.log('   Area:', parsed.area);
        console.log('   Jeonse Rights:', parsed.jeonseRights?.length || 0);
        console.log('   Active Jeonse Rights:', parsed.activeJeonseRights?.length || 0);
        console.log('   Mortgages:', parsed.mortgages?.length || 0);
        console.log('   Active Mortgages:', parsed.activeMortgages?.length || 0);
        console.log('   Liens:', parsed.liens?.length || 0);

        if (parsed.jeonseRights && parsed.jeonseRights.length > 0) {
          console.log('\n   --- Jeonse Rights Detail ---');
          parsed.jeonseRights.forEach((j: any, idx: number) => {
            console.log(`     ${idx+1}.`, JSON.stringify(j));
          });
        }

        if (parsed.activeJeonseRights && parsed.activeJeonseRights.length > 0) {
          console.log('\n   --- Active Jeonse Rights Detail ---');
          parsed.activeJeonseRights.forEach((j: any, idx: number) => {
            console.log(`     ${idx+1}.`, JSON.stringify(j));
          });
        }
      }

      // Check raw CODEF data for 주택임차권/임차권
      if (doc.ocr_text) {
        const rawStr = typeof doc.ocr_text === 'string' ? doc.ocr_text : JSON.stringify(doc.ocr_text);
        console.log('\n   --- Raw Data Patterns ---');
        const patterns = ['주택임차권', '임차권등기', '임차권설정', '전세권설정', '임차보증금'];

        // Check for building year in 표제부
        if (rawStr.includes('표제부')) {
          console.log('\n   --- Building Year Search in 표제부 ---');
          // Search for year patterns: YYYY년 건축, YYYY년 준공, 사용승인일 YYYY
          const yearPatterns = [
            /(\d{4})년[가-힣\s]*건축/g,
            /(\d{4})년[가-힣\s]*준공/g,
            /사용승인[일\s]*(\d{4})/g,
            /(\d{4})년[가-힣\s]*사용승인/g,
            /원인[^\n]*(\d{4})년/g
          ];
          yearPatterns.forEach(pattern => {
            const matches = rawStr.matchAll(pattern);
            for (const match of matches) {
              console.log(`   Year pattern found: ${match[0]} → year: ${match[1]}`);
            }
          });
        }
        patterns.forEach(p => {
          if (rawStr.includes(p)) {
            const idx = rawStr.indexOf(p);
            const context = rawStr.substring(Math.max(0, idx - 30), Math.min(rawStr.length, idx + 60));
            console.log(`   Found "${p}": ...${context}...`);
          }
        });
      }
    });
  } else {
    console.log('No uploaded_documents found');
  }

  // 3. Check analysis_results for the final risk analysis
  console.log('\n\n=== Analysis Results (deunggibu_data) ===');
  const { data: analysisResult, error: arError } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('id', analysisId)
    .single();

  if (arError) {
    console.log('analysis_results error:', arError.message);
  } else if (analysisResult) {
    const deunggibu = analysisResult.deunggibu_data;
    if (deunggibu) {
      console.log('Overall Score:', deunggibu.overallScore);
      console.log('Building Score:', deunggibu.buildingScore || deunggibu.scores?.buildingScore);
      console.log('Legal Score:', deunggibu.legalScore || deunggibu.scores?.legalScore);
      console.log('Building Year:', deunggibu.deunggibu?.buildingYear || deunggibu.buildingYear);

      console.log('\n--- Debt Ranking ---');
      if (deunggibu.debtRanking) {
        deunggibu.debtRanking.forEach((d: any, idx: number) => {
          console.log(`  ${idx+1}. ${d.type}: ${d.amount} (${d.registrationDate})`);
        });
      }

      console.log('\n--- Deunggibu nested data ---');
      if (deunggibu.deunggibu) {
        console.log('  Jeonse Rights:', deunggibu.deunggibu.jeonseRights?.length || 0);
        console.log('  Active Jeonse Rights:', deunggibu.deunggibu.activeJeonseRights?.length || 0);
        if (deunggibu.deunggibu.jeonseRights && deunggibu.deunggibu.jeonseRights.length > 0) {
          deunggibu.deunggibu.jeonseRights.forEach((j: any, idx: number) => {
            console.log(`    ${idx+1}.`, JSON.stringify(j));
          });
        }
      }
    } else {
      console.log('No deunggibu_data');
    }
  }

  // 4. Check wolse_price_data
  console.log('\n\n=== Wolse Price Data ===');
  const { data: wolseData, error: wError } = await supabase
    .from('wolse_price_data')
    .select('*')
    .eq('analysis_id', analysisId)
    .single();

  if (wError) {
    console.log('wolse_price_data error:', wError.message);
  } else if (wolseData) {
    console.log('Contract Count:', wolseData.contract_count);
    console.log('Confidence Level:', wolseData.confidence_level);
    console.log('Data Source Note:', wolseData.data_source_note);
    console.log('Recent Transactions:', wolseData.recent_transactions?.length || 0);
  }
}

main().catch(console.error);
