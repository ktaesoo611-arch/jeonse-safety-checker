/**
 * Check for missing dongs in SEOUL_DISTRICTS configuration
 * Compares apartment database with address-data.ts to find missing dongs
 */

import fs from 'fs';
import path from 'path';
import { SEOUL_DISTRICTS } from '../lib/data/address-data';

interface Apartment {
  name: string;
  district?: string;
  dong?: string;
}

// Load apartment database
const dbPath = path.join(process.cwd(), 'scripts', 'apartment-database.json');
const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const apartments: Apartment[] = data.apartments;

// Group apartments by district and dong
const apartmentsByDistrict: Record<string, Set<string>> = {};
apartments.forEach(apt => {
  if (apt.district && apt.dong) {
    if (!apartmentsByDistrict[apt.district]) {
      apartmentsByDistrict[apt.district] = new Set();
    }
    apartmentsByDistrict[apt.district].add(apt.dong);
  }
});

console.log('='.repeat(80));
console.log('Checking for missing dongs in SEOUL_DISTRICTS configuration');
console.log('='.repeat(80));
console.log();

let totalMissing = 0;
const missingByDistrict: Record<string, Array<{ dong: string; count: number }>> = {};

SEOUL_DISTRICTS.forEach(district => {
  const districtName = district.name;
  const configuredDongs = new Set(district.dongs.map(d => d.name));
  const actualDongs = apartmentsByDistrict[districtName] || new Set();

  // Find dongs in database but not in config
  const missingDongs = [...actualDongs].filter(dong => !configuredDongs.has(dong));

  if (missingDongs.length > 0) {
    const missingInfo = missingDongs.sort().map(dong => ({
      dong,
      count: apartments.filter(apt => apt.district === districtName && apt.dong === dong).length
    }));

    missingByDistrict[districtName] = missingInfo;

    console.log(`📍 ${districtName}`);
    console.log(`   Configured dongs: ${configuredDongs.size}`);
    console.log(`   Dongs in apartment database: ${actualDongs.size}`);
    console.log(`   ❌ Missing dongs (${missingDongs.length}):`);
    missingInfo.forEach(({ dong, count }) => {
      console.log(`      - ${dong} (${count} apartments)`);
    });
    console.log();
    totalMissing += missingDongs.length;
  }
});

if (totalMissing === 0) {
  console.log('✅ No missing dongs found! All districts are complete.');
} else {
  console.log('='.repeat(80));
  console.log(`Total missing dongs: ${totalMissing}`);
  console.log('='.repeat(80));
  console.log();
  console.log('Summary of missing dongs:');
  Object.entries(missingByDistrict).forEach(([district, missing]) => {
    console.log(`${district}: ${missing.map(m => m.dong).join(', ')}`);
  });
}
