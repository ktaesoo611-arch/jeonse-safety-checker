/**
 * Test script for Apick API - 등기부등본 lookup
 * Run with: npx tsx scripts/test-apick.ts
 *
 * WARNING: This costs 800 points per lookup!
 */

import { config } from 'dotenv';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local FIRST before any imports that might use env vars
config({ path: '.env.local' });

const APICK_BASE_URL = 'https://apick.app/rest';

async function testRegistryLookup() {
  const apiKey = process.env.APICK_API_KEY;

  if (!apiKey) {
    console.error('❌ APICK_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('🔑 API Key:', apiKey.substring(0, 8) + '...');

  // Test address: 광명아크포레자이위브 1105동 104호
  const address = '광명아크포레자이위브 1105동 104호';
  const type = '집합건물';

  console.log('\n📍 Address:', address);
  console.log('📋 Type:', type);
  console.log('💰 Cost: 800 points\n');

  // Step 1: Request registry (열람 요청)
  console.log('Step 1: Requesting registry document...');

  try {
    const params = new URLSearchParams();
    params.append('address', address);
    params.append('type', type);

    console.log('  URL:', `${APICK_BASE_URL}/iros/1`);
    console.log('  Headers: CL_AUTH_KEY:', apiKey.substring(0, 8) + '...');
    console.log('  Body:', params.toString());

    const response = await axios.post(
      `${APICK_BASE_URL}/iros/1`,
      params.toString(),
      {
        headers: {
          'CL_AUTH_KEY': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 60000,
      }
    );

    console.log('\n📥 Response:');
    console.log(JSON.stringify(response.data, null, 2));

    const data = response.data;

    if (data.result?.error) {
      console.error('\n❌ API Error:', data.result.error);
      return;
    }

    if (data.data?.success === 1 && data.data?.ic_id) {
      const ic_id = data.data.ic_id;
      console.log('\n✅ Request successful! ic_id:', ic_id);

      // Step 2: Wait and download
      console.log('\nStep 2: Waiting 10 seconds for document generation...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      console.log('Step 3: Downloading document...');
      await downloadRegistry(apiKey, ic_id);
    } else {
      console.error('\n❌ Request failed');
      console.error('Success code:', data.data?.success);
    }
  } catch (error: any) {
    console.error('\n❌ Request error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function downloadRegistry(apiKey: string, ic_id: number, retries = 5) {
  for (let i = 1; i <= retries; i++) {
    console.log(`  Download attempt ${i}/${retries}...`);

    try {
      const params = new URLSearchParams();
      params.append('ic_id', ic_id.toString());
      params.append('format', 'excel');

      const response = await axios.post(
        `${APICK_BASE_URL}/iros_download/1`,
        params.toString(),
        {
          headers: {
            'CL_AUTH_KEY': apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          responseType: 'arraybuffer',
          timeout: 60000,
        }
      );

      // Check if still processing
      const result = response.headers['result'];
      if (result === '2') {
        console.log('  Still processing, waiting 5 seconds...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      // Save file
      const outputDir = path.join(process.cwd(), 'test-output');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, 'deunggibu-test.xlsx');
      fs.writeFileSync(outputPath, response.data);

      console.log('\n✅ Download successful!');
      console.log('📦 Size:', response.data.byteLength, 'bytes');
      console.log('💾 Saved to:', outputPath);
      return;
    } catch (error: any) {
      console.error('  Download error:', error.message);
    }
  }

  console.error('\n❌ Max retries exceeded');
}

testRegistryLookup();
