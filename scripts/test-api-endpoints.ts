/**
 * Test All API Endpoints
 *
 * Tests the complete API flow:
 * 1. Create analysis
 * 2. Check status
 * 3. (Upload would require actual file - skipped for now)
 * 4. Retrieve report (when completed)
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  error?: string;
  data?: any;
}

const results: TestResult[] = [];

function logTest(result: TestResult) {
  results.push(result);
  const emoji = result.status === 'PASS' ? '✅' : '❌';
  console.log(`${emoji} ${result.method} ${result.endpoint} - ${result.status}`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  if (result.data) {
    console.log(`   Response:`, JSON.stringify(result.data, null, 2));
  }
  console.log('');
}

async function testCreateAnalysis(): Promise<string | null> {
  console.log('📝 Test 1: Create Analysis\n');

  try {
    const response = await axios.post(`${BASE_URL}/api/analysis/create`, {
      address: '서울특별시 강남구 역삼동 123-45',
      proposedJeonse: 500000000,
      ownerName: '홍길동',
      ownerPhone: '010-1234-5678',
    });

    if (response.status === 201 && response.data.analysisId) {
      logTest({
        endpoint: '/api/analysis/create',
        method: 'POST',
        status: 'PASS',
        statusCode: response.status,
        data: response.data,
      });
      return response.data.analysisId;
    } else {
      logTest({
        endpoint: '/api/analysis/create',
        method: 'POST',
        status: 'FAIL',
        statusCode: response.status,
        error: 'Invalid response format',
      });
      return null;
    }
  } catch (error: any) {
    logTest({
      endpoint: '/api/analysis/create',
      method: 'POST',
      status: 'FAIL',
      error: error.response?.data?.error || error.message,
    });
    return null;
  }
}

async function testCreateAnalysisValidation() {
  console.log('🔍 Test 2: Create Analysis - Validation\n');

  // Test missing address
  try {
    await axios.post(`${BASE_URL}/api/analysis/create`, {
      proposedJeonse: 500000000,
    });
    logTest({
      endpoint: '/api/analysis/create',
      method: 'POST',
      status: 'FAIL',
      error: 'Should have failed validation for missing address',
    });
  } catch (error: any) {
    if (error.response?.status === 400) {
      logTest({
        endpoint: '/api/analysis/create (validation)',
        method: 'POST',
        status: 'PASS',
        statusCode: 400,
        data: { message: 'Correctly rejected missing address' },
      });
    } else {
      logTest({
        endpoint: '/api/analysis/create (validation)',
        method: 'POST',
        status: 'FAIL',
        error: error.message,
      });
    }
  }

  // Test invalid jeonse amount
  try {
    await axios.post(`${BASE_URL}/api/analysis/create`, {
      address: '서울특별시 강남구 역삼동 123-45',
      proposedJeonse: -1000,
    });
    logTest({
      endpoint: '/api/analysis/create',
      method: 'POST',
      status: 'FAIL',
      error: 'Should have failed validation for negative jeonse',
    });
  } catch (error: any) {
    if (error.response?.status === 400) {
      logTest({
        endpoint: '/api/analysis/create (validation)',
        method: 'POST',
        status: 'PASS',
        statusCode: 400,
        data: { message: 'Correctly rejected negative jeonse' },
      });
    } else {
      logTest({
        endpoint: '/api/analysis/create (validation)',
        method: 'POST',
        status: 'FAIL',
        error: error.message,
      });
    }
  }
}

async function testGetStatus(analysisId: string) {
  console.log('📊 Test 3: Get Analysis Status\n');

  try {
    const response = await axios.get(`${BASE_URL}/api/analysis/status/${analysisId}`);

    if (response.status === 200 && response.data.analysisId === analysisId) {
      logTest({
        endpoint: `/api/analysis/status/${analysisId}`,
        method: 'GET',
        status: 'PASS',
        statusCode: response.status,
        data: response.data,
      });
    } else {
      logTest({
        endpoint: `/api/analysis/status/${analysisId}`,
        method: 'GET',
        status: 'FAIL',
        statusCode: response.status,
        error: 'Invalid response format',
      });
    }
  } catch (error: any) {
    logTest({
      endpoint: `/api/analysis/status/${analysisId}`,
      method: 'GET',
      status: 'FAIL',
      error: error.response?.data?.error || error.message,
    });
  }
}

async function testGetStatusInvalid() {
  console.log('🔍 Test 4: Get Status - Invalid ID\n');

  try {
    await axios.get(`${BASE_URL}/api/analysis/status/invalid-id`);
    logTest({
      endpoint: '/api/analysis/status/invalid-id',
      method: 'GET',
      status: 'FAIL',
      error: 'Should have failed validation for invalid UUID',
    });
  } catch (error: any) {
    if (error.response?.status === 400) {
      logTest({
        endpoint: '/api/analysis/status/invalid-id',
        method: 'GET',
        status: 'PASS',
        statusCode: 400,
        data: { message: 'Correctly rejected invalid UUID' },
      });
    } else {
      logTest({
        endpoint: '/api/analysis/status/invalid-id',
        method: 'GET',
        status: 'FAIL',
        error: error.message,
      });
    }
  }
}

async function testGetReportNotCompleted(analysisId: string) {
  console.log('📄 Test 5: Get Report - Not Completed\n');

  try {
    await axios.get(`${BASE_URL}/api/analysis/report/${analysisId}`);
    logTest({
      endpoint: `/api/analysis/report/${analysisId}`,
      method: 'GET',
      status: 'FAIL',
      error: 'Should have failed because analysis not completed',
    });
  } catch (error: any) {
    if (error.response?.status === 400 || error.response?.status === 404) {
      logTest({
        endpoint: `/api/analysis/report/${analysisId}`,
        method: 'GET',
        status: 'PASS',
        statusCode: error.response?.status,
        data: { message: 'Correctly rejected incomplete analysis' },
      });
    } else {
      logTest({
        endpoint: `/api/analysis/report/${analysisId}`,
        method: 'GET',
        status: 'FAIL',
        error: error.message,
      });
    }
  }
}

async function runTests() {
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('🧪 Testing Jeonse Safety Checker API Endpoints\n');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Test 1: Create analysis
  const analysisId = await testCreateAnalysis();

  // Test 2: Validation tests
  await testCreateAnalysisValidation();

  if (analysisId) {
    // Test 3: Get status
    await testGetStatus(analysisId);

    // Test 4: Invalid ID
    await testGetStatusInvalid();

    // Test 5: Get report (should fail - not completed)
    await testGetReportNotCompleted(analysisId);
  }

  // Summary
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('📊 Test Summary\n');
  console.log('════════════════════════════════════════════════════════════════\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! API endpoints are working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.\n');
    process.exit(1);
  }

  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('📝 Note: Document upload and parsing tests require actual PDF files');
  console.log('   and will be tested manually or through the frontend.\n');
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});
