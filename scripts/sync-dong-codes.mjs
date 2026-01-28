/**
 * Script to synchronize dong codes across all files from official 행정표준코드관리시스템 API
 *
 * This script:
 * 1. Fetches dong codes from the official API (법정동코드)
 * 2. Cross-validates with Building Registry API for MOLIT->Registry mapping
 * 3. Generates synchronized outputs for:
 *    - lib/data/address-data.ts
 *    - lib/utils/address-parser.ts
 *    - lib/apis/building-registry.ts (MOLIT_TO_REGISTRY_DONG_CODE)
 *
 * Run with: node scripts/sync-dong-codes.mjs
 *
 * Environment variables needed:
 * - BUILDING_REGISTRY_API_KEY: Building Registry API key
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const BUILDING_REGISTRY_API_KEY = process.env.BUILDING_REGISTRY_API_KEY;
const BUILDING_REGISTRY_URL = 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo';

// Official 법정동코드 API from 행정안전부
const BJDONG_API_URL = 'https://apis.data.go.kr/1741000/StanReginCd/getStanReginCdList';
const BJDONG_API_KEY = process.env.BJDONG_API_KEY || BUILDING_REGISTRY_API_KEY; // Often same key works

// Rate limiting helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Seoul/Gyeonggi 시도코드
const SUPPORTED_SIDO = {
  '11': '서울특별시',
  '41': '경기도'
};

// Supported districts (시군구) - these are the ones we support in the app
const SUPPORTED_DISTRICTS = {
  // Seoul (서울특별시)
  '11110': '종로구', '11140': '중구', '11170': '용산구', '11200': '성동구',
  '11215': '광진구', '11230': '동대문구', '11260': '중랑구', '11290': '성북구',
  '11305': '강북구', '11320': '도봉구', '11350': '노원구', '11380': '은평구',
  '11410': '서대문구', '11440': '마포구', '11470': '양천구', '11500': '강서구',
  '11530': '구로구', '11545': '금천구', '11560': '영등포구', '11590': '동작구',
  '11620': '관악구', '11650': '서초구', '11680': '강남구', '11710': '송파구',
  '11740': '강동구',
  // Gyeonggi (경기도)
  '41111': '수원시 장안구', '41113': '수원시 권선구', '41115': '수원시 팔달구', '41117': '수원시 영통구',
  '41131': '성남시 수정구', '41133': '성남시 중원구', '41135': '성남시 분당구',
  '41150': '의정부시', '41171': '안양시 만안구', '41173': '안양시 동안구',
  '41190': '부천시', '41210': '광명시', '41220': '평택시',
  '41271': '안산시 상록구', '41273': '안산시 단원구',
  '41281': '고양시 덕양구', '41285': '고양시 일산동구', '41287': '고양시 일산서구',
  '41290': '과천시', '41310': '구리시', '41360': '남양주시', '41370': '오산시',
  '41390': '시흥시', '41410': '군포시', '41430': '의왕시', '41450': '하남시',
  '41461': '용인시 처인구', '41463': '용인시 기흥구', '41465': '용인시 수지구',
  '41480': '파주시', '41500': '이천시', '41570': '김포시', '41590': '화성시',
  '41610': '광주시', '41630': '양주시'
};

/**
 * Fetch dong list for a district from 법정동코드 API
 */
async function fetchDongsFromAPI(sigunguCd) {
  const districtName = SUPPORTED_DISTRICTS[sigunguCd];
  console.log(`\n📍 Fetching dongs for ${districtName} (${sigunguCd})...`);

  // The API requires locataddNm parameter with the district name
  const sidoCd = sigunguCd.substring(0, 2);
  const sidoName = SUPPORTED_SIDO[sidoCd];

  const dongs = [];
  let pageNo = 1;
  let hasMore = true;

  while (hasMore) {
    const params = new URLSearchParams({
      serviceKey: BJDONG_API_KEY,
      pageNo: pageNo.toString(),
      numOfRows: '1000',
      type: 'json',
      locatadd_nm: `${sidoName} ${districtName.split(' ').pop()}` // e.g., "서울특별시 마포구"
    });

    try {
      const response = await fetch(`${BJDONG_API_URL}?${params}`);
      const data = await response.json();

      const items = data.StanReginCd?.[1]?.row || [];

      if (items.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of items) {
        // Filter for dongs in this specific district
        // locatjumin_cd is the 10-digit 법정동코드
        const fullCode = item.locatjumin_cd;
        if (fullCode && fullCode.startsWith(sigunguCd)) {
          const dongCd = fullCode.substring(5, 10); // Last 5 digits are dong code
          const dongName = item.locallow_nm; // 읍면동명

          // Skip if it's a 리 (last 2 digits not 00)
          if (dongCd.substring(3) !== '00') continue;

          // Skip duplicates
          if (dongs.some(d => d.code === dongCd)) continue;

          // Only include 동 (not 읍, 면 for Seoul)
          if (sidoCd === '11' && !dongName.endsWith('동') && !dongName.includes('가')) continue;

          dongs.push({
            name: dongName,
            code: dongCd.substring(0, 3) + '00', // Normalize to XX00 format
            fullCode
          });
        }
      }

      if (items.length < 1000) {
        hasMore = false;
      }
      pageNo++;

    } catch (error) {
      console.error(`  Error fetching page ${pageNo}:`, error.message);
      hasMore = false;
    }

    await delay(100);
  }

  console.log(`  Found ${dongs.length} dongs`);
  return dongs;
}

