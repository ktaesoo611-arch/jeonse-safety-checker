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

  // Try to fetch from new unified dashboard view first
  const { data: unifiedAnalyses, error: unifiedError } = await supabase
    .from('user_analyses_dashboard')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // If unified view doesn't work, fall back to old schema
  let analysesWithProperties: any[] = [];

  if (!unifiedError && unifiedAnalyses && unifiedAnalyses.length > 0) {
    // Map unified view to common format
    analysesWithProperties = unifiedAnalyses.map((a: any) => ({
      id: a.id,
      type: a.type,
      proposed_jeonse: a.deposit_amount,
      safety_score: a.safety_score,
      risk_level: a.risk_level,
      price_assessment: a.price_assessment,
      status: a.status,
      payment_status: a.payment_status,
      created_at: a.created_at,
      completed_at: a.completed_at,
      properties: {
        address: a.address,
        building_name: a.building_name,
        exclusive_area: a.exclusive_area
      }
    }));
  } else {
    // Fallback: Fetch from old analysis_results table
    const { data: oldAnalyses, error: oldError } = await supabase
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

    if (!oldError && oldAnalyses) {
      analysesWithProperties = oldAnalyses.map((a: any) => ({
        ...a,
        type: 'jeonse_safety' // Old records are jeonse safety
      }));
    }

    // Also try to fetch wolse analyses from old table
    const { data: wolseAnalyses } = await supabase
      .from('wolse_analyses')
      .select(`
        id,
        user_deposit,
        assessment,
        created_at,
        expires_at,
        properties (
          address,
          building_name,
          exclusive_area
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (wolseAnalyses && wolseAnalyses.length > 0) {
      const wolseMapped = wolseAnalyses.map((w: any) => ({
        id: w.id,
        type: 'wolse_price',
        proposed_jeonse: w.user_deposit,
        price_assessment: w.assessment,
        status: 'completed',
        created_at: w.created_at,
        completed_at: w.created_at,
        properties: w.properties
      }));
      analysesWithProperties = [...analysesWithProperties, ...wolseMapped].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3748]">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute top-[40%] right-[5%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] left-[20%] w-56 h-56 bg-yellow-200/15 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
          <h1 className="text-3xl font-bold text-[#1A202C] mb-2">My Analyses</h1>
          <p className="text-[#4A5568]">
            View and manage your rental analysis history
          </p>
        </div>

        {/* New Analysis Buttons */}
        <div className="mb-8 flex flex-wrap gap-4">
          <Link
            href="/analyze/jeonse"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all font-semibold hover:-translate-y-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Jeonse Check</span>
          </Link>
          <Link
            href="/analyze/wolse"
            className="inline-flex items-center gap-3 bg-gradient-to-r from-orange-400 to-amber-600 text-white px-6 py-3 rounded-2xl hover:shadow-xl hover:shadow-orange-200/50 transition-all font-semibold hover:-translate-y-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>New Wolse Check</span>
          </Link>
        </div>

        {/* Analyses List */}
        {analysesWithProperties.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-xl shadow-amber-100/50 p-12 text-center border border-amber-100">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-[#1A202C] mb-2">
              No Analyses Yet
            </h2>
            <p className="text-[#4A5568] mb-8 max-w-md mx-auto">
              Start your first rental analysis to see results here. We'll help you make a safe decision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/analyze/jeonse"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all font-semibold hover:-translate-y-1"
              >
                <span>Jeonse Check</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/analyze/wolse"
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-400 to-amber-600 text-white px-6 py-4 rounded-2xl hover:shadow-xl hover:shadow-orange-200/50 transition-all font-semibold hover:-translate-y-1"
              >
                <span>Wolse Check</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {analysesWithProperties.map((analysis: any) => {
              const property = analysis.properties;
              const isWolse = analysis.type === 'wolse_price';
              const isJeonse = analysis.type === 'jeonse_safety' || !analysis.type;

              const statusColors = {
                pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                processing: 'bg-blue-100 text-blue-800 border-blue-200',
                completed: 'bg-green-100 text-green-800 border-green-200',
                failed: 'bg-red-100 text-red-800 border-red-200',
              };

              const riskColors: Record<string, string> = {
                SAFE: 'text-green-600',
                MODERATE: 'text-yellow-600',
                HIGH: 'text-orange-600',
                CRITICAL: 'text-red-600',
                low: 'text-green-600',
                medium: 'text-yellow-600',
                high: 'text-red-600',
              };

              const assessmentColors: Record<string, string> = {
                GOOD_DEAL: 'text-green-600 bg-green-50 border-green-200',
                FAIR: 'text-amber-600 bg-amber-50 border-amber-200',
                OVERPRICED: 'text-orange-600 bg-orange-50 border-orange-200',
                SEVERELY_OVERPRICED: 'text-red-600 bg-red-50 border-red-200',
              };

              return (
                <div
                  key={analysis.id}
                  className={`bg-white rounded-3xl shadow-xl shadow-amber-100/50 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-l-4 border border-amber-100 ${
                    isWolse ? 'border-l-orange-500' : 'border-l-amber-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          isWolse ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isWolse ? 'Wolse Price' : 'Jeonse Safety'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-[#1A202C] mb-1">
                        {property?.building_name || 'Property Analysis'}
                      </h3>
                      <p className="text-[#718096] text-sm">
                        {property?.address || `${property?.city} ${property?.district} ${property?.dong}`}
                        {property?.exclusive_area && ` • ${property.exclusive_area}㎡`}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                        statusColors[analysis.status as keyof typeof statusColors]
                      }`}
                    >
                      {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                      <p className="text-sm text-[#718096]">{isWolse ? 'Deposit' : 'Proposed Jeonse'}</p>
                      <p className="text-lg font-semibold text-[#1A202C]">
                        ₩{analysis.proposed_jeonse?.toLocaleString() || 'N/A'}
                      </p>
                    </div>

                    {/* Jeonse-specific fields */}
                    {isJeonse && analysis.safety_score !== null && (
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                        <p className="text-sm text-[#718096]">Safety Score</p>
                        <p className="text-lg font-semibold text-[#1A202C]">
                          {analysis.safety_score}/100
                        </p>
                      </div>
                    )}
                    {isJeonse && analysis.risk_level && (
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                        <p className="text-sm text-[#718096]">Risk Level</p>
                        <p className={`text-lg font-semibold ${riskColors[analysis.risk_level] || 'text-[#4A5568]'}`}>
                          {analysis.risk_level}
                        </p>
                      </div>
                    )}

                    {/* Wolse-specific fields */}
                    {isWolse && analysis.price_assessment && (
                      <div className="p-3 bg-orange-50/50 rounded-xl border border-orange-100">
                        <p className="text-sm text-[#718096]">Assessment</p>
                        <p className={`text-lg font-semibold ${
                          assessmentColors[analysis.price_assessment]?.split(' ')[0] || 'text-[#4A5568]'
                        }`}>
                          {analysis.price_assessment.replace('_', ' ')}
                        </p>
                      </div>
                    )}

                    {isJeonse && (
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                        <p className="text-sm text-[#718096]">Payment</p>
                        <p className="text-lg font-semibold text-[#1A202C]">
                          {analysis.payment_status === 'approved'
                            ? '✓ Paid'
                            : analysis.payment_status === 'pending'
                            ? 'Pending'
                            : 'Free (Beta)'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-amber-100">
                    <p className="text-sm text-[#718096]">
                      Created: {new Date(analysis.created_at).toLocaleDateString()}
                      {analysis.completed_at &&
                        ` • Completed: ${new Date(analysis.completed_at).toLocaleDateString()}`}
                    </p>
                    <div className="flex space-x-2">
                      {isJeonse && analysis.status === 'pending' && !analysis.payment_status && (
                        <Link
                          href={`/analyze/${analysis.id}/payment`}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-amber-200/50 transition-all text-sm font-semibold hover:-translate-y-0.5"
                        >
                          Pay Now
                        </Link>
                      )}
                      {isJeonse && analysis.status === 'completed' && (
                        <Link
                          href={`/analyze/${analysis.id}`}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-amber-200/50 transition-all text-sm font-semibold hover:-translate-y-0.5"
                        >
                          View Report
                        </Link>
                      )}
                      {isWolse && analysis.status === 'completed' && (
                        <Link
                          href={`/analyze/wolse?id=${analysis.id}`}
                          className="bg-gradient-to-r from-orange-400 to-amber-600 text-white px-4 py-2 rounded-xl hover:shadow-lg hover:shadow-orange-200/50 transition-all text-sm font-semibold hover:-translate-y-0.5"
                        >
                          View Results
                        </Link>
                      )}
                      {analysis.status === 'processing' && (
                        <button
                          disabled
                          className="bg-amber-100 text-amber-600 px-4 py-2 rounded-xl cursor-not-allowed text-sm font-semibold border border-amber-200"
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
