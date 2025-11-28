import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ncqchpvhvoqeeydtmhut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jcWNocHZodm9xZWV5ZHRtaHV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2OTEzOTIsImV4cCI6MjA3ODI2NzM5Mn0.MZaXYLb8OTtrRc9rh3gHTGbylIMa5JVsscTLxlxXyfQ'
);

async function findRecentAnalyses() {
  const { data, error } = await supabase
    .from('analysis_results')
    .select('id, created_at, deunggibu_data')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Recent analyses:\n');
  data.forEach(a => {
    const building = a.deunggibu_data?.deunggibu?.buildingName;
    const address = a.deunggibu_data?.deunggibu?.address;
    console.log(`${a.id}`);
    console.log(`  Created: ${a.created_at}`);
    console.log(`  Building: ${building || 'N/A'}`);
    if (address) console.log(`  Address: ${address}`);
    console.log('');
  });
}

findRecentAnalyses();
