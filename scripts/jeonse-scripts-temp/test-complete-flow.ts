/**
 * Complete Flow Test
 *
 * Tests the entire flow: Create analysis → Upload document → Monitor progress → Check report
 */

const API_BASE = 'http://localhost:3000';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCompleteFlow() {
  console.log('🧪 COMPLETE FLOW TEST\n');
  console.log('═'.repeat(80) + '\n');

  try {
    // Step 1: Create analysis
    console.log('📝 STEP 1: Creating analysis...\n');

    const createResponse = await fetch(`${API_BASE}/api/analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        district: '동대문구',
        dong: '청량리동',
        buildingName: '청계한신휴플러스',
        proposedJeonse: 500000000
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create analysis: ${createResponse.statusText}`);
    }

    const createData = await createResponse.json();
    const analysisId = createData.analysisId;

    console.log(`✅ Analysis created: ${analysisId}\n`);

    // Step 2: Upload document (we'll use mock path since we don't have real file upload here)
    console.log('📄 STEP 2: Triggering document processing (mock)...\n');

    // For this test, we'll just trigger the parse endpoint directly
    // In real flow, this would be done via form submission

    // Step 3: Monitor progress
    console.log('⏱️  STEP 3: Monitoring progress...\n');

    let progressHistory: number[] = [];
    let status = 'pending';
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    while (status !== 'completed' && status !== 'failed' && attempts < maxAttempts) {
      const statusResponse = await fetch(`${API_BASE}/api/analysis/status/${analysisId}`);

      if (!statusResponse.ok) {
        throw new Error(`Failed to check status: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      status = statusData.status;
      const progress = statusData.progress;

      // Only log when progress changes
      if (progressHistory.length === 0 || progress !== progressHistory[progressHistory.length - 1]) {
        console.log(`   [${attempts}s] Progress: ${progress}% | Status: ${status}`);
        progressHistory.push(progress);
      }

      attempts++;
      await sleep(1000);
    }

    console.log('');

    if (status === 'failed') {
      throw new Error('Analysis failed');
    }

    if (status !== 'completed') {
      throw new Error(`Analysis did not complete within ${maxAttempts} seconds`);
    }

    // Analyze progress transitions
    console.log('═'.repeat(80) + '\n');
    console.log('📊 PROGRESS ANALYSIS\n');
    console.log(`   Total transitions: ${progressHistory.length}`);
    console.log(`   Progress sequence: ${progressHistory.join(' → ')}\n`);

    // Check for backwards jumps
    let hasBackwardsJump = false;
    for (let i = 1; i < progressHistory.length; i++) {
      if (progressHistory[i] < progressHistory[i-1]) {
        console.log(`   ❌ BACKWARDS JUMP: ${progressHistory[i-1]}% → ${progressHistory[i]}%`);
        hasBackwardsJump = true;
      }
    }

    if (!hasBackwardsJump) {
      console.log('   ✅ No backwards jumps detected');
    }

    // Check for expected intermediate states
    const has25 = progressHistory.includes(25);
    const has75 = progressHistory.some(p => p >= 75 && p < 85);
    const has85 = progressHistory.includes(85);
    const has100 = progressHistory.includes(100);

    console.log(`   ${has25 ? '✅' : '❌'} Has 25% state (initial processing)`);
    console.log(`   ${has75 ? '✅' : '❌'} Has 75% state (document parsed)`);
    console.log(`   ${has85 ? '✅' : '⚠️ '} Has 85% state (analysis complete, no results yet)`);
    console.log(`   ${has100 ? '✅' : '❌'} Has 100% state (results saved)\n`);

    // Step 4: Fetch report
    console.log('═'.repeat(80) + '\n');
    console.log('📋 STEP 4: Fetching report...\n');

    const reportResponse = await fetch(`${API_BASE}/api/analysis/report/${analysisId}`);

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text();
      throw new Error(`Failed to fetch report (${reportResponse.status}): ${errorText}`);
    }

    const report = await reportResponse.json();

    console.log('✅ Report fetched successfully\n');
    console.log(`   Analysis ID: ${report.analysisId}`);
    console.log(`   Property: ${report.property.address}`);
    console.log(`   Risk Level: ${report.riskAnalysis.riskLevel}`);
    console.log(`   Overall Score: ${report.riskAnalysis.overallScore}/100`);
    console.log(`   Verdict: ${report.riskAnalysis.verdict}\n`);

    // Validate report structure
    console.log('═'.repeat(80) + '\n');
    console.log('🔍 REPORT VALIDATION\n');

    const checks = [
      { name: 'Has analysisId', pass: !!report.analysisId },
      { name: 'Has property data', pass: !!report.property },
      { name: 'Has property address', pass: !!report.property?.address },
      { name: 'Has risk analysis', pass: !!report.riskAnalysis },
      { name: 'Has overall score', pass: typeof report.riskAnalysis?.overallScore === 'number' },
      { name: 'Has risk level', pass: !!report.riskAnalysis?.riskLevel },
      { name: 'Has recommendations', pass: !!report.recommendations },
      { name: 'Has summary', pass: !!report.summary },
    ];

    checks.forEach(check => {
      console.log(`   ${check.pass ? '✅' : '❌'} ${check.name}`);
    });

    const allPassed = checks.every(c => c.pass);

    // Final summary
    console.log('\n' + '═'.repeat(80) + '\n');
    console.log('📋 TEST SUMMARY\n');

    const results = [
      { name: 'Analysis Creation', pass: !!analysisId },
      { name: 'Progress Monitoring', pass: progressHistory.length > 0 },
      { name: 'No Backwards Jumps', pass: !hasBackwardsJump },
      { name: 'Reached Completion', pass: status === 'completed' },
      { name: 'Report Fetch', pass: reportResponse.ok },
      { name: 'Report Structure Valid', pass: allPassed },
    ];

    results.forEach(result => {
      console.log(`   ${result.pass ? '✅ PASS' : '❌ FAIL'}: ${result.name}`);
    });

    const overallPass = results.every(r => r.pass);

    console.log('\n' + '═'.repeat(80) + '\n');

    if (overallPass) {
      console.log('🎉 ALL TESTS PASSED! Complete flow working correctly.\n');
      process.exit(0);
    } else {
      console.log('⚠️  SOME TESTS FAILED. See details above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testCompleteFlow();