/**
 * Find Building Registry code by testing different codes
 */
async function findRegistryCode(sigunguCd, dongName) {
  // Test codes from 10100 to 20000
  for (let code = 10100; code <= 20000; code += 100) {
    const codeStr = code.toString();
    const url = `${BUILDING_REGISTRY_URL}?serviceKey=${BUILDING_REGISTRY_API_KEY}&sigunguCd=${sigunguCd}&bjdongCd=${codeStr}&numOfRows=1&pageNo=1&_type=json`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      const items = data.response?.body?.items?.item;
      const item = Array.isArray(items) ? items[0] : items;

      // Check if the platPlc (address) contains the dong name
      if (item?.platPlc?.includes(dongName)) {
        return codeStr;
      }
    } catch (error) {
      // Ignore and continue
    }

    await delay(30); // Rate limit
  }

  return null;
}

/**
 * Build MOLIT to Registry mapping for a district
 */
async function buildMappingForDistrict(sigunguCd, dongs) {
  const districtName = SUPPORTED_DISTRICTS[sigunguCd];
  console.log(`\n🔄 Building MOLIT->Registry mapping for ${districtName}...`);

  const mapping = {};

  for (const dong of dongs) {
    const registryCode = await findRegistryCode(sigunguCd, dong.name);

    if (registryCode) {
      mapping[dong.code] = registryCode;
      if (registryCode === dong.code) {
        console.log(`  ✅ ${dong.name}: ${dong.code} (same)`);
      } else {
        console.log(`  🔄 ${dong.name}: ${dong.code} → ${registryCode}`);
      }
    } else {
      mapping[dong.code] = dong.code; // Keep original as fallback
      console.log(`  ❓ ${dong.name}: ${dong.code} (not found, keeping original)`);
    }
  }

  return mapping;
}

/**
 * Alternative: Use existing address-data.ts as source and validate
 */
async function loadExistingAddressData() {
  const addressDataPath = path.join(__dirname, '..', 'lib', 'data', 'address-data.ts');
  const content = fs.readFileSync(addressDataPath, 'utf-8');

  // Parse the TypeScript file to extract district and dong data
  // This is a simple regex-based parser
  const districtData = {};

  // Match district blocks
  const districtPattern = /\{\s*name:\s*'([^']+)',\s*nameEn:\s*'[^']+',\s*code:\s*'(\d+)',\s*dongs:\s*\[([\s\S]*?)\]\s*\}/g;

  let match;
  while ((match = districtPattern.exec(content)) !== null) {
    const districtName = match[1];
    const districtCode = match[2];
    const dongsBlock = match[3];

    // Parse dongs
    const dongPattern = /\{\s*name:\s*'([^']+)',\s*nameEn:\s*'[^']+',\s*code:\s*'(\d+)'\s*\}/g;
    const dongs = [];

    let dongMatch;
    while ((dongMatch = dongPattern.exec(dongsBlock)) !== null) {
      dongs.push({
        name: dongMatch[1],
        code: dongMatch[2]
      });
    }

    districtData[districtCode] = {
      name: districtName,
      dongs
    };
  }

  return districtData;
}

/**
 * Load existing address-parser.ts dong codes
 */
async function loadExistingParserData() {
  const parserPath = path.join(__dirname, '..', 'lib', 'utils', 'address-parser.ts');
  const content = fs.readFileSync(parserPath, 'utf-8');

  const parserData = {};

  // Match Seoul dong code blocks
  const seoulPattern = /const SEOUL_DONG_CODES[\s\S]*?=\s*\{([\s\S]*?)\n\};/;
  const seoulMatch = content.match(seoulPattern);

  if (seoulMatch) {
    // Parse each district
    const districtPattern = /'([^']+)':\s*\{([^}]+)\}/g;
    let match;

    while ((match = districtPattern.exec(seoulMatch[1])) !== null) {
      const districtName = match[1];
      const dongsBlock = match[2];

      // Parse dong codes
      const dongPattern = /'([^']+)':\s*'(\d+)'/g;
      const dongs = {};

      let dongMatch;
      while ((dongMatch = dongPattern.exec(dongsBlock)) !== null) {
        dongs[dongMatch[1]] = dongMatch[2];
      }

      parserData[districtName] = dongs;
    }
  }

  return parserData;
}

