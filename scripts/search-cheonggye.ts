/**
 * Search for buildings matching 청계한신휴플러스 in 종로구
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { MolitAPI } from '../lib/apis/molit';

async function searchCheonggye() {
  const molit = new MolitAPI(process.env.MOLIT_API_KEY!);

  console.log('🔍 Searching for buildings in 종로구 (11110) with "청계", "한신", or "휴플러스"...\n');

  const testMonths = ['202510', '202509'];

  for (const month of testMonths) {
    const transactions = await molit.getApartmentTransactions('11110', month);

    const buildings = new Map<string, any[]>();
    transactions.forEach(t => {
      const name = t.apartmentName.trim();
      if (name.includes('청계') || name.includes('한신') || name.includes('휴플러스')) {
        if (!buildings.has(name)) {
          buildings.set(name, []);
        }
        buildings.get(name)!.push(t);
      }
    });

    if (buildings.size > 0) {
      console.log(`📅 Month: ${month}`);
      console.log(`   Found ${buildings.size} matching buildings:\n`);

      Array.from(buildings.entries()).forEach(([name, txs]) => {
        console.log(`   • ${name} (${txs.length} transactions)`);
      });
      console.log('');
    }
  }
}

searchCheonggye();
