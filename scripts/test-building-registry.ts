/**
 * Test script for Building Registry (건축물대장) API
 *
 * Run with: npx ts-node scripts/test-building-registry.ts
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const API_KEY = process.env.BUILDING_REGISTRY_API_KEY;
const BASE_URL = 'https://apis.data.go.kr/1613000/BldRgstHubService';

async function testBuildingRegistry() {
  console.log('🏢 Testing Building Registry API (건축물대장)...\n');

  if (!API_KEY) {
    console.error('❌ BUILDING_REGISTRY_API_KEY not set in .env.local');
    process.exit(1);
  }

  console.log('✅ API Key found\n');

  // Test with a known address: 강남구 역삼동
  // sigunguCd: 11680 (강남구)
  // bjdongCd: 10100 (역삼동)
  // We'll test getting the title (표제부) information

  const testCases = [
    {
      name: '강남구 역삼동 아파트 (래미안 그레이튼)',
      sigunguCd: '11680',
      bjdongCd: '10100',
      bun: '0677',
      ji: '0000'
    },
    {
      name: '송파구 잠실동 (잠실엘스)',
      sigunguCd: '11710',
      bjdongCd: '10100',
      bun: '0040',
      ji: '0000'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📍 Testing: ${testCase.name}`);
    console.log(`   sigunguCd: ${testCase.sigunguCd}, bjdongCd: ${testCase.bjdongCd}`);
    console.log(`   bun: ${testCase.bun}, ji: ${testCase.ji}`);

    try {
      // Try getBrTitleInfo (표제부 정보)
      const response = await axios.get(`${BASE_URL}/getBrTitleInfo`, {
        params: {
          serviceKey: API_KEY,
          sigunguCd: testCase.sigunguCd,
          bjdongCd: testCase.bjdongCd,
          bun: testCase.bun,
          ji: testCase.ji,
          numOfRows: 10,
          pageNo: 1,
          _type: 'json'
        },
        timeout: 10000
      });

      console.log(`\n   Response status: ${response.status}`);

      const result = response.data;
      const items = result.response?.body?.items?.item;

      if (!items) {
        console.log('   ⚠️ No items found');
        console.log('   Raw response:', JSON.stringify(result, null, 2).slice(0, 500));
        continue;
      }

      const itemList = Array.isArray(items) ? items : [items];
      console.log(`   ✅ Found ${itemList.length} building(s)\n`);

      for (const item of itemList.slice(0, 2)) {
        console.log('   📋 Building Info:');
        console.log(`      - 건물명: ${item.bldNm || '(없음)'}`);
        console.log(`      - 주용도코드명: ${item.mainPurpsCdNm || '(없음)'}`);
        console.log(`      - 대지면적: ${item.platArea || '(없음)'}㎡`);
        console.log(`      - 연면적: ${item.totArea || '(없음)'}㎡`);
        console.log(`      - 지상층수: ${item.grndFlrCnt || '(없음)'}`);
        console.log(`      - 지하층수: ${item.ugrndFlrCnt || '(없음)'}`);
        console.log(`      - 사용승인일: ${item.useAprDay || '(없음)'}`);
        console.log('');

        // Determine building type using floor count heuristic
        const mainPurpose = item.mainPurpsCdNm || '';
        const floorCount = parseInt(item.grndFlrCnt || '0');
        let buildingType = 'unknown';

        if (mainPurpose === '아파트') {
          buildingType = 'apartment';
        } else if (mainPurpose === '연립주택' || mainPurpose === '다세대주택' || mainPurpose === '다가구주택') {
          buildingType = 'multifamily';
        } else if (mainPurpose === '공동주택') {
          // Korean law: 아파트 = 5+ stories
          buildingType = floorCount >= 5 ? 'apartment' : 'multifamily';
        } else if (mainPurpose.includes('아파트')) {
          buildingType = 'apartment';
        } else if (mainPurpose.includes('연립') || mainPurpose.includes('다세대') || mainPurpose.includes('다가구')) {
          buildingType = 'multifamily';
        } else if (floorCount >= 5) {
          buildingType = 'apartment'; // High-rise heuristic
        }

        console.log(`      → Detected type: ${buildingType} (based on ${floorCount} floors)`);
      }

    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
      if (error.response) {
        console.error(`   Response status: ${error.response.status}`);
        console.error(`   Response data: ${JSON.stringify(error.response.data).slice(0, 300)}`);
      }
    }
  }

  console.log('\n✨ Test complete!');
}

testBuildingRegistry().catch(console.error);
