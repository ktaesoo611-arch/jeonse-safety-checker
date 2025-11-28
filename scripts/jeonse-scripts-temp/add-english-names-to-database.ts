/**
 * Add English names to existing apartment database
 * This is faster than rebuilding the entire database from MOLIT API
 */

import { generateApartmentEnglishName } from '../lib/utils/korean-transliteration';
import * as fs from 'fs';
import * as path from 'path';

const dbPath = path.join(process.cwd(), 'scripts', 'apartment-database.json');

console.log('🔧 Adding English names to apartment database\n');
console.log('='.repeat(80));

// Read existing database
if (!fs.existsSync(dbPath)) {
  console.error('❌ Database file not found:', dbPath);
  process.exit(1);
}

const database = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

console.log(`📖 Loaded database with ${database.totalApartments} apartments`);
console.log(`📅 Generated: ${database.generatedAt}\n`);

// Add English names
let updated = 0;
for (const apt of database.apartments) {
  if (!apt.nameEn) {
    apt.nameEn = generateApartmentEnglishName(apt.name);
    updated++;
  }
}

console.log(`✅ Added English names to ${updated} apartments`);

// Show some examples
console.log('\n📝 Sample translations:\n');
const samples = database.apartments.slice(0, 20);
samples.forEach((apt: any) => {
  console.log(`   ${apt.name.padEnd(30)} → ${apt.nameEn}`);
});

// Save updated database
fs.writeFileSync(dbPath, JSON.stringify(database, null, 2), 'utf-8');

console.log(`\n💾 Saved updated database to ${dbPath}`);
console.log('='.repeat(80));
console.log('\n✅ Done! All apartments now have English names.');
