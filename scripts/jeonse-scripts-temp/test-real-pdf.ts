/**
 * Test parser with real PDF
 */

import { promises as fs } from 'fs';
import { DeunggibuParser } from '../lib/analyzers/deunggibu-parser';

const pdf = require('pdf-parse');

async function testRealPDF() {
  console.log('Testing with real PDF: 청계한신휴플러스 108동 2003호\n');

  const pdfPath = 'test/registry_report/청계한신휴플러스 108동 2003호_registry.pdf';

  try {
    // Read PDF
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfData = await pdf(dataBuffer);

    console.log('PDF extracted, text length:', pdfData.text.length);
    console.log('\nFirst 1000 characters:');
    console.log(pdfData.text.substring(0, 1000));
    console.log('\n====================\n');

    // Parse with deunggibu parser
    const parser = new DeunggibuParser();
    const result = parser.parse(pdfData.text);

    // Display results
    console.log('\n\n✅ PARSING RESULTS:\n');
    console.log('═══════════════════════════════════════\n');

    console.log('🏢 Property:', result.address);
    console.log('📏 Area:', result.area, 'm²');
    console.log('🏢 Building:', result.buildingName || 'N/A');
    console.log();

    console.log('🏦 MORTGAGES FOUND:', result.mortgages.length);
    result.mortgages.forEach((m, i) => {
      console.log(`\n${i + 1}. Priority ${m.priority}`);
      console.log(`   Creditor: ${m.creditor}`);
      console.log(`   Max Secured: ₩${m.maxSecuredAmount.toLocaleString()}`);
      console.log(`   Est. Principal: ₩${m.estimatedPrincipal.toLocaleString()}`);
      console.log(`   Date: ${m.registrationDate}`);
    });

    console.log(`\n💰 Total Mortgage Amount: ₩${result.totalMortgageAmount.toLocaleString()}`);
    console.log(`💸 Total Est. Principal: ₩${result.totalEstimatedPrincipal.toLocaleString()}`);
    console.log();

    console.log('⚠️  LIENS FOUND:', result.liens.length);
    result.liens.forEach((lien, i) => {
      console.log(`\n${i + 1}. ${lien.type}`);
      console.log(`   Creditor: ${lien.creditor}`);
      if (lien.amount) {
        console.log(`   Amount: ₩${lien.amount.toLocaleString()}`);
      }
      console.log(`   Date: ${lien.registrationDate}`);
    });
    console.log();

    console.log('🏠 JEONSE/LEASE RIGHTS FOUND:', result.jeonseRights.length);
    result.jeonseRights.forEach((j, i) => {
      console.log(`\n${i + 1}. ${j.type || '전세권/임차권'}`);
      console.log(`   Tenant: ${j.tenant}`);
      console.log(`   Amount: ₩${j.amount.toLocaleString()}`);
      if (j.registrationDate) {
        console.log(`   Date: ${j.registrationDate}`);
      }
    });
    console.log();

    console.log('🚨 LEGAL FLAGS:');
    console.log(`   Seizure (압류): ${result.hasSeizure ? '❌ YES' : '✅ NO'}`);
    console.log(`   Provisional Seizure (가압류): ${result.hasProvisionalSeizure ? '⚠️  YES' : '✅ NO'}`);
    console.log(`   Auction (경매): ${result.hasAuction ? '❌ YES' : '✅ NO'}`);
    console.log(`   Provisional Disposition (가처분): ${result.hasProvisionalDisposition ? '⚠️  YES' : '✅ NO'}`);
    console.log();

    console.log('═══════════════════════════════════════\n');

  } catch (error: any) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testRealPDF();
