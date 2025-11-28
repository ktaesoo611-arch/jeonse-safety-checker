import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkLatest() {
  const { data: analyses } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('building_name', '반포자이')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!analyses || analyses.length === 0) {
    console.log('No analysis found');
    return;
  }

  const latest = analyses[0];
  console.log('Latest Analysis ID:', latest.id);
  console.log('Created:', latest.created_at);
  console.log('Status:', latest.status);
  console.log('\nDebt Ranking:');

  const debtRanking = latest.deunggibu_data?.debtRanking || [];
  debtRanking.forEach((d: any) => {
    console.log(`  - ${d.type}: ₩${(d.amount / 100000000).toFixed(2)}억 (${d.registrationDate})`);
  });

  console.log('\nMortgages:', latest.deunggibu_data?.deunggibu?.mortgages?.length || 0);
  console.log('Jeonse:', latest.deunggibu_data?.deunggibu?.jeonseRights?.length || 0);

  if (latest.deunggibu_data?.deunggibu?.mortgages) {
    console.log('\nMortgage Details:');
    latest.deunggibu_data.deunggibu.mortgages.forEach((m: any, i: number) => {
      console.log(`  ${i + 1}. #${m.priorityNumber}: ₩${parseInt(m.maxAmount).toLocaleString('ko-KR')} (${m.registrationDate})`);
    });
  }

  if (latest.deunggibu_data?.deunggibu?.jeonseRights) {
    console.log('\nJeonse Details:');
    latest.deunggibu_data.deunggibu.jeonseRights.forEach((j: any, i: number) => {
      console.log(`  ${i + 1}. #${j.priorityNumber}: ₩${parseInt(j.amount).toLocaleString('ko-KR')} (${j.registrationDate})`);
    });
  }
}

checkLatest();
