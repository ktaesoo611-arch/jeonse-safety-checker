import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function AnalyzePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect(`/auth/login?redirectTo=/analyze/${id}`);
  }

  // Get analysis details
  const { data: analysis, error: analysisError } = await supabase
    .from('analysis_results')
    .select('*')
    .eq('id', id)
    .single();

  if (analysisError || !analysis) {
    redirect('/dashboard');
  }

  // Verify the analysis belongs to the user
  if (analysis.user_id !== user.id) {
    redirect('/dashboard');
  }

  // Redirect based on analysis status and payment status
  if (analysis.status === 'completed') {
    redirect(`/analyze/${id}/report`);
  } else if (analysis.status === 'processing') {
    redirect(`/analyze/${id}/processing`);
  } else if (analysis.payment_status === 'approved') {
    redirect(`/analyze/${id}/upload`);
  } else {
    // Payment not yet completed
    redirect(`/analyze/${id}/payment`);
  }
}
