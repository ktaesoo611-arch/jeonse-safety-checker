/**
 * Test script to verify jeonse address display with building number and unit
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testJeonseAddress() {
  const analysisId = '58110535-f3a8-4267-917c-d6b753ffe2d3';

  console.log('='.repeat(80));
  console.log('🔍 Testing Jeonse Address Display');
  console.log(`   Analysis ID: ${analysisId}`);
  console.log('='.repeat(80));

  // Check uploaded_documents for parsed data
  const { data: docs, error: docError } = await supabase
    .from('uploaded_documents')
    .select('id, document_type, parsed_data, ocr_text')
    .eq('analysis_id', analysisId)
    .eq('document_type', 'deunggibu');

  if (docError) {
    console.error('Error fetching documents:', docError);
    return;
  }

  console.log(`\n📄 Found ${docs?.length || 0} deunggibu documents:\n`);

  if (docs && docs.length > 0) {
    for (const doc of docs) {
      console.log(`Document ID: ${doc.id}`);
      console.log(`Type: ${doc.document_type}`);

      if (doc.parsed_data) {
        const pd = doc.parsed_data;
        console.log('\n📊 Parsed Data:');
        console.log(`  buildingNumber: ${pd.buildingNumber || 'NOT EXTRACTED'}`);
        console.log(`  unit: ${pd.unit || 'NOT EXTRACTED'}`);
        console.log(`  area: ${pd.area || 'NOT EXTRACTED'}`);
        console.log(`  buildingYear: ${pd.buildingYear || 'NOT EXTRACTED'}`);
        console.log(`  confidence: ${pd.confidence || 'NOT EXTRACTED'}`);
      } else {
        console.log('  ⚠️ No parsed_data found');
      }

      // Check OCR text for 동/호 patterns
      if (doc.ocr_text) {
        console.log('\n📝 Searching OCR text for 동/호 patterns...');
        const ocrText = doc.ocr_text;

        // Look for building number pattern: 제XXX동
        const buildingMatch = ocrText.match(/제\d+동/g);
        if (buildingMatch) {
          console.log(`  Found building numbers: ${buildingMatch.join(', ')}`);
        }

        // Look for unit pattern: 제XXX호
        const unitMatch = ocrText.match(/제\d+호/g);
        if (unitMatch) {
          console.log(`  Found unit numbers: ${unitMatch.join(', ')}`);
        }

        // Look for area pattern
        const areaMatch = ocrText.match(/\d+\.?\d*\s*[㎡m²]/g);
        if (areaMatch) {
          console.log(`  Found area values: ${areaMatch.slice(0, 5).join(', ')}${areaMatch.length > 5 ? '...' : ''}`);
        }

        // Look for the specific line with unit and area
        const unitAreaPattern = /제\d+층\s*제\d+호[^\d]*(\d+\.?\d*)\s*[㎡m²]/g;
        const matches = [...ocrText.matchAll(unitAreaPattern)];
        if (matches.length > 0) {
          console.log(`  Found unit+area lines:`);
          matches.forEach(m => console.log(`    ${m[0]}`));
        }
      }
      console.log('-'.repeat(60));
    }
  }

  // Also check analysis_results deunggibu_data
  const { data: analysis } = await supabase
    .from('analysis_results')
    .select('deunggibu_data')
    .eq('id', analysisId)
    .single();

  if (analysis?.deunggibu_data) {
    const dd = analysis.deunggibu_data;
    console.log('\n📊 Analysis Results deunggibu_data:');
    console.log(`  deunggibu.buildingNumber: ${dd.deunggibu?.buildingNumber || 'NOT SET'}`);
    console.log(`  deunggibu.unit: ${dd.deunggibu?.unit || 'NOT SET'}`);
    console.log(`  deunggibu.area: ${dd.deunggibu?.area || 'NOT SET'}`);
    console.log(`  Top-level buildingNumber: ${dd.buildingNumber || 'NOT SET'}`);
    console.log(`  Top-level unit: ${dd.unit || 'NOT SET'}`);
  }
}

testJeonseAddress().catch(console.error);
