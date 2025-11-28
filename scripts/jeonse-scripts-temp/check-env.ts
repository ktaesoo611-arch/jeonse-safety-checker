/**
 * Check Environment Configuration Status
 *
 * Run with: npx tsx scripts/check-env.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

function checkEnv() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  ENVIRONMENT CONFIGURATION STATUS          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  const checks = [
    {
      name: 'Supabase URL',
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      required: true,
      category: 'Supabase (Database)'
    },
    {
      name: 'Supabase Anon Key',
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      required: true,
      category: 'Supabase (Database)'
    },
    {
      name: 'Supabase Service Key',
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      required: true,
      category: 'Supabase (Database)'
    },
    {
      name: 'MOLIT API Key',
      key: 'MOLIT_API_KEY',
      required: true,
      category: 'Korean Government'
    },
    {
      name: 'Google Vision Credentials',
      key: 'GOOGLE_VISION_CREDENTIALS_PATH',
      required: false,
      category: 'Google Vision (OCR)'
    },
    {
      name: 'Toss Client Key',
      key: 'TOSS_PAYMENTS_CLIENT_KEY',
      required: false,
      category: 'Payments'
    },
    {
      name: 'Toss Secret Key',
      key: 'TOSS_PAYMENTS_SECRET_KEY',
      required: false,
      category: 'Payments'
    }
  ];

  let currentCategory = '';
  let requiredCount = 0;
  let requiredConfigured = 0;
  let optionalCount = 0;
  let optionalConfigured = 0;

  checks.forEach(check => {
    if (check.category !== currentCategory) {
      if (currentCategory) console.log();
      console.log(`📦 ${check.category}:`);
      currentCategory = check.category;
    }

    const value = process.env[check.key];
    const isConfigured = value &&
                        value !== 'your_supabase_url' &&
                        value !== 'your_supabase_anon_key' &&
                        value !== 'your_service_role_key' &&
                        value !== 'your_molit_api_key' &&
                        value !== 'your_google_vision_key' &&
                        value !== 'your_toss_client_key' &&
                        value !== 'your_toss_secret_key' &&
                        value.length > 0;

    const status = isConfigured ? '✅' : (check.required ? '❌' : '⚪');
    const label = check.required ? 'REQUIRED' : 'optional';

    console.log(`   ${status} ${check.name} (${label})`);

    if (check.required) {
      requiredCount++;
      if (isConfigured) requiredConfigured++;
    } else {
      optionalCount++;
      if (isConfigured) optionalConfigured++;
    }
  });

  console.log('\n' + '═'.repeat(48));
  console.log('📊 Summary:');
  console.log(`   Required: ${requiredConfigured}/${requiredCount} configured`);
  console.log(`   Optional: ${optionalConfigured}/${optionalCount} configured`);
  console.log('═'.repeat(48) + '\n');

  if (requiredConfigured === requiredCount) {
    console.log('🎉 All required APIs are configured!');
    console.log('   You can now run: npm run test:all\n');
  } else {
    console.log('⚠️  Missing required configuration:');
    checks
      .filter(c => c.required)
      .forEach(check => {
        const value = process.env[check.key];
        const isConfigured = value &&
                            value !== 'your_supabase_url' &&
                            value !== 'your_supabase_anon_key' &&
                            value !== 'your_service_role_key' &&
                            value !== 'your_molit_api_key' &&
                            value.length > 0;
        if (!isConfigured) {
          console.log(`   ❌ ${check.name}`);
        }
      });

    console.log('\n💡 Next steps:');
    if (requiredConfigured === 0) {
      console.log('   1. Set up Supabase (easiest - no Korean phone needed)');
      console.log('   2. Get data.go.kr API key');
    } else if (!process.env.MOLIT_API_KEY || process.env.MOLIT_API_KEY === 'your_molit_api_key') {
      console.log('   - Get data.go.kr MOLIT API key');
    } else {
      console.log('   - Complete Supabase setup');
    }
    console.log('\n   See: API-SETUP-WALKTHROUGH.md for detailed guides\n');
  }

  // Check if credential files exist
  console.log('📁 Credential Files:');
  const fs = require('fs');
  const path = require('path');

  const googleCredsPath = path.join(process.cwd(), 'credentials', 'google-vision.json');
  if (fs.existsSync(googleCredsPath)) {
    console.log('   ✅ Google Vision credentials found');
  } else {
    console.log('   ⚪ Google Vision credentials not found (optional)');
  }
  console.log();
}

checkEnv();
