/**
 * Complete walkthrough of the analysis process for 청계한신휴플러스
 * Shows every step from form submission to final valuation
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { MolitAPI, getDistrictCode } from '../lib/apis/molit';

async function walkthrough() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 COMPLETE WALKTHROUGH: 청계한신휴플러스 Analysis Process');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ============================================================================
  // STEP 1: User fills out form on /analyze page
  // ============================================================================
  console.log('📝 STEP 1: User Input Form (/analyze page)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const userInput = {
    city: '서울특별시',
    district: '종로구',
    dong: '청계천로',
    building: '청계한신휴플러스',
    proposedJeonse: 500000000, // ₩500M
    address: '서울특별시 종로구 청계천로'
  };

  console.log('User entered:');
  console.log('  City:', userInput.city);
  console.log('  District:', userInput.district);
  console.log('  Dong:', userInput.dong);
  console.log('  Building:', userInput.building);
  console.log('  Proposed Jeonse:', `₩${(userInput.proposedJeonse / 100000000).toFixed(1)}억`);
  console.log('  Full Address:', userInput.address);

  // ============================================================================
  // STEP 2: Frontend sends POST to /api/analysis/create
  // ============================================================================
  console.log('\n\n📡 STEP 2: API Request (POST /api/analysis/create)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Request Body:');
  console.log(JSON.stringify(userInput, null, 2));

  // ============================================================================
  // STEP 3: Backend creates property record
  // ============================================================================
  console.log('\n\n💾 STEP 3: Database - Create/Find Property');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if property exists
  const { data: existingProperty } = await supabase
    .from('properties')
    .select('id, building_name, address')
    .eq('address', userInput.address)
    .maybeSingle();

  if (existingProperty) {
    console.log('✓ Property already exists:');
    console.log('  Property ID:', existingProperty.id);
    console.log('  Building Name:', existingProperty.building_name);
    console.log('  Address:', existingProperty.address);
  } else {
    console.log('✓ Would create new property record with:');
    console.log('  address:', userInput.address);
    console.log('  city:', userInput.city);
    console.log('  district:', userInput.district);
    console.log('  dong:', userInput.dong);
    console.log('  building_name:', userInput.building);
  }

  const propertyId = existingProperty?.id || '[NEW_PROPERTY_UUID]';

  // ============================================================================
  // STEP 4: Backend creates analysis record
  // ============================================================================
  console.log('\n\n📊 STEP 4: Database - Create Analysis Record');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Find most recent analysis for this property
  const { data: recentAnalyses } = await supabase
    .from('analysis_results')
    .select('id, status, safety_score, created_at')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentAnalyses && recentAnalyses.length > 0) {
    const recent = recentAnalyses[0];
    console.log('✓ Most recent analysis found:');
    console.log('  Analysis ID:', recent.id);
    console.log('  Status:', recent.status);
    console.log('  Safety Score:', recent.safety_score);
    console.log('  Created:', recent.created_at);
  } else {
    console.log('✓ Would create new analysis_results record:');
    console.log('  property_id:', propertyId);
    console.log('  proposed_jeonse:', userInput.proposedJeonse);
    console.log('  status: "pending"');
  }

  // ============================================================================
  // STEP 5: User uploads PDF document
  // ============================================================================
  console.log('\n\n📄 STEP 5: Document Upload (등기부등본)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('User uploads PDF file → Supabase Storage');
  console.log('  Bucket: "documents"');
  console.log('  Path: "analysis/{analysis_id}/deunggibu_{timestamp}.pdf"');
  console.log('  Document Type: "deunggibu"');
  console.log('\nRecord created in uploaded_documents table');

  // ============================================================================
  // STEP 6: OCR and parsing triggered
  // ============================================================================
  console.log('\n\n🔍 STEP 6: OCR & Document Parsing (POST /api/documents/parse)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('OCR Service extracts text from PDF');
  console.log('DeunggibuParser parses structured data:');
  console.log('  - Property address');
  console.log('  - Building name (from OCR)');
  console.log('  - Exclusive area (㎡)');
  console.log('  - Mortgages (근저당권)');
  console.log('  - Liens (가압류)');
  console.log('  - Total debt amounts');

  // ============================================================================
  // STEP 7: Fetch property valuation from MOLIT API
  // ============================================================================
  console.log('\n\n💰 STEP 7: Property Valuation (MOLIT API)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Parse address
  const addressMatch = userInput.address.match(/(서울특별시|서울)\s+([가-힣]+구)/);
  const city = addressMatch ? (addressMatch[1] === '서울' ? '서울특별시' : addressMatch[1]) : '서울특별시';
  const district = addressMatch ? addressMatch[2] : userInput.district;

  console.log('7a. Parse address to extract location:');
  console.log('  City:', city);
  console.log('  District:', district);

  // Get district code
  const lawdCd = getDistrictCode(city, district);
  console.log('\n7b. Get district code:');
  console.log('  District:', district);
  console.log('  Code:', lawdCd);

  if (!lawdCd) {
    console.log('  ⚠️  No district code found!');
    return;
  }

  // Get building name variants
  const { getBuildingNameVariants } = await import('../lib/data/address-data');
  const buildingNameVariants = getBuildingNameVariants(userInput.building);

  console.log('\n7c. Get building name variants:');
  console.log('  User input:', userInput.building);
  console.log('  Variants to try:', buildingNameVariants);

  // Initialize MOLIT API
  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('  ⚠️  MOLIT_API_KEY not found!');
    return;
  }

  const molit = new MolitAPI(apiKey);

  console.log('\n7d. Fetch transactions from MOLIT API:');
  console.log('  District Code:', lawdCd);
  console.log('  Period: Last 6 months');
  console.log('  Area filter: ±2㎡ tolerance');

  // Try each variant
  let transactions: any[] = [];
  let usedBuildingName = userInput.building;
  const assumedArea = 84; // We'll need to get this from OCR in real scenario

  for (const nameVariant of buildingNameVariants) {
    console.log(`\n  Trying variant: "${nameVariant}"`);

    try {
      const result = await molit.getRecentTransactionsForApartment(
        lawdCd,
        nameVariant,
        assumedArea,
        6
      );

      if (result.length > 0) {
        transactions = result;
        usedBuildingName = nameVariant;
        console.log(`  ✓ SUCCESS: Found ${transactions.length} transactions`);
        break;
      } else {
        console.log(`  ✗ No transactions found`);
      }
    } catch (error: any) {
      console.log(`  ✗ Error: ${error.message}`);
    }
  }

  // ============================================================================
  // STEP 8: Calculate valuation from transactions
  // ============================================================================
  console.log('\n\n📈 STEP 8: Calculate Property Valuation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (transactions.length > 0) {
    console.log(`Building: ${usedBuildingName}`);
    console.log(`Transactions found: ${transactions.length}\n`);

    // Show all transactions
    console.log('Transaction Details:');
    let totalAmount = 0;
    transactions.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`);
      console.log(`     Area: ${t.exclusiveArea}㎡, Floor: ${t.floor}층`);
      console.log(`     Amount: ₩${t.transactionAmount.toLocaleString()}`);
      totalAmount += t.transactionAmount;
    });

    // Calculate average
    const avgPrice = totalAmount / transactions.length;
    console.log(`\nCalculation:`);
    console.log(`  Total: ₩${totalAmount.toLocaleString()}`);
    console.log(`  Count: ${transactions.length}`);
    console.log(`  Average: ₩${Math.round(avgPrice).toLocaleString()}`);

    // Calculate confidence
    const confidence = Math.min(0.9, 0.5 + (transactions.length * 0.05));
    console.log(`\nConfidence: ${confidence} (${(confidence * 100).toFixed(0)}%)`);

    // Market trend
    let marketTrend: 'rising' | 'stable' | 'falling' = 'stable';
    if (transactions.length >= 3) {
      const recentAvg = transactions.slice(0, 3).reduce((sum, t) => sum + t.transactionAmount, 0) / 3;
      const olderAvg = transactions.slice(-3).reduce((sum, t) => sum + t.transactionAmount, 0) / 3;

      if (recentAvg > olderAvg * 1.05) marketTrend = 'rising';
      else if (recentAvg < olderAvg * 0.95) marketTrend = 'falling';

      console.log(`\nMarket Trend: ${marketTrend.toUpperCase()}`);
      console.log(`  Recent 3: ₩${Math.round(recentAvg).toLocaleString()}`);
      console.log(`  Older 3: ₩${Math.round(olderAvg).toLocaleString()}`);
      console.log(`  Ratio: ${(recentAvg / olderAvg).toFixed(3)}`);
    }

    // Valuation object
    console.log('\nFinal Valuation Object:');
    const valuation = {
      valueLow: Math.round(avgPrice * 0.95),
      valueMid: Math.round(avgPrice),
      valueHigh: Math.round(avgPrice * 1.05),
      confidence,
      marketTrend
    };
    console.log(JSON.stringify(valuation, null, 2));

  } else {
    console.log('⚠️  No transactions found - using jeonse ratio fallback');
    const estimatedValue = Math.round(userInput.proposedJeonse / 0.70);
    console.log(`\nJeonse Ratio Estimation:`);
    console.log(`  Proposed Jeonse: ₩${userInput.proposedJeonse.toLocaleString()}`);
    console.log(`  Ratio: 0.70 (70%)`);
    console.log(`  Estimated Value: ₩${estimatedValue.toLocaleString()}`);
    console.log(`  Confidence: 0.5 (50% - estimation only)`);
  }

  // ============================================================================
  // STEP 9: Risk analysis
  // ============================================================================
  console.log('\n\n⚠️  STEP 9: Risk Analysis');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('RiskAnalyzer calculates:');
  console.log('  - LTV Ratio (total exposure / property value)');
  console.log('  - Debt Score (senior debt burden)');
  console.log('  - Legal Score (liens, seizures)');
  console.log('  - Market Score (trend analysis)');
  console.log('  - Building Score (age, condition)');
  console.log('  - Overall Safety Score (0-100)');
  console.log('  - Risk Level (SAFE / MODERATE / HIGH / CRITICAL)');

  // ============================================================================
  // STEP 10: Save to database
  // ============================================================================
  console.log('\n\n💾 STEP 10: Save Results to Database');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Update analysis_results table:');
  console.log('  status: "completed"');
  console.log('  safety_score: [calculated score]');
  console.log('  risk_level: [SAFE/MODERATE/HIGH/CRITICAL]');
  console.log('  risks: [array of risk factors]');
  console.log('  deunggibu_data: {');
  console.log('    deunggibu: [parsed data],');
  console.log('    valuation: [MOLIT valuation],');
  console.log('    scores: [component scores],');
  console.log('    recommendations: [action items]');
  console.log('  }');
  console.log('  completed_at: [timestamp]');

  // ============================================================================
  // STEP 11: Display report
  // ============================================================================
  console.log('\n\n📋 STEP 11: Display Report (/report/[id] page)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Frontend fetches analysis_results and displays:');
  console.log('  ✓ Safety Score badge (color-coded)');
  console.log('  ✓ Risk Level indicator');
  console.log('  ✓ Property details (address, jeonse amount)');
  console.log('  ✓ Est. Market Value (from MOLIT or estimation)');
  console.log('  ✓ LTV Ratio');
  console.log('  ✓ Total Debt breakdown');
  console.log('  ✓ Risk factors list');
  console.log('  ✓ Recommendations (mandatory, recommended, optional)');
  console.log('  ✓ Debt ranking table');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ WALKTHROUGH COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

walkthrough();
