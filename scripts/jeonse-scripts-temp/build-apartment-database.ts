/**
 * Build comprehensive apartment database from MOLIT API
 * Fetches all apartments with transactions in the last 12 months
 */

import { MolitAPI, getDistrictCode } from '../lib/apis/molit';
import { SEOUL_DISTRICTS } from '../lib/data/address-data';
import { generateApartmentEnglishName } from '../lib/utils/korean-transliteration';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.MOLIT_API_KEY;

if (!API_KEY) {
  console.error('❌ MOLIT_API_KEY not found in environment');
  process.exit(1);
}

interface ApartmentData {
  name: string;
  district: string;
  districtCode: string;
  dongs: Set<string>;
  transactionCount: number;
  areas: Set<number>;
  priceRange: {
    min: number;
    max: number;
  };
}

async function buildApartmentDatabase() {
  console.log('🏗️  Building comprehensive apartment database from MOLIT API');
  console.log('='.repeat(80));

  const molit = new MolitAPI(API_KEY!);
  const apartmentMap = new Map<string, ApartmentData>();

  // Get last 12 months (increased from 6 to capture more apartments)
  const months: string[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    months.push(`${year}${month.toString().padStart(2, '0')}`);
  }

  console.log(`\n📅 Fetching data for months: ${months.join(', ')}\n`);

  let totalTransactions = 0;
  let processedDistricts = 0;

  // Iterate through all Seoul districts
  for (const district of SEOUL_DISTRICTS) {
    console.log(`\n📍 Processing ${district.name} (${district.code})...`);

    let districtTransactions = 0;

    for (const month of months) {
      try {
        const transactions = await molit.getApartmentTransactions(district.code, month);
        districtTransactions += transactions.length;
        totalTransactions += transactions.length;

        // Process each transaction
        for (const transaction of transactions) {
          const key = `${district.name}|${transaction.apartmentName}`;

          if (!apartmentMap.has(key)) {
            apartmentMap.set(key, {
              name: transaction.apartmentName,
              district: district.name,
              districtCode: district.code,
              dongs: new Set([transaction.legalDong]),
              transactionCount: 1,
              areas: new Set([Math.round(transaction.exclusiveArea)]),
              priceRange: {
                min: transaction.transactionAmount,
                max: transaction.transactionAmount
              }
            });
          } else {
            const apt = apartmentMap.get(key)!;
            apt.dongs.add(transaction.legalDong);
            apt.transactionCount++;
            apt.areas.add(Math.round(transaction.exclusiveArea));
            apt.priceRange.min = Math.min(apt.priceRange.min, transaction.transactionAmount);
            apt.priceRange.max = Math.max(apt.priceRange.max, transaction.transactionAmount);
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`  ❌ Failed to fetch ${month}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log(`  ✓ Found ${districtTransactions} transactions in ${district.name}`);
    processedDistricts++;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n✅ Database build complete!`);
  console.log(`   Districts processed: ${processedDistricts}/${SEOUL_DISTRICTS.length}`);
  console.log(`   Total transactions: ${totalTransactions.toLocaleString()}`);
  console.log(`   Unique apartments: ${apartmentMap.size.toLocaleString()}\n`);

  // Convert to array and sort
  const apartments = Array.from(apartmentMap.values()).sort((a, b) => {
    // Sort by district, then by transaction count (descending), then by name
    if (a.district !== b.district) {
      return a.district.localeCompare(b.district);
    }
    if (a.transactionCount !== b.transactionCount) {
      return b.transactionCount - a.transactionCount;
    }
    return a.name.localeCompare(b.name);
  });

  // Generate statistics by district
  console.log('📊 Apartments by district:\n');
  const districtStats = new Map<string, number>();
  for (const apt of apartments) {
    districtStats.set(apt.district, (districtStats.get(apt.district) || 0) + 1);
  }

  for (const district of SEOUL_DISTRICTS) {
    const count = districtStats.get(district.name) || 0;
    console.log(`   ${district.name.padEnd(12)}: ${count.toString().padStart(4)} apartments`);
  }

  // Save to JSON file
  const outputPath = 'scripts/apartment-database.json';
  const output = {
    generatedAt: new Date().toISOString(),
    months: months,
    totalTransactions,
    totalApartments: apartments.length,
    apartments: apartments.map(apt => ({
      name: apt.name,
      nameEn: generateApartmentEnglishName(apt.name),
      district: apt.district,
      districtCode: apt.districtCode,
      dongs: Array.from(apt.dongs),
      transactionCount: apt.transactionCount,
      areas: Array.from(apt.areas).sort((a, b) => a - b),
      priceRange: apt.priceRange
    }))
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n💾 Saved to ${outputPath}`);

  // Show top 20 most active apartments
  console.log('\n🔥 Top 20 most active apartments (by transaction volume):\n');
  const top20 = apartments.slice(0, 20);
  top20.forEach((apt, idx) => {
    console.log(`   ${(idx + 1).toString().padStart(2)}. ${apt.name.padEnd(30)} (${apt.district}, ${apt.transactionCount} transactions)`);
  });

  // Check for 텐즈힐
  console.log('\n🔍 Checking for 텐즈힐...');
  const tenszhill = apartments.filter(apt =>
    apt.name.includes('텐즈') || apt.name.toLowerCase().includes('tens')
  );

  if (tenszhill.length > 0) {
    console.log(`   ✓ Found ${tenszhill.length} entries:`);
    tenszhill.forEach(apt => {
      console.log(`     - ${apt.name} (${apt.district}, ${apt.transactionCount} transactions, dongs: ${Array.from(apt.dongs).join(', ')})`);
    });
  } else {
    console.log('   ✗ Not found');
  }
}

buildApartmentDatabase().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
