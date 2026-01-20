'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { useScrollAnimation } from '@/lib/hooks/useScrollAnimation';
import Header from '@/components/Header';

/**
 * Premium Landing Page V2
 * Design: Glassmorphism + Analytics Dashboard
 * Theme: Dark slate with emerald/cyan accents
 */
export default function LandingPageV2() {
  const [mounted, setMounted] = useState(false);
  const problemsSection = useScrollAnimation({ threshold: 0.2 });
  const howItWorksSection = useScrollAnimation({ threshold: 0.2 });
  const featuresSection = useScrollAnimation({ threshold: 0.2 });
  const statsSection = useScrollAnimation({ threshold: 0.2 });
  const ctaSection = useScrollAnimation({ threshold: 0.3 });

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        {/* Gradient Orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-500/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Header */}
      <div className="fixed top-0 w-full z-50">
        <div className="backdrop-blur-xl bg-slate-950/70 border-b border-white/5">
          <Header />
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 min-h-screen flex items-center">
        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Text Content */}
            <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 mb-8 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-300 text-sm font-medium">AI-Powered Contract Analysis</span>
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight">
                <span className="text-white">Protect Your</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                  Jeonse Deposit
                </span>
              </h1>

              <p className="text-xl text-slate-400 mb-10 leading-relaxed max-w-xl">
                Advanced AI analyzes your Korean property documents in seconds.
                Detect hidden risks, understand legal terms, and make informed decisions.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/analyze">
                  <button className="group relative px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl font-semibold text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-105 overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">
                      Start Free Analysis
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </Link>
                <a href="#how-it-works">
                  <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl font-medium text-white hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-sm">
                    See How It Works
                  </button>
                </a>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Results in 2 minutes</span>
                </div>
              </div>
            </div>

            {/* Right: Floating Dashboard Preview */}
            <div className={`relative transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              {/* Main Card */}
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />

                {/* Dashboard Card */}
                <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-white font-semibold">Safety Analysis</div>
                        <div className="text-slate-500 text-sm">Gaepo RAEMIAN Forest</div>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full">
                      Safe
                    </div>
                  </div>

                  {/* Score Display */}
                  <div className="bg-slate-800/50 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-slate-400">Safety Score</span>
                      <span className="text-4xl font-bold text-white">87<span className="text-lg text-slate-500">/100</span></span>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-1000"
                        style={{ width: mounted ? '87%' : '0%' }}
                      />
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <MetricCard label="LTV Ratio" value="62%" status="safe" />
                    <MetricCard label="Legal Issues" value="None" status="safe" />
                    <MetricCard label="Market Trend" value="+2.3%" status="rising" />
                    <MetricCard label="Risk Factors" value="2" status="warning" />
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute -top-4 -right-4 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl animate-float">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">No Auction Risk</div>
                      <div className="text-slate-500 text-xs">Verified</div>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-4 -left-4 bg-slate-800/90 backdrop-blur-xl border border-white/10 rounded-xl p-4 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">₩3.2B</div>
                      <div className="text-slate-500 text-xs">Market Value</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section
        ref={statsSection.elementRef as any}
        className={`relative py-20 transition-all duration-1000 ${
          statsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard value="5,398" label="Apartments Covered" suffix="+" />
            <StatCard value="20" label="Risk Factors Analyzed" suffix="+" />
            <StatCard value="2" label="Minutes to Analyze" suffix="" />
            <StatCard value="99" label="Accuracy Rate" suffix="%" />
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section
        ref={problemsSection.elementRef as any}
        className={`relative py-24 transition-all duration-1000 ${
          problemsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
              <span className="text-red-400 text-sm font-medium">The Challenge</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              <span className="text-white">Why Foreigners</span>
              <br />
              <span className="text-slate-400">Struggle with Jeonse</span>
            </h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
              The Korean rental system is complex. Without proper analysis, you risk losing your entire deposit.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <ProblemCardV2
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="Unreadable Documents"
              description="Property registers are only in Korean with complex legal terminology that even native speakers struggle with."
            />
            <ProblemCardV2
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Unknown Property Value"
              description="Without access to transaction data, it's impossible to know if your deposit amount is safe relative to property value."
            />
            <ProblemCardV2
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
              title="Hidden Legal Risks"
              description="Seizures, auctions, and provisional dispositions can make your deposit unrecoverable if not detected early."
            />
            <ProblemCardV2
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
              title="Jeonse Fraud"
              description="Scammers target foreigners who can't verify property ownership or existing debts on the property."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        ref={howItWorksSection.elementRef as any}
        className={`relative py-24 transition-all duration-1000 ${
          howItWorksSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <span className="text-emerald-400 text-sm font-medium">Simple Process</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              <span className="text-white">How It Works</span>
            </h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
              Get your comprehensive safety analysis in just 4 simple steps
            </p>
          </div>

          {/* Timeline */}
          <div className="relative max-w-4xl mx-auto">
            {/* Vertical Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500 via-cyan-500 to-teal-500" />

            <div className="space-y-12">
              <StepCardV2
                number="01"
                title="Select Property"
                description="Search 10,800+ apartments by name, or enter address for 연립/다세대. Seoul & Gyeonggi supported."
                time="30 sec"
                align="right"
              />
              <StepCardV2
                number="02"
                title="Upload Document"
                description="Upload the PDF register document (등기부등본) from iros.go.kr."
                time="1 min"
                align="left"
              />
              <StepCardV2
                number="03"
                title="AI Analysis"
                description="Our AI extracts data, translates content, and analyzes 20+ risk factors automatically."
                time="2 min"
                align="right"
              />
              <StepCardV2
                number="04"
                title="Review Report"
                description="Get a detailed English report with safety score, risks, and actionable recommendations."
                time="5 min"
                align="left"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        ref={featuresSection.elementRef as any}
        className={`relative py-24 transition-all duration-1000 ${
          featuresSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <div className="inline-block mb-4 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
              <span className="text-cyan-400 text-sm font-medium">Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
              <span className="text-white">Everything You Need</span>
            </h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
              Professional-grade analysis tools to protect your investment
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCardV2
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              }
              title="English Translation"
              description="Complete translation of all legal terms and document content into clear, understandable English."
              gradient="from-emerald-500 to-teal-500"
            />
            <FeatureCardV2
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
              title="Market Valuation"
              description="Accurate property valuation using MOLIT transaction data with linear regression analysis."
              gradient="from-cyan-500 to-blue-500"
            />
            <FeatureCardV2
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              title="20+ Risk Checks"
              description="Comprehensive analysis of mortgages, seizures, auctions, liens, and other legal encumbrances."
              gradient="from-teal-500 to-emerald-500"
            />
            <FeatureCardV2
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              }
              title="Safety Score"
              description="Overall safety rating on a 0-100 scale with detailed breakdown of each risk category."
              gradient="from-emerald-500 to-cyan-500"
            />
            <FeatureCardV2
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
              title="Action Items"
              description="Step-by-step checklist of what you must do before, during, and after signing the contract."
              gradient="from-cyan-500 to-teal-500"
            />
            <FeatureCardV2
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="PDF Export"
              description="Download your complete analysis report to share with family, friends, or professional advisors."
              gradient="from-teal-500 to-emerald-500"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={ctaSection.elementRef as any}
        className={`relative py-24 transition-all duration-1000 ${
          ctaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="container mx-auto px-6 max-w-4xl">
          {/* CTA Card */}
          <div className="relative">
            {/* Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-3xl blur-2xl" />

            <div className="relative bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-12 text-center">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                <span className="text-white">Ready to Protect</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Your Deposit?
                </span>
              </h2>
              <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
                Join thousands of foreigners who have safely navigated the Korean rental market with our analysis tools.
              </p>
              <Link href="/analyze">
                <button className="group relative px-10 py-5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl font-semibold text-lg text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all hover:scale-105">
                  <span className="flex items-center gap-2">
                    Start Free Analysis Now
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </button>
              </Link>
              <p className="mt-6 text-slate-500 text-sm">
                Free during beta period. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 border-t border-white/5">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center space-y-6">
            <p className="text-slate-500 font-medium">
              Jeonse Safety Checker &copy; 2025
            </p>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
              This service is for informational purposes and is not legal advice.
              <br />
              Please consult with a professional before making important decisions.
            </p>
            <div className="border-t border-white/5 pt-6">
              <div className="text-sm text-slate-600 max-w-4xl mx-auto space-y-2">
                <p className="font-medium text-slate-500">Jeonse Safety Institute</p>
                <p>Representative: Kim Tae-soo | Business Registration: 595-47-01161</p>
                <p>101-601, 407 Wangsimni-ro, Jung-gu, Seoul, Korea</p>
                <p>Tel: 010-2382-8432 | Email: contact@jeonse-safety.com</p>
                <Link href="/terms" className="text-emerald-400 hover:text-emerald-300 underline inline-block mt-2">
                  Terms of Service & Refund Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Helper Components

function MetricCard({ label, value, status }: { label: string; value: string; status: 'safe' | 'warning' | 'danger' | 'rising' }) {
  const statusColors = {
    safe: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    rising: 'text-cyan-400'
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-4">
      <div className="text-slate-500 text-sm mb-1">{label}</div>
      <div className={`text-xl font-bold ${statusColors[status]}`}>{value}</div>
    </div>
  );
}

function StatCard({ value, label, suffix }: { value: string; label: string; suffix: string }) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-white mb-2">
        {value}<span className="text-emerald-400">{suffix}</span>
      </div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}

function ProblemCardV2({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-8 hover:bg-slate-900/80 hover:border-white/10 transition-all">
      <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCardV2({ number, title, description, time, align }: { number: string; title: string; description: string; time: string; align: 'left' | 'right' }) {
  return (
    <div className={`relative flex items-center gap-8 ${align === 'left' ? 'md:flex-row-reverse' : ''}`}>
      {/* Number Circle */}
      <div className="relative z-10 flex-shrink-0 w-16 h-16 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
        <span className="text-white text-xl font-bold">{number}</span>
      </div>

      {/* Content */}
      <div className={`flex-1 bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-6 ${align === 'left' ? 'md:text-right' : ''}`}>
        <div className={`flex items-center gap-3 mb-2 ${align === 'left' ? 'md:flex-row-reverse' : ''}`}>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <span className="text-sm text-slate-500 bg-slate-800 px-3 py-1 rounded-full">~{time}</span>
        </div>
        <p className="text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function FeatureCardV2({ icon, title, description, gradient }: { icon: React.ReactNode; title: string; description: string; gradient: string }) {
  return (
    <div className="group bg-slate-900/50 backdrop-blur-sm border border-white/5 rounded-2xl p-8 hover:bg-slate-900/80 hover:border-white/10 transition-all">
      <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}
