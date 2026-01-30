/**
 * Generate nationwide-codes.ts from 법정동코드 dataset
 *
 * Reads: /Users/tskim/Downloads/법정동코드_전체자료_UTF8.txt
 * Outputs: lib/data/nationwide-codes.ts
 *
 * Run with: npx tsx scripts/generate-nationwide-codes.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const INPUT_FILE = '/Users/tskim/Downloads/법정동코드_전체자료_UTF8.txt';
const OUTPUT_FILE = join(__dirname, '..', 'lib', 'data', 'nationwide-codes.ts');

// Alias maps: full name → abbreviation, old names
const SIDO_ALIASES: Record<string, string[]> = {
  '서울특별시': ['서울'],
  '부산광역시': ['부산'],
  '대구광역시': ['대구'],
  '인천광역시': ['인천'],
  '광주광역시': [],  // Do NOT alias bare '광주' — ambiguous with 경기도 광주시
  '대전광역시': ['대전'],
  '울산광역시': ['울산'],
  '세종특별자치시': ['세종'],
  '경기도': ['경기'],
  '강원특별자치도': ['강원', '강원도'],
  '충청북도': ['충북'],
  '충청남도': ['충남'],
  '전북특별자치도': ['전북', '전라북도'],
  '전라남도': ['전남'],
  '경상북도': ['경북'],
  '경상남도': ['경남'],
  '제주특별자치도': ['제주'],
};

interface RawEntry {
  code: string;      // 10-digit code
  name: string;      // Full hierarchical name
  active: boolean;   // 존재 = true
}

function parseInputFile(): RawEntry[] {
  const content = readFileSync(INPUT_FILE, 'utf-8');
  const lines = content.split('\n');
  const entries: RawEntry[] = [];

  for (let i = 1; i < lines.length; i++) { // skip header
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('\t');
    if (parts.length < 3) continue;

    entries.push({
      code: parts[0].trim(),
      name: parts[1].trim(),
      active: parts[2].trim() === '존재',
    });
  }

  return entries;
}

function generate() {
  const entries = parseInputFile();
  const activeEntries = entries.filter(e => e.active);

  console.log(`Total entries: ${entries.length}, Active: ${activeEntries.length}`);

  // Build SIDO_CODES and SIDO_NAMES
  const sidoCodes: Record<string, string> = {};
  const sidoNames: Record<string, string> = {};

  // Build DISTRICT_CODES: "sidoCode|districtName" → 5-digit code
  const districtCodes: Record<string, string> = {};

  // Build DONG_CODES: 5-digit sigunguCd → { dongName → 5-digit bjdongCd }
  const dongCodes: Record<string, Record<string, string>> = {};

  for (const entry of activeEntries) {
    const code = entry.code;
    const nameParts = entry.name.split(' ');

    // 10-digit code structure:
    // XX 000 00000 = sido (digits 1-2, rest zeros)
    // XX XXX 00000 = sigungu (digits 1-5, last 5 zeros)
    // XX XXX XXXXX = dong (all 10 digits used)

    const sidoCode = code.substring(0, 2);
    const sigunguCode = code.substring(0, 5);
    const dongCode = code.substring(5, 10);

    const isSido = code.substring(2, 10) === '00000000';
    const isSigungu = !isSido && code.substring(5, 10) === '00000';
    const isDong = !isSido && !isSigungu;

    if (isSido) {
      const sidoName = nameParts[0];
      sidoCodes[sidoName] = sidoCode;
      sidoNames[sidoCode] = sidoName;

      // Add aliases
      const aliases = SIDO_ALIASES[sidoName];
      if (aliases) {
        for (const alias of aliases) {
          sidoCodes[alias] = sidoCode;
        }
      }
    } else if (isSigungu) {
      // The district name is everything after the sido
      const districtName = nameParts.slice(1).join(' ');

      // Special case: 세종특별자치시 has no sido-level entry (no 3600000000).
      // Its sigungu code 36110 has name "세종특별자치시" (single part, no space).
      // We need to register 세종 as a sido and map its district.
      if (sidoCode === '36' && !sidoNames['36']) {
        const sidoName = nameParts[0]; // 세종특별자치시
        sidoCodes[sidoName] = sidoCode;
        sidoNames[sidoCode] = sidoName;
        const aliases = SIDO_ALIASES[sidoName];
        if (aliases) {
          for (const alias of aliases) {
            sidoCodes[alias] = sidoCode;
          }
        }
      }

      if (districtName) {
        const key = `${sidoCode}|${districtName}`;
        districtCodes[key] = sigunguCode;
      } else {
        // 세종: sigungu name equals sido name (single part), store as "세종시" alias
        districtCodes[`${sidoCode}|세종시`] = sigunguCode;
        districtCodes[`${sidoCode}|세종특별자치시`] = sigunguCode;
      }
    } else if (isDong) {
      // Dong: last part of the name
      const dongName = nameParts[nameParts.length - 1];

      if (!dongCodes[sigunguCode]) {
        dongCodes[sigunguCode] = {};
      }
      dongCodes[sigunguCode][dongName] = dongCode;
    }
  }

  // 세종 dongs are directly under sigungu 36110, with name "세종특별자치시 XX동"
  // So the dong entries have sigunguCode = '36110', which is correct.

  // Stats
  const sidoCount = Object.keys(sidoNames).length;
  const districtCount = Object.keys(districtCodes).length;
  let dongCount = 0;
  for (const dongs of Object.values(dongCodes)) {
    dongCount += Object.keys(dongs).length;
  }

  console.log(`시도: ${sidoCount}`);
  console.log(`시군구: ${districtCount}`);
  console.log(`읍면동: ${dongCount}`);
  console.log(`SIDO_CODES entries: ${Object.keys(sidoCodes).length}`);

  // Generate output TypeScript file
  const output = generateTypeScript(sidoCodes, sidoNames, districtCodes, dongCodes);
  writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`\nWritten to: ${OUTPUT_FILE}`);
  console.log(`File size: ${(Buffer.byteLength(output, 'utf-8') / 1024).toFixed(0)} KB`);
}

function generateTypeScript(
  sidoCodes: Record<string, string>,
  sidoNames: Record<string, string>,
  districtCodes: Record<string, string>,
  dongCodes: Record<string, Record<string, string>>
): string {
  let out = '';

  out += '/**\n';
  out += ' * Nationwide 법정동코드 lookup data\n';
  out += ' * AUTO-GENERATED by scripts/generate-nationwide-codes.ts\n';
  out += ' * DO NOT EDIT MANUALLY\n';
  out += ' *\n';
  out += ` * Generated from 법정동코드_전체자료_UTF8.txt\n`;
  out += ' */\n\n';

  // SIDO_CODES
  out += '/** Map sido names (including abbreviations and old names) to 2-digit sido code */\n';
  out += 'export const SIDO_CODES: Record<string, string> = {\n';
  for (const [name, code] of Object.entries(sidoCodes).sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))) {
    out += `  '${name}': '${code}',\n`;
  }
  out += '};\n\n';

  // SIDO_NAMES
  out += '/** Map 2-digit sido code to official sido name */\n';
  out += 'export const SIDO_NAMES: Record<string, string> = {\n';
  for (const [code, name] of Object.entries(sidoNames).sort((a, b) => a[0].localeCompare(b[0]))) {
    out += `  '${code}': '${name}',\n`;
  }
  out += '};\n\n';

  // DISTRICT_CODES
  out += '/** Map "sidoCode|districtName" to 5-digit LAWD code (시군구코드) */\n';
  out += 'export const DISTRICT_CODES: Record<string, string> = {\n';
  for (const [key, code] of Object.entries(districtCodes).sort((a, b) => a[1].localeCompare(b[1]))) {
    out += `  '${key}': '${code}',\n`;
  }
  out += '};\n\n';

  // DONG_CODES
  out += '/** Map 5-digit sigunguCd to { dongName: 5-digit bjdongCd } */\n';
  out += 'export const DONG_CODES: Record<string, Record<string, string>> = {\n';
  for (const sigunguCd of Object.keys(dongCodes).sort()) {
    const dongs = dongCodes[sigunguCd];
    out += `  '${sigunguCd}': {\n`;
    for (const [dongName, dongCode] of Object.entries(dongs).sort((a, b) => a[0].localeCompare(b[0]))) {
      out += `    '${dongName}': '${dongCode}',\n`;
    }
    out += '  },\n';
  }
  out += '};\n';

  return out;
}

generate();
