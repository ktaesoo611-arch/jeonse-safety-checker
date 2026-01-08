import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';
import DeleteAccountButton from '@/components/DeleteAccountButton';

export default async function ProfilePage() {
  const supabase = await createServerSupabaseClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Try to get analysis counts from new unified schema first
  let analysisCount = 0;
  let jeonseCount = 0;
  let wolseCount = 0;
  let paidCount = 0;

  // Try new unified schema
  const { count: newAnalysisCount, error: newCountError } = await supabase
    .from('analyses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  if (!newCountError && newAnalysisCount !== null) {
    analysisCount = newAnalysisCount;

    // Get jeonse count
    const { count: jc } = await supabase
      .from('analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'jeonse_safety');
    jeonseCount = jc || 0;

    // Get wolse count
    const { count: wc } = await supabase
      .from('analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'wolse_price');
    wolseCount = wc || 0;

    // Get completed/paid count
    const { count: pc } = await supabase
      .from('analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');
    paidCount = pc || 0;
  } else {
    // Fallback to old schema
    const { count: oldCount } = await supabase
      .from('analysis_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    analysisCount = oldCount || 0;
    jeonseCount = analysisCount;

    // Get paid analysis count from old schema
    const { count: oldPaidCount } = await supabase
      .from('analysis_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('payment_status', 'approved');
    paidCount = oldPaidCount || 0;

    // Check wolse_analyses table
    const { count: oldWolseCount } = await supabase
      .from('wolse_analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    wolseCount = oldWolseCount || 0;
    analysisCount = analysisCount + wolseCount;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3748]">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 right-[10%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[30%] left-[5%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/" className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A202C] mb-2">Profile</h1>
          <p className="text-[#4A5568]">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-amber-100/50 p-8 mb-6 border border-amber-100">
          <div className="flex items-center mb-6 pb-6 border-b border-amber-100">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mr-4 shadow-lg shadow-amber-200">
              {user.user_metadata?.full_name
                ? user.user_metadata.full_name.charAt(0).toUpperCase()
                : user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#1A202C]">
                {user.user_metadata?.full_name || 'User'}
              </h2>
              <p className="text-[#4A5568]">{user.email}</p>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-[#1A202C] mb-4">
                Account Information
              </h3>
              <div className="grid gap-4">
                <div className="flex justify-between items-center py-3 border-b border-amber-100">
                  <span className="text-[#4A5568]">Email</span>
                  <span className="font-medium text-[#1A202C]">{user.email}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-amber-100">
                  <span className="text-[#4A5568]">Full Name</span>
                  <span className="font-medium text-[#1A202C]">
                    {user.user_metadata?.full_name || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-amber-100">
                  <span className="text-[#4A5568]">Account Created</span>
                  <span className="font-medium text-[#1A202C]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-amber-100/50 p-8 mb-6 border border-amber-100">
          <h3 className="text-lg font-semibold text-[#1A202C] mb-4">
            Your Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-5 bg-amber-50/50 rounded-2xl border border-amber-100 hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-1 transition-all duration-300">
              <p className="text-3xl font-bold text-[#2D3748] mb-1">
                {analysisCount}
              </p>
              <p className="text-[#718096] text-sm">Total Analyses</p>
            </div>
            <div className="text-center p-5 bg-amber-50 rounded-2xl border border-amber-200 hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-1 transition-all duration-300">
              <p className="text-3xl font-bold text-amber-600 mb-1">
                {jeonseCount}
              </p>
              <p className="text-[#718096] text-sm">Jeonse</p>
            </div>
            <div className="text-center p-5 bg-orange-50 rounded-2xl border border-orange-200 hover:shadow-lg hover:shadow-orange-100/50 hover:-translate-y-1 transition-all duration-300">
              <p className="text-3xl font-bold text-orange-600 mb-1">
                {wolseCount}
              </p>
              <p className="text-[#718096] text-sm">Wolse Price</p>
            </div>
            <div className="text-center p-5 bg-green-50 rounded-2xl border border-green-200 hover:shadow-lg hover:shadow-green-100/50 hover:-translate-y-1 transition-all duration-300">
              <p className="text-3xl font-bold text-green-600 mb-1">
                {paidCount}
              </p>
              <p className="text-[#718096] text-sm">Completed</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-3xl shadow-xl shadow-amber-100/50 p-8 mb-6 border border-amber-100">
          <h3 className="text-lg font-semibold text-[#1A202C] mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/analyze"
              className="flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 rounded-2xl transition-all duration-300 group hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-1 border border-amber-100"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-200 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-[#1A202C] group-hover:text-amber-700 transition-colors">New Jeonse Safety Check</div>
                <div className="text-sm text-[#718096]">Analyze deposit safety</div>
              </div>
            </Link>
            <Link
              href="/analyze/wolse"
              className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-2xl transition-all duration-300 group hover:shadow-lg hover:shadow-orange-100/50 hover:-translate-y-1 border border-orange-100"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-200 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-[#1A202C] group-hover:text-orange-700 transition-colors">New Wolse Price Check</div>
                <div className="text-sm text-[#718096]">Verify monthly rent</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-white rounded-3xl shadow-xl shadow-amber-100/50 p-8 border border-amber-100">
          <h3 className="text-lg font-semibold text-[#1A202C] mb-4">Account</h3>
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full text-center bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-xl hover:shadow-amber-200/50 px-6 py-4 rounded-2xl transition-all font-semibold hover:-translate-y-1"
            >
              View My Analyses
            </Link>
            <Link
              href="/auth/forgot-password"
              className="block w-full text-center bg-amber-50 text-[#4A5568] hover:bg-amber-100 px-6 py-4 rounded-2xl transition-all font-semibold border border-amber-200"
            >
              Change Password
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-3xl shadow-xl shadow-red-100/30 p-8 border border-red-100">
          <h3 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h3>
          <p className="text-sm text-[#718096] mb-4">
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <DeleteAccountButton />
        </div>
      </div>
    </div>
  );
}
