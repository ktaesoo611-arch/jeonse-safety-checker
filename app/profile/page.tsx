import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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

  // Get user's analysis count
  const { count: analysisCount } = await supabase
    .from('analysis_results')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Get paid analysis count
  const { count: paidCount } = await supabase
    .from('analysis_results')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('payment_status', 'approved');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile</h1>
          <p className="text-gray-600">Manage your account information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center mb-6 pb-6 border-b border-gray-200">
            <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
              {user.user_metadata?.full_name
                ? user.user_metadata.full_name.charAt(0).toUpperCase()
                : user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {user.user_metadata?.full_name || 'User'}
              </h2>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Account Information
              </h3>
              <div className="grid gap-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Email</span>
                  <span className="font-medium text-gray-900">{user.email}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Full Name</span>
                  <span className="font-medium text-gray-900">
                    {user.user_metadata?.full_name || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Account Created</span>
                  <span className="font-medium text-gray-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Statistics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-emerald-50 rounded-xl">
              <p className="text-4xl font-bold text-emerald-600 mb-2">
                {analysisCount || 0}
              </p>
              <p className="text-gray-600">Total Analyses</p>
            </div>
            <div className="text-center p-6 bg-teal-50 rounded-xl">
              <p className="text-4xl font-bold text-teal-600 mb-2">
                {paidCount || 0}
              </p>
              <p className="text-gray-600">Completed</p>
            </div>
            <div className="text-center p-6 bg-emerald-100 rounded-xl">
              <p className="text-4xl font-bold text-emerald-700 mb-2">
                ₩{((paidCount || 0) * 14900).toLocaleString()}
              </p>
              <p className="text-gray-600">Total Spent</p>
            </div>
          </div>
        </div>

        {/* Actions Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
          <div className="space-y-3">
            <a
              href="/auth/forgot-password"
              className="block w-full text-center bg-gray-100 text-gray-700 hover:bg-gray-200 px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              Change Password
            </a>
            <a
              href="/dashboard"
              className="block w-full text-center bg-emerald-600 text-white hover:bg-emerald-700 px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              View My Analyses
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
