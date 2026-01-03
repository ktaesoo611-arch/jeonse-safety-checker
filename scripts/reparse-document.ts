/**
 * Re-parse document to extract missing buildingNumber and unit
 */

import { createClient } from '@supabase/supabase-js';
import { LLMParser } from '../lib/services/llm-parser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function reparseDocument() {
  const analysisId = '58110535-f3a8-4267-917c-d6b753ffe2d3';
  const documentId = '15a5f70c-1b58-4590-ac04-49877271146d';

  console.log('='.repeat(80));
  console.log('🔄 Re-parsing Document');
  console.log(`   Analysis ID: ${analysisId}`);
  console.log(`   Document ID: ${documentId}`);
  console.log('='.repeat(80));

  // Fetch the document with OCR text
  const { data: doc, error: docError } = await supabase
    .from('uploaded_documents')
    .select('id, ocr_text, parsed_data')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    console.error('Error fetching document:', docError);
    return;
  }

  if (!doc.ocr_text) {
    console.error('No OCR text found in document');
    return;
  }

  console.log(`\n📄 Document found with ${doc.ocr_text.length} characters of OCR text`);
  console.log('\n📊 Current parsed_data:');
  console.log(`   buildingNumber: ${doc.parsed_data?.buildingNumber || 'NOT SET'}`);
  console.log(`   unit: ${doc.parsed_data?.unit || 'NOT SET'}`);
  console.log(`   area: ${doc.parsed_data?.area || 'NOT SET'}`);

  // Re-parse with LLM
  console.log('\n🤖 Re-parsing with LLM...');
  const parser = new LLMParser();

  try {
    const newParsedData = await parser.parseDeunggibu(doc.ocr_text);

    console.log('\n📊 New parsed_data:');
    console.log(`   buildingNumber: ${newParsedData.buildingNumber || 'NOT EXTRACTED'}`);
    console.log(`   unit: ${newParsedData.unit || 'NOT EXTRACTED'}`);
    console.log(`   area: ${newParsedData.area || 'NOT EXTRACTED'}`);
    console.log(`   buildingYear: ${newParsedData.buildingYear || 'NOT EXTRACTED'}`);
    console.log(`   confidence: ${newParsedData.confidence || 'NOT EXTRACTED'}`);

    // Update uploaded_documents with new parsed_data
    const { error: updateDocError } = await supabase
      .from('uploaded_documents')
      .update({ parsed_data: newParsedData })
      .eq('id', documentId);

    if (updateDocError) {
      console.error('Error updating document:', updateDocError);
      return;
    }
    console.log('\n✅ Updated uploaded_documents.parsed_data');

    // Also update analysis_results.deunggibu_data
    const { data: analysis } = await supabase
      .from('analysis_results')
      .select('deunggibu_data')
      .eq('id', analysisId)
      .single();

    if (analysis?.deunggibu_data) {
      const updatedDeunggibuData = {
        ...analysis.deunggibu_data,
        deunggibu: {
          ...analysis.deunggibu_data.deunggibu,
          buildingNumber: newParsedData.buildingNumber,
          unit: newParsedData.unit,
          area: newParsedData.area,
        },
        buildingNumber: newParsedData.buildingNumber,
        unit: newParsedData.unit,
      };

      const { error: updateAnalysisError } = await supabase
        .from('analysis_results')
        .update({ deunggibu_data: updatedDeunggibuData })
        .eq('id', analysisId);

      if (updateAnalysisError) {
        console.error('Error updating analysis:', updateAnalysisError);
        return;
      }
      console.log('✅ Updated analysis_results.deunggibu_data');
    }

    console.log('\n🎉 Re-parsing complete!');

  } catch (err) {
    console.error('Error during LLM parsing:', err);
  }
}

reparseDocument().catch(console.error);