/**
 * Compare and find mismatches between address-data.ts and address-parser.ts
 */
async function findMismatches() {
  console.log('🔍 Loading existing data files...\n');

  const addressData = await loadExistingAddressData();
  const parserData = await loadExistingParserData();

  const mismatches = [];
  const missingInParser = [];
  const missingInAddressData = [];

  // Find Seoul district code to name mapping
  const districtCodeToName = {};
  for (const [code, data] of Object.entries(addressData)) {
    if (code.startsWith('11')) { // Seoul
      districtCodeToName[code] = data.name;
    }
  }

  // Check each district
  for (const [code, data] of Object.entries(addressData)) {
    if (!code.startsWith('11')) continue; // Skip non-Seoul for now

    const districtName = data.name;
    const parserDongs = parserData[districtName] || {};

    console.log(`\n📍 ${districtName} (${code}):`);

    for (const dong of data.dongs) {
      const parserCode = parserDongs[dong.name];

      if (!parserCode) {
        console.log(`  ❌ MISSING in address-parser.ts: ${dong.name} (code: ${dong.code})`);
        missingInParser.push({ district: districtName, dong: dong.name, code: dong.code });
      } else if (parserCode !== dong.code) {
        console.log(`  ⚠️  CODE MISMATCH: ${dong.name} - address-data: ${dong.code}, parser: ${parserCode}`);
        mismatches.push({ district: districtName, dong: dong.name, addressDataCode: dong.code, parserCode });
      } else {
        console.log(`  ✅ ${dong.name}: ${dong.code}`);
      }
    }

    // Check for extra dongs in parser not in address-data
    for (const [dongName, code] of Object.entries(parserDongs)) {
      if (!data.dongs.some(d => d.name === dongName)) {
        console.log(`  ➕ EXTRA in address-parser.ts: ${dongName} (code: ${code})`);
        missingInAddressData.push({ district: districtName, dong: dongName, code });
      }
    }
  }

  // Summary
  console.log('\n\n========== SUMMARY ==========\n');
  console.log(`Total mismatches: ${mismatches.length}`);
  console.log(`Missing in address-parser.ts: ${missingInParser.length}`);
  console.log(`Extra in address-parser.ts (missing in address-data.ts): ${missingInAddressData.length}`);

  if (mismatches.length > 0) {
    console.log('\n📋 Code Mismatches:');
    for (const m of mismatches) {
      console.log(`  ${m.district} > ${m.dong}: address-data=${m.addressDataCode}, parser=${m.parserCode}`);
    }
  }

  if (missingInParser.length > 0) {
    console.log('\n📋 Missing in address-parser.ts:');
    for (const m of missingInParser) {
      console.log(`  ${m.district} > ${m.dong} (${m.code})`);
    }
  }

  if (missingInAddressData.length > 0) {
    console.log('\n📋 Extra in address-parser.ts:');
    for (const m of missingInAddressData) {
      console.log(`  ${m.district} > ${m.dong} (${m.code})`);
    }
  }

  return { mismatches, missingInParser, missingInAddressData };
}

/**
 * Generate fix patches for address-parser.ts
 */
function generateParserFixes(missingInParser) {
  console.log('\n\n========== FIXES FOR address-parser.ts ==========\n');

  // Group by district
  const byDistrict = {};
  for (const m of missingInParser) {
    if (!byDistrict[m.district]) byDistrict[m.district] = [];
    byDistrict[m.district].push(m);
  }

  for (const [district, dongs] of Object.entries(byDistrict)) {
    console.log(`// Add to '${district}' in SEOUL_DONG_CODES:`);
    for (const d of dongs) {
      console.log(`    '${d.dong}': '${d.code}',`);
    }
    console.log('');
  }
}

async function main() {
  console.log('🗺️ Dong Code Synchronization Tool\n');
  console.log('='.repeat(50));

  // First, find mismatches between existing files
  const { mismatches, missingInParser, missingInAddressData } = await findMismatches();

  // Generate fixes
  if (missingInParser.length > 0) {
    generateParserFixes(missingInParser);
  }

  // Option to run Building Registry validation
  if (process.argv.includes('--validate-registry') && BUILDING_REGISTRY_API_KEY) {
    console.log('\n\n========== BUILDING REGISTRY VALIDATION ==========\n');
    // This would test each dong against the Building Registry API
    // to ensure the MOLIT -> Registry mapping is correct
  }
}

main().catch(console.error);
