/**
 * Add Gyeonggi apartments to existing apartment database
 * Fetches all apartments with transactions in the last 12 months from Gyeonggi province
 */

import { MolitAPI } from '../../lib/apis/molit';
import { GYEONGGI_DISTRICTS } from '../../lib/data/address-data';
import { generateApartmentEnglishName } from '../../lib/utils/korean-transliteration';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.MOLIT_API_KEY;

if (!API_KEY) {
  console.error('MOLIT_API_KEY not found in environment');
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

interface ExistingApartment {
  name: string;
  nameEn: string;
  district: string;
  districtCode: string;
  dongs: string[];
  transactionCount: number;
  areas: number[];
  priceRange: {
    min: number;
    max: number;
  };
}

interface ApartmentDatabase {
  generatedAt: string;
  months: string[];
  totalTransactions: number;
  totalApartments: number;
  apartments: ExistingApartment[];
}

async function addGyeonggiApartments() {
  console.log('Building Gyeonggi apartment database from MOLIT API');
  console.log('='.repeat(80));

  const molit = new MolitAPI(API_KEY!);
  const apartmentMap = new Map<string, ApartmentData>();

  // Get last 12 months
  const months: string[] = [];
  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const targetDate = new Date(today);
    targetDate.setMonth(today.getMonth() - i);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    months.push(`${year}${month.toString().padStart(2, '0')}`);
  }

  console.log(`\nFetching data for months: ${months.join(', ')}\n`);

  let totalTransactions = 0;
  let processedDistricts = 0;

  // Iterate through all Gyeonggi districts
  for (const district of GYEONGGI_DISTRICTS) {
    console.log(`\nProcessing ${district.name} (${district.code})...`);

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

        // Rate limiting - be more conservative
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`  Failed to fetch ${month}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log(`  Found ${districtTransactions} transactions in ${district.name}`);
    processedDistricts++;
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\nGyeonggi data fetch complete!`);
  console.log(`   Districts processed: ${processedDistricts}/${GYEONGGI_DISTRICTS.length}`);
  console.log(`   Total transactions: ${totalTransactions.toLocaleString()}`);
  console.log(`   Unique apartments: ${apartmentMap.size.toLocaleString()}\n`);

  // Convert to array
  const gyeonggiApartments = Array.from(apartmentMap.values()).map(apt => ({
    name: apt.name,
    nameEn: generateApartmentEnglishName(apt.name),
    district: apt.district,
    districtCode: apt.districtCode,
    dongs: Array.from(apt.dongs),
    transactionCount: apt.transactionCount,
    areas: Array.from(apt.areas).sort((a, b) => a - b),
    priceRange: apt.priceRange
  }));

  // Load existing database
  const dbPath = path.join(__dirname, '../../lib/data/apartment-database.json');
  let existingDb: ApartmentDatabase;

  try {
    const existingData = fs.readFileSync(dbPath, 'utf-8');
    existingDb = JSON.parse(existingData);
    console.log(`Loaded existing database with ${existingDb.apartments.length} apartments`);
  } catch (error) {
    console.error('Failed to load existing database:', error);
    process.exit(1);
  }

  // Filter out Seoul apartments (keep only Seoul, add Gyeonggi)
  const seoulApartments = existingDb.apartments.filter(apt =>
    apt.districtCode.startsWith('11')
  );

  console.log(`Keeping ${seoulApartments.length} Seoul apartments`);
  console.log(`Adding ${gyeonggiApartments.length} Gyeonggi apartments`);

  // Combine and sort
  const allApartments = [...seoulApartments, ...gyeonggiApartments].sort((a, b) => {
    // Sort by district code, then by transaction count (descending), then by name
    if (a.districtCode !== b.districtCode) {
      return a.districtCode.localeCompare(b.districtCode);
    }
    if (a.transactionCount !== b.transactionCount) {
      return b.transactionCount - a.transactionCount;
    }
    return a.name.localeCompare(b.name);
  });

  // Calculate total transactions
  const totalTxCount = allApartments.reduce((sum, apt) => sum + apt.transactionCount, 0);

  // Create updated database
  const updatedDb: ApartmentDatabase = {
    generatedAt: new Date().toISOString(),
    months: months,
    totalTransactions: totalTxCount,
    totalApartments: allApartments.length,
    apartments: allApartments
  };

  // Save updated database
  fs.writeFileSync(dbPath, JSON.stringify(updatedDb, null, 2), 'utf-8');
  console.log(`\nSaved updated database to ${dbPath}`);
  console.log(`   Total apartments: ${allApartments.length}`);
  console.log(`   Total transactions: ${totalTxCount.toLocaleString()}`);

  // Show stats by region
  console.log('\nApartments by region:');
  const seoulCount = allApartments.filter(apt => apt.districtCode.startsWith('11')).length;
  const gyeonggiCount = allApartments.filter(apt => apt.districtCode.startsWith('41')).length;
  console.log(`   Seoul: ${seoulCount}`);
  console.log(`   Gyeonggi: ${gyeonggiCount}`);

  // Show top 20 Gyeonggi apartments
  console.log('\nTop 20 Gyeonggi apartments (by transaction volume):\n');
  const topGyeonggi = gyeonggiApartments
    .sort((a, b) => b.transactionCount - a.transactionCount)
    .slice(0, 20);

  topGyeonggi.forEach((apt, idx) => {
    console.log(`   ${(idx + 1).toString().padStart(2)}. ${apt.name.padEnd(30)} (${apt.district}, ${apt.transactionCount} txns)`);
  });
}

addGyeonggiApartments().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
