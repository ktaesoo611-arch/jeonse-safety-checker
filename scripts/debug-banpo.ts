/**
 * Debug 반포자이 document - fetch analysis data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bnrhlzgbyhmphklnglcw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJucmhsemdieWhtcGhrbG5nbGN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0ODM3NDMsImV4cCI6MjA0NzA1OTc0M30.eP4S9QqWWSCjqnPT6WPhAH8RY1aAH9WIDjL2PHkmxAU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugBanpo() {
  console.log('Fetching 반포자이 analysis data...\n');

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('id', '8dd2348f-3218-4937-99d0-7a72a120be7b')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!data) {
    console.log('No data found');
    return;
  }

  console.log('Property Address:', data.property_address);
  console.log('Building Name:', data.building_name);
  console.log('Created At:', data.created_at);
  console.log('');

  // Parse the deunggibu data
  const deunggibu = data.deunggibu_data;

  console.log('=== Mortgages ===');
  console.log(`Found ${deunggibu?.mortgages?.length || 0} mortgages:`);
  if (deunggibu?.mortgages) {
    deunggibu.mortgages.forEach((m: any, i: number) => {
      console.log(`  ${i + 1}. Priority #${m.priority || m.priorityNumber}: ₩${parseInt(m.amount).toLocaleString('ko-KR')}`);
      console.log(`     Date: ${m.registrationDate}`);
      console.log(`     Creditor: ${m.creditor}`);
      console.log('');
    });
  }

  console.log('=== Jeonse/Lease Rights ===');
  console.log(`Found ${deunggibu?.jeonseRights?.length || 0} jeonse/lease rights:`);
  if (deunggibu?.jeonseRights) {
    deunggibu.jeonseRights.forEach((j: any, i: number) => {
      console.log(`  ${i + 1}. Priority #${j.priority || j.priorityNumber}: ₩${parseInt(j.amount).toLocaleString('ko-KR')}`);
      console.log(`     Type: ${j.type}`);
      console.log(`     Date: ${j.registrationDate}`);
      console.log('');
    });
  }

  console.log('=== Risk Analysis ===');
  const risks = data.risk_analysis?.risks || [];
  console.log(`Found ${risks.length} risks:`);
  risks.forEach((r: any) => {
    console.log(`  - [${r.severity}] ${r.title}`);
    console.log(`    ${r.description}`);
  });
}

debugBanpo().catch(console.error);
