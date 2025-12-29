'use client';

import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3748] selection:bg-amber-200 selection:text-amber-900">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 left-[10%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute top-[40%] right-[5%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] left-[20%] w-56 h-56 bg-yellow-200/15 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        {/* Animated gradient line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400" style={{ backgroundSize: '200% 100%', animation: 'gradient-x 3s ease infinite' }} />

        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl blur-md opacity-50 group-hover:opacity-80 transition-opacity" />
              <div className="relative w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 group-hover:rotate-3 transition-all">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 bg-clip-text text-transparent">K-Rent Safety</span>
              <span className="text-[10px] text-amber-600/60 font-medium tracking-wider uppercase hidden sm:block">Trusted Rental Analysis</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {/* Service Links */}
            <Link href="/analyze" className="group relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <span className="relative text-[#4A5568] group-hover:text-white flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Deposit Safety
              </span>
            </Link>

            <Link href="/analyze/wolse" className="group relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <span className="relative text-[#4A5568] group-hover:text-white flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Wolse Price
              </span>
            </Link>

            <Link href="/analyze/full" className="group relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <span className="relative text-[#4A5568] group-hover:text-white flex items-center gap-2 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Full Check
                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded group-hover:bg-white/20 group-hover:text-white transition-colors">BEST</span>
              </span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="relative z-10 pt-32 pb-24">
        <div className="max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="text-amber-600 text-sm font-semibold tracking-wider uppercase">PRICING</span>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold text-[#1A202C] tracking-tight" style={{ letterSpacing: '-0.03em' }}>
              Transparent Pricing
            </h1>
            <p className="mt-6 text-xl text-[#4A5568] max-w-2xl mx-auto">
              Professional rental analysis services at affordable prices.
              <br />
              Currently FREE during beta period.
            </p>
          </div>

          {/* Beta Announcement */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-8 mb-12 text-center shadow-xl shadow-amber-200/30">
            <div className="text-white">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold mb-3">Beta Launch Special</h2>
              <p className="text-xl text-amber-50 mb-4">
                All services are completely FREE during our beta testing period!
              </p>
              <p className="text-amber-100 text-sm">
                베타 테스트 기간 동안 모든 서비스를 무료로 이용하실 수 있습니다.
              </p>
            </div>
          </div>

          {/* Service Categories */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A202C] text-center mb-2">Our Services</h2>
            <p className="text-[#4A5568] text-center">Three powerful tools to protect your rental investment</p>
          </div>

          {/* Product/Service Offerings */}
          <div className="grid md:grid-cols-3 gap-6 mb-16 mt-4">
            {/* Deposit Safety Check */}
            <div className="bg-white rounded-3xl border-2 border-amber-200 shadow-xl shadow-amber-100/50 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">Deposit Safety Check</h3>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                    FREE BETA
                  </span>
                </div>
                <p className="text-amber-50 mb-4">Comprehensive deposit safety analysis</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">₩0</span>
                  <span className="text-amber-100 line-through">₩14,900</span>
                </div>
              </div>

              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <FeatureItem text="English translation of property register" />
                  <FeatureItem text="20+ comprehensive risk checks" />
                  <FeatureItem text="AI-powered property valuation" />
                  <FeatureItem text="Safety score (0-100)" />
                  <FeatureItem text="Detailed PDF report" />
                  <FeatureItem text="Legal risk analysis" />
                  <FeatureItem text="Actionable recommendations" />
                  <FeatureItem text="2-minute analysis time" />
                </ul>

                <Link href="/analyze">
                  <button className="w-full px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all group-hover:-translate-y-1 flex items-center justify-center gap-2">
                    Start Deposit Analysis
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>

            {/* Wolse Price Check */}
            <div className="bg-white rounded-3xl border-2 border-amber-200 shadow-xl shadow-amber-100/50 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
              <div className="bg-gradient-to-br from-orange-400 to-amber-600 p-6 text-white">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">Wolse Price Check</h3>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                    FREE BETA
                  </span>
                </div>
                <p className="text-orange-50 mb-4">Verify if your monthly rent is fair</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">₩0</span>
                  <span className="text-orange-100 line-through">₩9,900</span>
                </div>
              </div>

              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <FeatureItem text="Market rate analysis from MOLIT data" />
                  <FeatureItem text="Legal rate compliance check" />
                  <FeatureItem text="Fair price assessment" />
                  <FeatureItem text="Savings calculation" />
                  <FeatureItem text="Ready-to-use negotiation scripts" />
                  <FeatureItem text="Instant results" />
                  <FeatureItem text="No document upload needed" />
                  <FeatureItem text="Unlimited checks during beta" />
                </ul>

                <Link href="/analyze/wolse">
                  <button className="w-full px-6 py-4 bg-gradient-to-r from-orange-400 to-amber-600 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all group-hover:-translate-y-1 flex items-center justify-center gap-2">
                    Start Wolse Price Analysis
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>

            {/* Full Wolse Check - Best Value */}
            <div className="bg-white rounded-3xl border-2 border-green-400 shadow-xl shadow-green-100/50 overflow-visible hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative">
              {/* Best Value Badge */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                <span className="px-4 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg">
                  Best Value
                </span>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white rounded-t-3xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-bold">Full Wolse Check</h3>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">
                    FREE BETA
                  </span>
                </div>
                <p className="text-green-50 mb-4">Complete protection for wolse renters</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">₩0</span>
                  <span className="text-green-100 line-through">₩19,900</span>
                </div>
              </div>

              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  <FeatureItem text="Everything in Deposit Safety Check" />
                  <FeatureItem text="Everything in Wolse Price Check" />
                  <FeatureItem text="Combined comprehensive report" />
                  <FeatureItem text="Deposit + rent analysis together" />
                  <FeatureItem text="One document upload" />
                  <FeatureItem text="Save ₩4,900 vs separate services" />
                  <FeatureItem text="Best for wolse with large deposit" />
                  <FeatureItem text="Complete peace of mind" />
                </ul>

                <Link href="/analyze/full">
                  <button className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-green-200/50 transition-all group-hover:-translate-y-1 flex items-center justify-center gap-2">
                    Start Full Wolse Check
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* What's Included Section */}
          <div className="bg-white rounded-3xl p-8 md:p-12 mb-16 border border-amber-100">
            <h2 className="text-3xl font-bold text-[#1A202C] mb-8 text-center">
              What's Included in Every Report
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <IncludedItem
                icon="🌐"
                title="English Translation"
                description="Complete translation of Korean property register into clear English"
              />
              <IncludedItem
                icon="💰"
                title="Property Valuation"
                description="Market price analysis based on Ministry of Land transaction data"
              />
              <IncludedItem
                icon="⚖️"
                title="Legal Risk Check"
                description="Automated verification of mortgages, seizures, and legal issues"
              />
              <IncludedItem
                icon="📊"
                title="Safety Score"
                description="0-100 point safety rating based on comprehensive analysis"
              />
              <IncludedItem
                icon="🔍"
                title="Risk Breakdown"
                description="Detailed analysis of 20+ potential risk factors"
              />
              <IncludedItem
                icon="📄"
                title="PDF Report"
                description="Professional downloadable report you can share and keep"
              />
              <IncludedItem
                icon="✅"
                title="Action Checklist"
                description="Step-by-step guidance on what to do before signing"
              />
              <IncludedItem
                icon="⚡"
                title="Instant Delivery"
                description="Receive your report within 2-5 minutes of payment"
              />
              <IncludedItem
                icon="🔒"
                title="Secure & Private"
                description="Your data is encrypted and never shared with third parties"
              />
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-[#1A202C] mb-8 text-center">
              Frequently Asked Questions
            </h2>

            <div className="space-y-4 max-w-3xl mx-auto">
              <FAQItem
                question="How long is the beta period?"
                answer="The beta period will continue until we've tested the service thoroughly with real users. We'll announce the end date at least 2 weeks in advance. All users who sign up during beta will receive special early-adopter benefits."
              />
              <FAQItem
                question="What payment methods do you accept?"
                answer="We accept all major credit cards (Visa, MasterCard, AMEX), Korean bank transfers, virtual accounts, and simple payment methods (Toss, Naver Pay, Kakao Pay) through Toss Payments."
              />
              <FAQItem
                question="Can I get a refund?"
                answer="Yes, refunds are available before you download the report, or if there was a technical error. Once you've downloaded the PDF report, refunds are not available as it's a digital product. See our full refund policy for details."
              />
              <FAQItem
                question="How accurate is the analysis?"
                answer="Our analysis is based on official government data from Ministry of Land (MOLIT) and automated risk assessment algorithms. However, this is for informational purposes and does not replace professional legal or real estate consultation."
              />
              <FAQItem
                question="What areas do you cover?"
                answer="Currently we support Seoul apartments during beta. We're working to expand to Gyeonggi Province, Incheon, and other property types (villa, officetel, multi-family) soon."
              />
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full mb-8">
                <span className="text-white/90 text-sm font-medium">🎉 Free during beta</span>
              </div>

              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to protect your rental investment?
              </h2>
              <p className="text-xl text-amber-50 mb-10 max-w-2xl mx-auto">
                Join hundreds of expats who have safely navigated the Korean rental market.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                <Link href="/analyze/full">
                  <button className="px-10 py-5 bg-white text-green-600 font-bold text-lg rounded-2xl hover:shadow-2xl transition-all hover:-translate-y-1 flex items-center gap-3">
                    Full Wolse Check
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
                <Link href="/analyze">
                  <button className="px-10 py-5 bg-white/20 text-white font-bold text-lg rounded-2xl hover:bg-white/30 transition-all hover:-translate-y-1 flex items-center gap-3 border border-white/30">
                    Deposit Safety
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
                <Link href="/analyze/wolse">
                  <button className="px-10 py-5 bg-white/20 text-white font-bold text-lg rounded-2xl hover:bg-white/30 transition-all hover:-translate-y-1 flex items-center gap-3 border border-white/30">
                    Wolse Price
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </button>
                </Link>
              </div>

              <p className="mt-6 text-white/60 text-sm">
                No credit card required • Results in 2 minutes
              </p>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-12 text-center">
            <Link href="/" className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-2 group">
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-[#4A5568]">{text}</span>
    </li>
  );
}

function IncludedItem({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100 hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-1 transition-all duration-300 group">
      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{icon}</div>
      <h3 className="text-lg font-bold text-[#2D3748] mb-2">{title}</h3>
      <p className="text-[#718096] text-sm">{description}</p>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="bg-white rounded-2xl border border-amber-100 p-6 group hover:shadow-lg hover:shadow-amber-100/50 transition-all">
      <summary className="font-semibold text-[#2D3748] cursor-pointer list-none flex items-center justify-between">
        {question}
        <svg className="w-5 h-5 text-amber-500 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <p className="mt-4 text-[#4A5568] leading-relaxed">{answer}</p>
    </details>
  );
}
