/**
 * Test hero address display for both jeonse and wolse reports
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testHeroAddress() {
  console.log('='.repeat(80));
  console.log('🔍 Testing Hero Address Display for Jeonse and Wolse');
  console.log('='.repeat(80));

  // Test Jeonse - 금천현대 (recently re-parsed)
  const jeonseAnalysisId = '58110535-f3a8-4267-917c-d6b753ffe2d3';

  // Find a wolse analysis to test
  const { data: wolseAnalyses } = await supabase
    .from('wolse_price_full')
    .select('id, property_id, status')
    .eq('status', 'completed')
    .limit(1);

  const wolseAnalysisId = wolseAnalyses?.[0]?.id;

  console.log('\n' + '─'.repeat(80));
  console.log('📋 JEONSE REPORT TEST');
  console.log('─'.repeat(80));

  await testJeonseHero(jeonseAnalysisId);

  if (wolseAnalysisId) {
    console.log('\n' + '─'.repeat(80));
    console.log('📋 WOLSE REPORT TEST');
    console.log('─'.repeat(80));

    await testWolseHero(wolseAnalysisId);
  } else {
    console.log('\n⚠️ No completed wolse analysis found to test');
  }
}

async function testJeonseHero(analysisId: string) {
  console.log(`\nAnalysis ID: ${analysisId}`);

  // Simulate the API logic for jeonse
  const { data: analysis } = await supabase
    .from('analysis_results')
    .select('*, properties(*)')
    .eq('id', analysisId)
    .single();

  if (!analysis) {
    console.log('❌ Analysis not found');
    return;
  }

  const riskAnalysis = analysis.deunggibu_data;
  const prop = Array.isArray(analysis.properties) ? analysis.properties[0] : analysis.properties;

  // Simulate API property object construction (matching route.ts logic)
  const property = {
    address: prop?.building_name
      ? `${prop?.city || '서울특별시'} ${prop?.district || ''} ${prop?.dong || ''} ${prop?.building_name}`.trim()
      : prop?.address || 'N/A',
    buildingName: prop?.building_name || null,
    buildingNumber: prop?.building_number || riskAnalysis?.deunggibu?.buildingNumber || riskAnalysis?.buildingNumber || null,
    unit: prop?.unit || riskAnalysis?.deunggibu?.unit || riskAnalysis?.unit || null,
    area: riskAnalysis?.deunggibu?.area || riskAnalysis?.area || null,
  };

  console.log('\n📊 Data Sources:');
  console.log(`   prop.building_number: ${prop?.building_number || 'NULL'}`);
  console.log(`   prop.unit: ${prop?.unit || 'NULL'}`);
  console.log(`   riskAnalysis.deunggibu.buildingNumber: ${riskAnalysis?.deunggibu?.buildingNumber || 'NULL'}`);
  console.log(`   riskAnalysis.deunggibu.unit: ${riskAnalysis?.deunggibu?.unit || 'NULL'}`);
  console.log(`   riskAnalysis.buildingNumber: ${riskAnalysis?.buildingNumber || 'NULL'}`);
  console.log(`   riskAnalysis.unit: ${riskAnalysis?.unit || 'NULL'}`);

  console.log('\n📊 Final Property Object:');
  console.log(`   address: ${property.address}`);
  console.log(`   buildingNumber: ${property.buildingNumber || 'NULL'}`);
  console.log(`   unit: ${property.unit || 'NULL'}`);
  console.log(`   area: ${property.area || 'NULL'}`);

  // Simulate hero display
  const heroDisplay = [
    property.address,
    property.buildingNumber ? ` ${property.buildingNumber}` : '',
    property.unit ? ` ${property.unit}` : '',
    property.area ? ` ${Math.floor(property.area)}㎡` : '',
  ].join('');

  console.log('\n🏠 HERO DISPLAY:');
  console.log(`   "${heroDisplay}"`);
}

async function testWolseHero(analysisId: string) {
  console.log(`\nAnalysis ID: ${analysisId}`);

  // Get wolse analysis with property
  const { data: wolseResult } = await supabase
    .from('wolse_price_full')
    .select('*')
    .eq('id', analysisId)
    .single();

  if (!wolseResult) {
    console.log('❌ Wolse analysis not found');
    return;
  }

  // Get property data
  const { data: propertyData } = await supabase
    .from('properties')
    .select('*')
    .eq('id', wolseResult.property_id)
    .single();

  // Get safety analysis data
  const { data: safetyData } = await supabase
    .from('analysis_results')
    .select('deunggibu_data')
    .eq('id', analysisId)
    .single();

  // Fetch uploaded documents for parsed data (NEW: matching route.ts)
  const { data: wolseDocuments } = await supabase
    .from('uploaded_documents')
    .select('*')
    .eq('analysis_id', analysisId)
    .order('created_at', { ascending: false });

  const wolseDeunggibuDoc = wolseDocuments?.find((d: any) => d.document_type === 'deunggibu');
  const wolseParsedData = wolseDeunggibuDoc?.parsed_data || null;

  // Extract buildingNumber and unit from address if not explicitly parsed (NEW: matching route.ts)
  let wolseBuildingNumber = wolseParsedData?.buildingNumber || null;
  let wolseUnit = wolseParsedData?.unit || null;
  if ((!wolseBuildingNumber || !wolseUnit) && wolseParsedData?.address) {
    const buildingMatch = wolseParsedData.address.match(/제(\d+)동/);
    const unitMatch = wolseParsedData.address.match(/제(\d+)호/);
    if (!wolseBuildingNumber && buildingMatch) {
      wolseBuildingNumber = `제${buildingMatch[1]}동`;
    }
    if (!wolseUnit && unitMatch) {
      wolseUnit = `제${unitMatch[1]}호`;
    }
  }

  const riskAnalysis = safetyData?.deunggibu_data || null;

  // Simulate API property object construction (matching route.ts wolse logic)
  const property = {
    address: propertyData?.building_name
      ? `${propertyData?.city || '서울특별시'} ${propertyData?.district || ''} ${propertyData?.dong || ''} ${propertyData?.building_name}`.trim()
      : propertyData?.address || 'N/A',
    buildingName: propertyData?.building_name || null,
    buildingNumber: propertyData?.building_number || riskAnalysis?.deunggibu?.buildingNumber || riskAnalysis?.buildingNumber || wolseBuildingNumber || null,
    unit: propertyData?.unit || riskAnalysis?.deunggibu?.unit || riskAnalysis?.unit || wolseUnit || null,
    area: riskAnalysis?.deunggibu?.area || riskAnalysis?.area || wolseParsedData?.area || propertyData?.exclusive_area || null,
  };

  console.log('\n📊 Data Sources:');
  console.log(`   propertyData.building_number: ${propertyData?.building_number || 'NULL'}`);
  console.log(`   propertyData.unit: ${propertyData?.unit || 'NULL'}`);
  console.log(`   riskAnalysis?.deunggibu?.buildingNumber: ${riskAnalysis?.deunggibu?.buildingNumber || 'NULL'}`);
  console.log(`   riskAnalysis?.deunggibu?.unit: ${riskAnalysis?.deunggibu?.unit || 'NULL'}`);
  console.log(`   wolseParsedData?.buildingNumber: ${wolseParsedData?.buildingNumber || 'NULL'}`);
  console.log(`   wolseParsedData?.unit: ${wolseParsedData?.unit || 'NULL'}`);
  console.log(`   wolseParsedData?.address: ${wolseParsedData?.address || 'NULL'}`);
  console.log(`   Extracted wolseBuildingNumber: ${wolseBuildingNumber || 'NULL'}`);
  console.log(`   Extracted wolseUnit: ${wolseUnit || 'NULL'}`);

  console.log('\n📊 Final Property Object:');
  console.log(`   address: ${property.address}`);
  console.log(`   buildingNumber: ${property.buildingNumber || 'NULL'}`);
  console.log(`   unit: ${property.unit || 'NULL'}`);
  console.log(`   area: ${property.area || 'NULL'}`);

  // Simulate hero display
  const heroDisplay = [
    property.address,
    property.buildingNumber ? ` ${property.buildingNumber}` : '',
    property.unit ? ` ${property.unit}` : '',
    property.area ? ` ${Math.floor(property.area)}㎡` : '',
  ].join('');

  console.log('\n🏠 HERO DISPLAY:');
  console.log(`   "${heroDisplay}"`);
}

testHeroAddress().catch(console.error);
