/**
 * Script to map MOLIT dong codes to Building Registry dong codes
 * for all Gyeonggi districts.
 *
 * Run with: node scripts/map-gyeonggi-dong-codes.mjs
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const API_KEY = process.env.BUILDING_REGISTRY_API_KEY;
const BASE_URL = 'https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo';

// Gyeonggi districts extracted from address-data.ts
const GYEONGGI_DISTRICTS = [
  { name: '성남시 분당구', code: '41135', dongs: [
    { name: '분당동', code: '10100' }, { name: '수내동', code: '10200' }, { name: '정자동', code: '10300' },
    { name: '서현동', code: '10400' }, { name: '이매동', code: '10500' }, { name: '야탑동', code: '10600' },
    { name: '판교동', code: '10700' }, { name: '삼평동', code: '10800' }, { name: '백현동', code: '10900' },
    { name: '금곡동', code: '11000' }, { name: '궁내동', code: '11100' }, { name: '동원동', code: '11200' },
    { name: '구미동', code: '11300' }, { name: '운중동', code: '11400' }, { name: '대장동', code: '11500' }
  ]},
  { name: '성남시 수정구', code: '41131', dongs: [
    { name: '신흥동', code: '10100' }, { name: '태평동', code: '10200' }, { name: '수진동', code: '10300' },
    { name: '단대동', code: '10400' }, { name: '산성동', code: '10500' }, { name: '양지동', code: '10600' },
    { name: '복정동', code: '10700' }, { name: '창곡동', code: '10800' }, { name: '금토동', code: '10900' },
    { name: '시흥동', code: '11000' }, { name: '고등동', code: '11100' }
  ]},
  { name: '성남시 중원구', code: '41133', dongs: [
    { name: '성남동', code: '10100' }, { name: '중앙동', code: '10200' }, { name: '금광동', code: '10300' },
    { name: '은행동', code: '10400' }, { name: '상대원동', code: '10500' }, { name: '하대원동', code: '10600' },
    { name: '도촌동', code: '10700' }, { name: '여수동', code: '10800' }, { name: '갈현동', code: '10900' }
  ]},
  { name: '수원시 영통구', code: '41117', dongs: [
    { name: '영통동', code: '10100' }, { name: '망포동', code: '10200' }, { name: '원천동', code: '10300' },
    { name: '이의동', code: '10400' }, { name: '하동', code: '10500' }, { name: '신동', code: '10600' },
    { name: '광교동', code: '10700' }
  ]},
  { name: '수원시 장안구', code: '41111', dongs: [
    { name: '파장동', code: '10100' }, { name: '정자동', code: '10200' }, { name: '이목동', code: '10300' },
    { name: '율전동', code: '10400' }, { name: '천천동', code: '10500' }, { name: '영화동', code: '10600' },
    { name: '송죽동', code: '10700' }, { name: '조원동', code: '10800' }, { name: '연무동', code: '10900' }
  ]},
  { name: '수원시 권선구', code: '41113', dongs: [
    { name: '권선동', code: '10100' }, { name: '세류동', code: '10200' }, { name: '평동', code: '10300' },
    { name: '서둔동', code: '10400' }, { name: '구운동', code: '10500' }, { name: '금곡동', code: '10600' },
    { name: '호매실동', code: '10700' }, { name: '탑동', code: '10800' }, { name: '입북동', code: '10900' }
  ]},
  { name: '수원시 팔달구', code: '41115', dongs: [
    { name: '팔달로1가', code: '10100' }, { name: '팔달로2가', code: '10200' }, { name: '팔달로3가', code: '10300' },
    { name: '인계동', code: '10400' }, { name: '매산로1가', code: '10500' }, { name: '매산로2가', code: '10600' },
    { name: '매산로3가', code: '10700' }, { name: '우만동', code: '10800' }, { name: '매교동', code: '10900' },
    { name: '지동', code: '11000' }, { name: '고등동', code: '11100' }, { name: '화서동', code: '11200' }
  ]},
  { name: '용인시 수지구', code: '41465', dongs: [
    { name: '풍덕천동', code: '10100' }, { name: '죽전동', code: '10200' }, { name: '동천동', code: '10300' },
    { name: '고기동', code: '10400' }, { name: '신봉동', code: '10500' }, { name: '성복동', code: '10600' },
    { name: '상현동', code: '10700' }
  ]},
  { name: '용인시 기흥구', code: '41463', dongs: [
    { name: '기흥동', code: '10100' }, { name: '구갈동', code: '10200' }, { name: '상갈동', code: '10300' },
    { name: '보라동', code: '10400' }, { name: '신갈동', code: '10500' }, { name: '영덕동', code: '10600' },
    { name: '언남동', code: '10700' }, { name: '마북동', code: '10800' }, { name: '동백동', code: '10900' },
    { name: '중동', code: '11000' }, { name: '서천동', code: '11100' }
  ]},
  { name: '용인시 처인구', code: '41461', dongs: [
    { name: '김량장동', code: '10100' }, { name: '역북동', code: '10200' }, { name: '삼가동', code: '10300' },
    { name: '유방동', code: '10400' }, { name: '고림동', code: '10500' }, { name: '마평동', code: '10600' },
    { name: '운학동', code: '10700' }, { name: '호동', code: '10800' }
  ]},
  { name: '고양시 일산동구', code: '41285', dongs: [
    { name: '백석동', code: '10100' }, { name: '마두동', code: '10200' }, { name: '장항동', code: '10300' },
    { name: '정발산동', code: '10400' }, { name: '풍동', code: '10500' }, { name: '식사동', code: '10600' },
    { name: '중산동', code: '10700' }, { name: '산황동', code: '10800' }
  ]},
  { name: '고양시 일산서구', code: '41287', dongs: [
    { name: '주엽동', code: '10100' }, { name: '대화동', code: '10200' }, { name: '일산동', code: '10300' },
    { name: '탄현동', code: '10400' }, { name: '덕이동', code: '10500' }, { name: '가좌동', code: '10600' }
  ]},
  { name: '고양시 덕양구', code: '41281', dongs: [
    { name: '행신동', code: '10100' }, { name: '화정동', code: '10200' }, { name: '능곡동', code: '10300' },
    { name: '삼송동', code: '10400' }, { name: '원흥동', code: '10500' }, { name: '주교동', code: '10600' },
    { name: '대장동', code: '10700' }, { name: '성사동', code: '10800' }, { name: '향동동', code: '10900' }
  ]},
  { name: '하남시', code: '41450', dongs: [
    { name: '신장동', code: '10100' }, { name: '덕풍동', code: '10200' }, { name: '풍산동', code: '10300' },
    { name: '미사동', code: '10400' }, { name: '감일동', code: '10500' }, { name: '망월동', code: '10600' },
    { name: '감북동', code: '10700' }, { name: '천현동', code: '10800' }, { name: '창우동', code: '10900' },
    { name: '위례동', code: '11000' }
  ]},
  { name: '과천시', code: '41290', dongs: [
    { name: '중앙동', code: '10100' }, { name: '부림동', code: '10200' }, { name: '별양동', code: '10300' },
    { name: '갈현동', code: '10400' }, { name: '문원동', code: '10500' }, { name: '과천동', code: '10600' },
    { name: '주암동', code: '10700' }, { name: '막계동', code: '10800' }
  ]},
  { name: '남양주시', code: '41360', dongs: [
    { name: '호평동', code: '10100' }, { name: '평내동', code: '10200' }, { name: '금곡동', code: '10300' },
    { name: '양정동', code: '10400' }, { name: '다산동', code: '10500' }, { name: '별내동', code: '10600' },
    { name: '퇴계원동', code: '10700' }, { name: '오남동', code: '10800' }, { name: '진접읍', code: '10900' },
    { name: '화도읍', code: '11000' }
  ]},
  { name: '부천시', code: '41190', dongs: [
    { name: '상동', code: '10100' }, { name: '중동', code: '10200' }, { name: '송내동', code: '10300' },
    { name: '역곡동', code: '10400' }, { name: '심곡동', code: '10500' }, { name: '원미동', code: '10600' },
    { name: '춘의동', code: '10700' }, { name: '도당동', code: '10800' }, { name: '약대동', code: '10900' },
    { name: '오정동', code: '11000' }, { name: '고강동', code: '11100' }, { name: '작동', code: '11200' },
    { name: '소사동', code: '11300' }, { name: '범박동', code: '11400' }
  ]},
  { name: '광명시', code: '41210', dongs: [
    { name: '철산동', code: '10100' }, { name: '광명동', code: '10200' }, { name: '하안동', code: '10300' },
    { name: '소하동', code: '10400' }, { name: '일직동', code: '10500' }, { name: '가학동', code: '10600' },
    { name: '노온사동', code: '10700' }
  ]},
  { name: '안양시 동안구', code: '41173', dongs: [
    { name: '비산동', code: '10100' }, { name: '관양동', code: '10200' }, { name: '평촌동', code: '10300' },
    { name: '호계동', code: '10400' }, { name: '달안동', code: '10500' }, { name: '귀인동', code: '10600' }
  ]},
  { name: '안양시 만안구', code: '41171', dongs: [
    { name: '안양동', code: '10100' }, { name: '석수동', code: '10200' }, { name: '박달동', code: '10300' },
    { name: '신촌동', code: '10400' }
  ]},
  { name: '화성시', code: '41590', dongs: [
    { name: '동탄동', code: '10100' }, { name: '반송동', code: '10200' }, { name: '석우동', code: '10300' },
    { name: '영천동', code: '10400' }, { name: '장지동', code: '10500' }, { name: '오산동', code: '10600' },
    { name: '청계동', code: '10700' }, { name: '병점동', code: '10800' }, { name: '진안동', code: '10900' },
    { name: '반월동', code: '11000' }, { name: '기배동', code: '11100' }, { name: '목동', code: '11200' },
    { name: '산척동', code: '11300' }, { name: '송산동', code: '11400' }
  ]},
  { name: '김포시', code: '41570', dongs: [
    { name: '장기동', code: '10100' }, { name: '구래동', code: '10200' }, { name: '마산동', code: '10300' },
    { name: '운양동', code: '10400' }, { name: '풍무동', code: '10500' }, { name: '사우동', code: '10600' },
    { name: '걸포동', code: '10700' }, { name: '북변동', code: '10800' }, { name: '감정동', code: '10900' },
    { name: '고촌읍', code: '11000' }
  ]},
  { name: '안산시 단원구', code: '41273', dongs: [
    { name: '고잔동', code: '10100' }, { name: '와동', code: '10200' }, { name: '원곡동', code: '10300' },
    { name: '선부동', code: '10400' }, { name: '초지동', code: '10500' }, { name: '원시동', code: '10600' }
  ]},
  { name: '안산시 상록구', code: '41271', dongs: [
    { name: '본오동', code: '10100' }, { name: '사동', code: '10200' }, { name: '이동', code: '10300' },
    { name: '부곡동', code: '10400' }, { name: '성포동', code: '10500' }, { name: '월피동', code: '10600' },
    { name: '일동', code: '10700' }
  ]},
  { name: '의정부시', code: '41150', dongs: [
    { name: '의정부동', code: '10100' }, { name: '호원동', code: '10200' }, { name: '장암동', code: '10300' },
    { name: '신곡동', code: '10400' }, { name: '민락동', code: '10500' }, { name: '가능동', code: '10600' },
    { name: '금오동', code: '10700' }, { name: '녹양동', code: '10800' }
  ]},
  { name: '구리시', code: '41310', dongs: [
    { name: '교문동', code: '10100' }, { name: '인창동', code: '10200' }, { name: '갈매동', code: '10300' },
    { name: '수택동', code: '10400' }, { name: '토평동', code: '10500' }
  ]},
  { name: '군포시', code: '41410', dongs: [
    { name: '산본동', code: '10100' }, { name: '금정동', code: '10200' }, { name: '군포동', code: '10300' },
    { name: '당동', code: '10400' }, { name: '당정동', code: '10500' }, { name: '부곡동', code: '10600' }
  ]},
  { name: '시흥시', code: '41390', dongs: [
    { name: '정왕동', code: '10100' }, { name: '대야동', code: '10200' }, { name: '신천동', code: '10300' },
    { name: '은행동', code: '10400' }, { name: '매화동', code: '10500' }, { name: '목감동', code: '10600' },
    { name: '배곧동', code: '10700' }, { name: '능곡동', code: '10800' }, { name: '거모동', code: '10900' }
  ]},
  { name: '의왕시', code: '41430', dongs: [
    { name: '내손동', code: '10100' }, { name: '오전동', code: '10200' }, { name: '학의동', code: '10300' },
    { name: '포일동', code: '10400' }, { name: '월암동', code: '10500' }, { name: '청계동', code: '10600' }
  ]},
  { name: '파주시', code: '41480', dongs: [
    { name: '금촌동', code: '10100' }, { name: '교하동', code: '10200' }, { name: '야당동', code: '10300' },
    { name: '문발동', code: '10400' }, { name: '다율동', code: '10500' }, { name: '운정동', code: '10700' },
    { name: '목동동', code: '10800' }
  ]},
  { name: '이천시', code: '41500', dongs: [
    { name: '중리동', code: '10100' }, { name: '관고동', code: '10200' }, { name: '창전동', code: '10300' },
    { name: '증포동', code: '10400' }, { name: '사음동', code: '10500' }
  ]},
  { name: '오산시', code: '41370', dongs: [
    { name: '오산동', code: '10100' }, { name: '원동', code: '10200' }, { name: '세교동', code: '10300' },
    { name: '청학동', code: '10400' }, { name: '부산동', code: '10500' }
  ]},
  { name: '평택시', code: '41220', dongs: [
    { name: '비전동', code: '10100' }, { name: '소사동', code: '10200' }, { name: '지산동', code: '10300' },
    { name: '합정동', code: '10400' }, { name: '용이동', code: '10500' }, { name: '동삭동', code: '10600' },
    { name: '세교동', code: '10700' }, { name: '이충동', code: '10800' }, { name: '청북동', code: '10900' }
  ]},
  { name: '광주시', code: '41610', dongs: [
    { name: '경안동', code: '10100' }, { name: '송정동', code: '10200' }, { name: '쌍령동', code: '10300' },
    { name: '역동', code: '10400' }, { name: '태전동', code: '10500' }, { name: '목동', code: '10600' }
  ]},
  { name: '양주시', code: '41630', dongs: [
    { name: '옥정동', code: '10100' }, { name: '회천동', code: '10200' }, { name: '고읍동', code: '10300' },
    { name: '덕계동', code: '10400' }, { name: '백석읍', code: '10500' }, { name: '남면', code: '10600' }
  ]}
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function findRegistryCode(sigunguCd, dongName, molitCode) {
  const testCodes = [];
  for (let code = 10100; code <= 20000; code += 100) {
    testCodes.push(code.toString());
  }

  for (const code of testCodes) {
    const url = `${BASE_URL}?serviceKey=${API_KEY}&sigunguCd=${sigunguCd}&bjdongCd=${code}&numOfRows=1&pageNo=1&_type=json`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      const items = data.response?.body?.items?.item;
      const item = Array.isArray(items) ? items[0] : items;
      if (item?.platPlc?.includes(dongName)) {
        return code;
      }
    } catch (error) {}
    await delay(50);
  }
  return null;
}

async function mapDistrictCodes(district) {
  console.log(`\n📍 Processing ${district.name} (${district.code})...`);
  const mapping = {};
  let matchCount = 0, diffCount = 0, notFoundCount = 0;

  for (const dong of district.dongs) {
    const registryCode = await findRegistryCode(district.code, dong.name, dong.code);
    if (registryCode) {
      mapping[dong.code] = registryCode;
      if (registryCode === dong.code) {
        console.log(`  ✅ ${dong.name}: ${dong.code} (same)`);
        matchCount++;
      } else {
        console.log(`  🔄 ${dong.name}: ${dong.code} → ${registryCode}`);
        diffCount++;
      }
    } else {
      mapping[dong.code] = dong.code;
      console.log(`  ❓ ${dong.name}: ${dong.code} (not found, keeping original)`);
      notFoundCount++;
    }
  }
  console.log(`  Summary: ${matchCount} same, ${diffCount} different, ${notFoundCount} not found`);
  return mapping;
}

function generateTypeScriptMapping(districtMappings) {
  let code = `  // ============ GYEONGGI DISTRICTS ============\n`;
  for (const [districtCode, districtInfo] of Object.entries(districtMappings)) {
    code += `  // ${districtInfo.name} (${districtCode})\n`;
    code += `  '${districtCode}': {\n`;
    const entries = Object.entries(districtInfo.mapping);
    const chunks = [];
    for (let i = 0; i < entries.length; i += 5) {
      chunks.push(entries.slice(i, i + 5).map(([m, r]) => `'${m}': '${r}'`).join(', '));
    }
    code += `    ${chunks.join(',\n    ')},\n`;
    code += `  },\n`;
  }
  return code;
}

async function main() {
  console.log('🗺️ Mapping MOLIT to Building Registry dong codes for Gyeonggi districts...\n');
  console.log(`API Key: ${API_KEY ? '✅ Found' : '❌ Missing'}`);
  if (!API_KEY) {
    console.error('Please set BUILDING_REGISTRY_API_KEY in .env.local');
    process.exit(1);
  }

  const districtMappings = {};
  for (const district of GYEONGGI_DISTRICTS) {
    const mapping = await mapDistrictCodes(district);
    districtMappings[district.code] = { name: district.name, dongs: district.dongs, mapping };
  }

  const tsCode = generateTypeScriptMapping(districtMappings);
  console.log('\n\n========== TYPESCRIPT CODE (add to building-registry.ts) ==========\n');
  console.log(tsCode);

  const outputPath = path.join(__dirname, 'gyeonggi-dong-code-mapping-output.ts');
  fs.writeFileSync(outputPath, tsCode);
  console.log(`\n✅ Mapping saved to: ${outputPath}`);
}

main().catch(console.error);
