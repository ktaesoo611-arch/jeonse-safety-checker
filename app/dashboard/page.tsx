import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Fetch user's analyses with property information
  const { data: analyses, error: analysesError } = await supabase
    .from('analysis_results')
    .select(`
      id,
      proposed_jeonse,
      safety_score,
      risk_level,
      status,
      payment_status,
      created_at,
      completed_at,
      properties (
        address,
        city,
        district,
        dong,
        building_name
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (analysesError) {
    console.error('Error fetching analyses:', analysesError);
  }

  const analysesWithProperties = analyses || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Analyses</h1>
          <p className="text-gray-600">
            View and manage your jeonse safety analysis history
          </p>
        </div>

        {/* New Analysis Button */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
          >
            + New Analysis
          </Link>
        </div>

        {/* Analyses List */}
        {analysesWithProperties.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Analyses Yet
            </h2>
            <p className="text-gray-600 mb-6">
              Start your first jeonse safety analysis to see results here
            </p>
            <Link
              href="/"
              className="inline-block bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
            >
              Start New Analysis
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {analysesWithProperties.map((analysis: any) => {
              const property = analysis.properties;
              const statusColors = {
                pending: 'bg-yellow-100 text-yellow-800',
                processing: 'bg-blue-100 text-blue-800',
                completed: 'bg-green-100 text-green-800',
                failed: 'bg-red-100 text-red-800',
              };

              const riskColors = {
                low: 'text-green-600',
                medium: 'text-yellow-600',
                high: 'text-red-600',
              };

              return (
                <div
                  key={analysis.id}
                  className="bg-white rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {property?.building_name || 'Property Analysis'}
                      </h3>
                      <p className="text-gray-600">
                        {property?.address || `${property?.city} ${property?.district} ${property?.dong}`}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        statusColors[analysis.status as keyof typeof statusColors]
                      }`}
                    >
                      {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Proposed Jeonse</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ₩{analysis.proposed_jeonse?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                    {analysis.safety_score !== null && (
                      <div>
                        <p className="text-sm text-gray-500">Safety Score</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {analysis.safety_score}/100
                        </p>
                      </div>
                    )}
                    {analysis.risk_level && (
                      <div>
                        <p className="text-sm text-gray-500">Risk Level</p>
                        <p
                          className={`text-lg font-semibold ${
                            riskColors[analysis.risk_level as keyof typeof riskColors]
                          }`}
                        >
                          {analysis.risk_level.charAt(0).toUpperCase() + analysis.risk_level.slice(1)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Payment</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {analysis.payment_status === 'approved'
                          ? '✓ Paid'
                          : analysis.payment_status === 'pending'
                          ? 'Pending'
                          : 'Not Paid'}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      Created: {new Date(analysis.created_at).toLocaleDateString()}
                      {analysis.completed_at &&
                        ` • Completed: ${new Date(analysis.completed_at).toLocaleDateString()}`}
                    </p>
                    <div className="flex space-x-2">
                      {analysis.status === 'pending' && !analysis.payment_status && (
                        <Link
                          href={`/analyze/${analysis.id}/payment`}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                        >
                          Pay Now
                        </Link>
                      )}
                      {analysis.status === 'completed' && (
                        <Link
                          href={`/analyze/${analysis.id}`}
                          className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors text-sm font-semibold"
                        >
                          View Report
                        </Link>
                      )}
                      {analysis.status === 'processing' && (
                        <button
                          disabled
                          className="bg-gray-300 text-gray-600 px-4 py-2 rounded-lg cursor-not-allowed text-sm font-semibold"
                        >
                          Processing...
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
