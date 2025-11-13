/**
 * Search for I-Park buildings in Guro-gu
 */

import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { MolitAPI } from '../lib/apis/molit';

async function searchIParkGuro() {
  console.log('🔍 Searching for I-Park (아이파크) buildings in Guro-gu...\n');

  const apiKey = process.env.MOLIT_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: MOLIT_API_KEY not found');
    process.exit(1);
  }

  const molit = new MolitAPI(apiKey);
  const guroCode = '11530';
  const testMonths = ['202411', '202410', '202409'];

  const allBuildings = new Set<string>();

  for (const month of testMonths) {
    console.log(`\n📅 Checking ${month}...`);
    
    try {
      const transactions = await molit.getApartmentTransactions(guroCode, month);
      
      transactions.forEach(t => {
        if (t.apartmentName.includes('아이파크') || t.apartmentName.includes('I-PARK') || t.apartmentName.includes('ipark')) {
          allBuildings.add(t.apartmentName.trim());
        }
      });
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log(`\n\n🏢 Found ${allBuildings.size} buildings with "아이파크" in Guro-gu:\n`);
  
  Array.from(allBuildings).sort().forEach(name => {
    console.log(`   • ${name}`);
  });
}

searchIParkGuro();
