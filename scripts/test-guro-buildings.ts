/**
 * Test MOLIT API for Guro-gu Gaebong-dong buildings
 * This script will pull recent transaction data to see what building names are actually in MOLIT
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') });

import { MolitAPI } from '../lib/apis/molit';

async function testGuroBuildings() {
  console.log('🧪 Testing MOLIT API for Guro-gu buildings...\n');

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: MOLIT_API_KEY not found');
    process.exit(1);
  }

  const molit = new MolitAPI(apiKey);

  // Guro-gu (구로구) code: 11530
  const guroCode = '11530';

  // Try recent months
  const testMonths = ['202411', '202410', '202409', '202408'];

  console.log(`📊 Testing Guro-gu (구로구) - Code: ${guroCode}\n`);

  for (const month of testMonths) {
    console.log(`\n📅 Fetching data for ${month}...`);

    try {
      const transactions = await molit.getApartmentTransactions(guroCode, month);

      console.log(`   ✓ Received ${transactions.length} transactions\n`);

      if (transactions.length > 0) {
        // Find all unique building names with "개봉" or "아이파크"
        const buildings = new Map<string, any[]>();

        transactions.forEach(t => {
          const name = t.apartmentName.trim();
          if (name.includes('개봉') || name.includes('아이파크')) {
            if (!buildings.has(name)) {
              buildings.set(name, []);
            }
            buildings.get(name)!.push(t);
          }
        });

        console.log(`   🏢 Found ${buildings.size} buildings with "개봉" or "아이파크":\n`);

        // Sort by number of transactions
        const sortedBuildings = Array.from(buildings.entries())
          .sort((a, b) => b[1].length - a[1].length);

        sortedBuildings.forEach(([name, txs]) => {
          console.log(`   • ${name} (${txs.length} transactions)`);
          // Show first transaction as example
          const first = txs[0];
          console.log(`      Example: ${first.exclusiveArea}㎡ - ₩${first.transactionAmount.toLocaleString()} (${first.year}-${first.month}-${first.day})`);
        });

        if (sortedBuildings.length > 0) {
          console.log('\n✅ Success! Found building data\n');
          break;
        }
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}\n`);
    }
  }
}

testGuroBuildings();
