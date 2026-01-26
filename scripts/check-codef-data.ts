import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function main() {
  // Get latest analysis with documents
  const { data } = await client
    .from('uploaded_documents')
    .select('id, analysis_id, document_type, parsed_data, ocr_text')
    .eq('document_type', 'deunggibu-codef')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (data) {
    console.log('Document ID:', data.id);
    console.log('Analysis ID:', data.analysis_id);

    const parsed = data.parsed_data;
    console.log('\n--- Parsed Data Summary ---');
    console.log('Address:', parsed?.address);
    console.log('Building Name:', parsed?.buildingName);
    console.log('Unit Number:', parsed?.unitNumber);
    console.log('Area:', parsed?.area);
    console.log('Total Mortgage:', parsed?.totalMortgageAmount);
    console.log('Active Mortgages:', parsed?.activeMortgages?.length);

    if (parsed?.mortgages?.length > 0) {
      console.log('\n--- Mortgages ---');
      parsed.mortgages.forEach((m: any, i: number) => {
        console.log(`  ${i + 1}. ${m.type} - Amount: ${m.maxAmount} (${typeof m.maxAmount}), Date: ${m.registrationDate}`);
      });
    }

    // Show raw CODEF response structure
    const raw = parsed?.rawCodefResponse;
    console.log('\n--- Raw Response Structure ---');
    console.log('Has rawCodefResponse:', !!raw);
    if (raw) {
      console.log('Keys:', Object.keys(raw));
    }

    // Try different paths for the entry list
    const entries = raw?.resRegisterEntriesList || raw?.data?.resRegisterEntriesList;
    console.log('Entry count:', entries?.length);

    if (entries?.[0]) {
      const entry = entries[0];
      console.log('\n--- Property Info from Raw ---');
      console.log('resRealty:', entry.resRealty);
      console.log('Entry keys:', Object.keys(entry));

      const registrationHisList = entry.resRegistrationHisList || [];
      console.log('registrationHisList count:', registrationHisList.length);
      console.log('Section types:', registrationHisList.map((s: any) => s.resType));

      const eulgu = registrationHisList.find((s: any) => s.resType === '을구');

      if (eulgu?.resContentsList?.length > 0) {
        console.log('\n--- 을구 (Mortgages) Raw Data ---');
        for (let i = 0; i < Math.min(3, eulgu.resContentsList.length); i++) {
          const row = eulgu.resContentsList[i];
          console.log(`\nRow ${i + 1}:`);
          console.log('  resNumber:', row.resNumber);
          console.log('  resType2:', row.resType2);
          if (row.resDetailList) {
            row.resDetailList.forEach((detail: any) => {
              console.log(`  [${detail.resNumber}]: ${detail.resContents}`);
            });
          }
        }
      }

      // Check ALL 표제부 sections for building/unit info (there are 4 표제부 sections)
      const pyojebuSections = registrationHisList.filter((s: any) => s.resType === '표제부');
      console.log('\n--- All 표제부 (Property Details) Sections ---');
      console.log('Number of 표제부 sections:', pyojebuSections.length);

      for (let sectionIdx = 0; sectionIdx < pyojebuSections.length; sectionIdx++) {
        const pyojebu = pyojebuSections[sectionIdx];
        console.log(`\n--- 표제부 Section ${sectionIdx + 1} (resType1: ${pyojebu.resType1}) ---`);

        if (pyojebu?.resContentsList?.length > 0) {
          for (let rowIdx = 0; rowIdx < Math.min(3, pyojebu.resContentsList.length); rowIdx++) {
            const row = pyojebu.resContentsList[rowIdx];
            console.log(`\nRow ${rowIdx + 1} (resType2: ${row.resType2}):`);
            if (row.resDetailList) {
              row.resDetailList.forEach((detail: any) => {
                console.log(`  [${detail.resNumber}]: ${detail.resContents?.substring(0, 250)}`);
              });
            }
          }
        }
      }
    } else {
      // Show what raw actually contains
      console.log('\n--- Raw content sample ---');
      console.log(JSON.stringify(raw, null, 2).substring(0, 2000));
    }
  } else {
    console.log('No CODEF documents found');
  }
}

main().catch(console.error);
