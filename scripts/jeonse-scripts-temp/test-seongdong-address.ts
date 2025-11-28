/**
 * Test Building Register API with Seongdong-gu address
 * 서울특별시 성동구 금호동2가 1208의 6번지
 */

import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.BUILDING_REGISTER_API_KEY;
const BASE_URL = 'http://apis.data.go.kr/1613000/BldRgstHubService';

async function testSeongdongAddress() {
  console.log('🧪 Testing Building Register API - Seongdong Address\n');
  console.log('='.repeat(80));

  if (!API_KEY) {
    console.error('❌ BUILDING_REGISTER_API_KEY not found in .env.local');
    return;
  }

  console.log('✅ API Key found:', API_KEY.substring(0, 20) + '...\n');

  // Test address: 서울특별시 성동구 금호동2가 1208의 6
  // From the document: 두산아파트 제107동 제2층 제202호
  const testAddress = {
    name: '서울특별시 성동구 금호동2가 1208-6 (두산아파트)',
    sigunguCd: '11200',  // 성동구
    bjdongCd: '10800',   // 금호동2가
    platGbCd: '0',       // 대지구분코드: 0=대지
    bun: '1208',         // 본번
    ji: '6'              // 부번
  };

  console.log('📍 Test Address:', testAddress.name);
  console.log('📊 API Parameters:');
  console.log('   - sigunguCd (시군구코드):', testAddress.sigunguCd, '(성동구)');
  console.log('   - bjdongCd (법정동코드):', testAddress.bjdongCd, '(금호동2가)');
  console.log('   - platGbCd (대지구분코드):', testAddress.platGbCd);
  console.log('   - bun (본번):', testAddress.bun);
  console.log('   - ji (부번):', testAddress.ji);
  console.log();

  // Test both endpoints
  const endpoints = [
    { name: 'getBrRecapTitleInfo', desc: '건축물대장 총괄표제부' },
    { name: 'getBrTitleInfo', desc: '건축물대장 표제부' }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Testing Endpoint: ${endpoint.name} (${endpoint.desc})`);
    console.log('='.repeat(80));

    try {
      const url = `${BASE_URL}/${endpoint.name}`;
      console.log(`🌐 URL: ${url}`);

      const response = await axios.get(url, {
        params: {
          serviceKey: API_KEY,
          sigunguCd: testAddress.sigunguCd,
          bjdongCd: testAddress.bjdongCd,
          platGbCd: testAddress.platGbCd,
          bun: testAddress.bun,
          ji: testAddress.ji,
          numOfRows: 10,
          pageNo: 1
        },
        timeout: 10000
      });

      console.log(`✅ Response Status: ${response.status}`);

      // Parse response
      let result;
      if (typeof response.data === 'object') {
        console.log('📦 Response Format: JSON');
        result = response.data;
      } else {
        console.log('📦 Response Format: XML');
        const parser = new XMLParser();
        result = parser.parse(response.data);
      }

      // Check result
      const header = result.response?.header || result.header;
      const body = result.response?.body || result.body;

      console.log(`📋 Result Code: ${header?.resultCode} - ${header?.resultMsg}`);

      if (header?.resultCode === '00') {
        const items = body?.items?.item;
        const totalCount = parseInt(body?.totalCount || '0');

        console.log(`📊 Total Count: ${totalCount}`);

        if (totalCount > 0 && items) {
          const item = Array.isArray(items) ? items[0] : items;

          console.log('\n✅ Building Data Found!\n');
          console.log('🏢 Building Information:');
          console.log('   - 대지위치 (Address):', item.platPlc || 'N/A');
          console.log('   - 건물명 (Building Name):', item.bldNm || 'N/A');
          console.log('   - 주용도 (Main Use):', item.mainPurpsCdNm || 'N/A');
          console.log('   - 구조 (Structure):', item.strctCdNm || 'N/A');
          console.log('   - 지상층수 (Ground Floors):', item.grndFlrCnt || 'N/A');
          console.log('   - 지하층수 (Underground Floors):', item.ugrndFlrCnt || 'N/A');
          console.log('   - 사용승인일 (Approval Date):', item.useAprDay || 'N/A');
          console.log('   - 연면적 (Total Area):', item.totArea || 'N/A', '㎡');

          console.log('\n🚨 Violation Information:');
          console.log('   - 위반율 (Violation Rate):', item.vlRat || 'N/A');
          console.log('   - 위반면적 (Violation Area):', item.vlRatEstmTotArea || 'N/A');

          // Show full item data
          console.log('\n📄 Full Response Data:');
          console.log(JSON.stringify(item, null, 2));

        } else {
          console.log('\n⚠️  No building data found');
          console.log('Response body:', JSON.stringify(body, null, 2));
        }
      } else {
        console.error(`❌ API Error: ${header?.resultMsg}`);
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`❌ Request Failed: ${error.response?.status} - ${error.message}`);
        if (error.response?.data) {
          console.error('Error Data:', error.response.data);
        }
      } else {
        console.error('❌ Error:', error);
      }
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Complete!');
}

// Run the test
testSeongdongAddress();
