'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useScrollAnimation } from '@/lib/hooks/useScrollAnimation';

/**
 * Premium Landing Page V3
 * Design: Portfolite-inspired Minimalist + Futuristic Scientific Animations
 * Theme: Pure black, white text, elegant serif accents, data visualization
 */
export default function LandingPageV3() {
  const [mounted, setMounted] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const aboutSection = useScrollAnimation({ threshold: 0.2 });
  const processSection = useScrollAnimation({ threshold: 0.2 });
  const featuresSection = useScrollAnimation({ threshold: 0.2 });
  const ctaSection = useScrollAnimation({ threshold: 0.3 });

  // Particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.5 + 0.1
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();

        // Draw connections
        particles.forEach((p2, j) => {
          if (i === j) return;
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouse = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouse);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouse);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Nebula Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Primary nebula cloud - Purple/Violet */}
        <div
          className="absolute w-[1000px] h-[1000px] rounded-full animate-nebula-drift"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.5) 0%, rgba(88, 28, 135, 0.3) 30%, rgba(30, 27, 75, 0.15) 50%, transparent 70%)',
            top: '-5%',
            left: '-15%',
            filter: 'blur(60px)',
            opacity: 0.6,
          }}
        />
        {/* Secondary nebula cloud - Cyan/Teal */}
        <div
          className="absolute w-[800px] h-[800px] rounded-full animate-nebula-drift-reverse"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34, 211, 238, 0.4) 0%, rgba(6, 182, 212, 0.25) 30%, rgba(8, 145, 178, 0.1) 50%, transparent 70%)',
            top: '30%',
            right: '-10%',
            filter: 'blur(50px)',
            opacity: 0.5,
          }}
        />
        {/* Tertiary nebula - Pink/Magenta accent */}
        <div
          className="absolute w-[700px] h-[700px] rounded-full animate-nebula-pulse"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(236, 72, 153, 0.4) 0%, rgba(157, 23, 77, 0.25) 35%, rgba(76, 29, 149, 0.1) 55%, transparent 70%)',
            bottom: '-5%',
            left: '20%',
            filter: 'blur(55px)',
            opacity: 0.45,
          }}
        />
        {/* Deep space blue accent */}
        <div
          className="absolute w-[900px] h-[500px] rounded-full animate-nebula-drift"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.35) 0%, rgba(30, 64, 175, 0.2) 40%, transparent 65%)',
            top: '50%',
            left: '5%',
            filter: 'blur(70px)',
            opacity: 0.4,
            animationDelay: '-5s',
          }}
        />
        {/* Additional green/emerald accent for variety */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full animate-nebula-drift-reverse"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(52, 211, 153, 0.3) 0%, rgba(16, 185, 129, 0.15) 40%, transparent 65%)',
            top: '15%',
            right: '25%',
            filter: 'blur(65px)',
            opacity: 0.35,
            animationDelay: '-10s',
          }}
        />
      </div>

      {/* Star Field */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="stars-small" />
        <div className="stars-medium" />
        <div className="stars-large" />
      </div>

      {/* Shooting Stars */}
      <ShootingStars />

      {/* Particle Canvas Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-0 pointer-events-none"
      />

      {/* Scanning Line Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent animate-scan"
        />
      </div>

      {/* Grid Overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px'
        }}
      />

      {/* Hex Pattern Overlay */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.015]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
              <polygon points="25,0 50,14.4 50,38.6 25,53 0,38.6 0,14.4" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexagons)"/>
        </svg>
      </div>

      {/* Mouse Glow Effect */}
      <div
        className="fixed z-0 pointer-events-none w-[600px] h-[600px] rounded-full opacity-20 blur-[100px] transition-all duration-300"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          left: mousePos.x - 300,
          top: mousePos.y - 300,
        }}
      />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 mix-blend-difference">
        <div className="max-w-[1200px] mx-auto px-8 py-6 flex items-center justify-between">
          <Link href="/" className="text-white text-lg tracking-tight font-medium flex items-center gap-2">
            <DataIcon />
            Jeonse Safety
          </Link>
          <div className="flex items-center gap-8">
            <a href="#about" className="text-white/60 hover:text-white text-sm tracking-tight transition-colors">
              About
            </a>
            <a href="#process" className="text-white/60 hover:text-white text-sm tracking-tight transition-colors">
              Process
            </a>
            <Link href="/analyze" className="text-white text-sm tracking-tight hover:opacity-60 transition-opacity flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Start Analysis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col justify-center px-8 pt-24">
        <div className="max-w-[1200px] mx-auto w-full relative z-10">
          {/* Overline with typing effect */}
          <div
            className={`mb-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <span className="text-white/40 text-sm tracking-[0.2em] uppercase font-mono flex items-center gap-2">
              <span className="text-green-400">$</span>
              <TypeWriter text="Contract Analysis Platform" delay={50} />
              <span className="animate-blink">_</span>
            </span>
          </div>

          {/* Main Headline */}
          <h1
            className={`transition-all duration-1000 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <span
              className="block text-[clamp(3rem,8vw,7rem)] font-light leading-[0.95] tracking-[-0.03em]"
            >
              Protect your
            </span>
            <span
              className="block text-[clamp(3rem,8vw,7rem)] leading-[0.95] tracking-[-0.03em] mt-2 relative"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}
            >
              jeonse deposit
              {/* Glitch effect on hover */}
              <span className="absolute inset-0 text-transparent hover:text-red-500/20 transition-colors duration-100" aria-hidden>
                jeonse deposit
              </span>
            </span>
          </h1>

          {/* Description */}
          <div
            className={`mt-16 max-w-xl transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <p className="text-white/50 text-lg leading-relaxed tracking-tight">
              We translate complex Korean property documents into clear English
              and analyze over 20 risk factors to ensure your deposit is safe.
            </p>
          </div>

          {/* CTA */}
          <div
            className={`mt-12 flex items-center gap-8 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <Link href="/analyze">
              <button className="group flex items-center gap-4 text-white relative overflow-hidden">
                <span className="text-lg tracking-tight relative z-10">Start free analysis</span>
                <span className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all relative z-10">
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
                {/* Hover glow */}
                <span className="absolute inset-0 bg-white/5 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
              </button>
            </Link>
          </div>

          {/* Stats Row with animated counters */}
          <div
            className={`mt-32 pt-12 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-12 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <AnimatedStat number={5398} label="Apartments" suffix="" />
            <AnimatedStat number={20} label="Risk Factors" suffix="+" />
            <AnimatedStat number={2} label="Analysis Time" suffix=" min" />
            <AnimatedStat number={100} label="English Report" suffix="%" />
          </div>
        </div>

        {/* Floating Data Visualization */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden xl:block">
          <FloatingDataViz />
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        ref={aboutSection.elementRef as any}
        className={`py-32 px-8 transition-all duration-1000 ${aboutSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            {/* Left: Label */}
            <div>
              <span className="text-white/40 text-sm tracking-[0.2em] uppercase">
                The Problem
              </span>
            </div>

            {/* Right: Content */}
            <div className="space-y-12">
              <h2 className="text-4xl md:text-5xl font-light leading-[1.1] tracking-[-0.02em]">
                Foreigners face unique risks in the Korean rental market
              </h2>

              <div className="space-y-8 text-white/50 text-lg leading-relaxed">
                <p>
                  The Korean jeonse system requires large deposits—often ₩300M or more.
                  Without proper due diligence, you risk losing everything to fraud,
                  hidden debts, or legal complications.
                </p>
                <p>
                  Property registers are only in Korean, filled with complex legal
                  terminology. Even native speakers struggle to understand them fully.
                </p>
              </div>

              {/* Problem List */}
              <div className="grid gap-6 pt-8 border-t border-white/10">
                <ProblemItem
                  number="01"
                  title="Unreadable documents"
                  description="Legal Korean terminology with no English translation available"
                />
                <ProblemItem
                  number="02"
                  title="Unknown property value"
                  description="No access to market data to verify if your deposit is safe"
                />
                <ProblemItem
                  number="03"
                  title="Hidden legal risks"
                  description="Seizures, auctions, and liens that can make deposits unrecoverable"
                />
                <ProblemItem
                  number="04"
                  title="Jeonse fraud"
                  description="Scammers specifically target foreigners who can't verify ownership"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section
        id="process"
        ref={processSection.elementRef as any}
        className={`py-32 px-8 bg-[#0a0a0a] transition-all duration-1000 ${processSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-20">
            <span className="text-white/40 text-sm tracking-[0.2em] uppercase">
              How It Works
            </span>
            <h2 className="mt-6 text-4xl md:text-5xl font-light leading-[1.1] tracking-[-0.02em] max-w-2xl">
              Four simple steps to
              <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}> protect </span>
              your investment
            </h2>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-20">
            <ProcessStep
              number="01"
              title="Select your property"
              description="Choose from 10,800+ Seoul & Gyeonggi apartments in our database. Search in English or Korean."
              time="30 seconds"
            />
            <ProcessStep
              number="02"
              title="Upload the document"
              description="Upload the PDF register document (등기부등본) you downloaded from iros.go.kr."
              time="1 minute"
            />
            <ProcessStep
              number="03"
              title="AI analyzes everything"
              description="Our system extracts data, translates content, and checks 20+ risk factors automatically."
              time="2 minutes"
            />
            <ProcessStep
              number="04"
              title="Review your report"
              description="Get a comprehensive English report with safety score, risks, and action items."
              time="5 minutes"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        ref={featuresSection.elementRef as any}
        className={`py-32 px-8 transition-all duration-1000 ${featuresSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-[1200px] mx-auto">
          {/* Header */}
          <div className="mb-20 grid md:grid-cols-2 gap-16">
            <div>
              <span className="text-white/40 text-sm tracking-[0.2em] uppercase">
                What's Included
              </span>
              <h2 className="mt-6 text-4xl md:text-5xl font-light leading-[1.1] tracking-[-0.02em]">
                Everything you need
              </h2>
            </div>
            <div className="flex items-end">
              <p className="text-white/50 text-lg leading-relaxed">
                Professional-grade analysis tools previously only available to
                Korean real estate lawyers and professionals.
              </p>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-px bg-white/10">
            <FeatureItem
              title="English Translation"
              description="Complete translation of all legal terms and document content into clear, understandable English."
            />
            <FeatureItem
              title="Market Valuation"
              description="Accurate property valuation using official MOLIT transaction data and statistical analysis."
            />
            <FeatureItem
              title="20+ Risk Checks"
              description="Comprehensive analysis of mortgages, seizures, auctions, liens, and other encumbrances."
            />
            <FeatureItem
              title="Safety Score"
              description="Overall safety rating on a 0-100 scale with detailed breakdown of each risk category."
            />
            <FeatureItem
              title="Action Checklist"
              description="Step-by-step guidance on what to do before, during, and after signing the contract."
            />
            <FeatureItem
              title="PDF Export"
              description="Download your complete analysis report to share with family or professional advisors."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        ref={ctaSection.elementRef as any}
        className={`py-32 px-8 bg-[#0a0a0a] transition-all duration-1000 ${ctaSection.isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="max-w-[1200px] mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-light leading-[1.1] tracking-[-0.02em] mb-8">
            Ready to protect your
            <br />
            <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: 'italic' }}>
              deposit?
            </span>
          </h2>

          <p className="text-white/50 text-lg max-w-xl mx-auto mb-12">
            Join thousands of foreigners who have safely navigated the
            Korean rental market with our analysis tools.
          </p>

          <Link href="/analyze">
            <button className="group inline-flex items-center gap-4 px-8 py-4 bg-white text-black rounded-full hover:bg-white/90 transition-colors">
              <span className="text-lg tracking-tight font-medium">Start free analysis</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </Link>

          <p className="mt-6 text-white/30 text-sm">
            Free during beta. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 border-t border-white/10">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-3 gap-16">
            {/* Brand */}
            <div>
              <div className="text-lg font-medium tracking-tight mb-4">Jeonse Safety</div>
              <p className="text-white/40 text-sm leading-relaxed">
                Contract analysis platform for foreigners in Korea.
                Protecting your deposit, one document at a time.
              </p>
            </div>

            {/* Links */}
            <div className="space-y-3">
              <div className="text-white/40 text-sm tracking-[0.1em] uppercase mb-4">Quick Links</div>
              <a href="#about" className="block text-white/60 hover:text-white text-sm transition-colors">About</a>
              <a href="#process" className="block text-white/60 hover:text-white text-sm transition-colors">How it works</a>
              <Link href="/analyze" className="block text-white/60 hover:text-white text-sm transition-colors">Start Analysis</Link>
              <Link href="/terms" className="block text-white/60 hover:text-white text-sm transition-colors">Terms of Service</Link>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <div className="text-white/40 text-sm tracking-[0.1em] uppercase mb-4">Contact</div>
              <p className="text-white/60 text-sm">contact@jeonse-safety.com</p>
              <p className="text-white/60 text-sm">010-2382-8432</p>
            </div>
          </div>

          {/* Bottom */}
          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between gap-4 text-white/30 text-sm">
            <div>
              <p>Jeonse Safety Institute | Representative: Kim Tae-soo</p>
              <p>Business Registration: 595-47-01161</p>
            </div>
            <div className="text-right">
              <p>101-601, 407 Wangsimni-ro, Jung-gu, Seoul</p>
              <p>&copy; 2025 All rights reserved</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Google Fonts & Animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap');

        @keyframes scan {
          0% {
            top: 0;
          }
          100% {
            top: 100%;
          }
        }

        @keyframes scan-slow {
          0% {
            top: 0;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0;
          }
        }

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }

        .animate-scan {
          animation: scan 4s linear infinite;
        }

        .animate-scan-slow {
          animation: scan-slow 3s ease-in-out infinite;
        }

        .animate-blink {
          animation: blink 1s step-end infinite;
        }

        @keyframes orbit {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes orbit-reverse {
          0% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(0deg);
          }
        }

        .animate-orbit {
          animation: orbit 20s linear infinite;
        }

        .animate-orbit-reverse {
          animation: orbit-reverse 15s linear infinite;
        }

        .animate-spin-slow {
          animation: orbit 30s linear infinite;
        }

        .animate-spin-reverse {
          animation: orbit-reverse 25s linear infinite;
        }

        /* Glowing pulse animation */
        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }

        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }

        /* Nebula animations */
        @keyframes nebula-drift {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(30px, -20px) scale(1.05);
          }
          50% {
            transform: translate(-20px, 30px) scale(0.95);
          }
          75% {
            transform: translate(-30px, -10px) scale(1.02);
          }
        }

        @keyframes nebula-drift-reverse {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          25% {
            transform: translate(-40px, 20px) scale(1.1) rotate(5deg);
          }
          50% {
            transform: translate(20px, -30px) scale(0.9) rotate(-3deg);
          }
          75% {
            transform: translate(30px, 10px) scale(1.05) rotate(2deg);
          }
        }

        @keyframes nebula-pulse {
          0%, 100% {
            opacity: 0.1;
            transform: scale(1);
          }
          50% {
            opacity: 0.2;
            transform: scale(1.15);
          }
        }

        .animate-nebula-drift {
          animation: nebula-drift 25s ease-in-out infinite;
        }

        .animate-nebula-drift-reverse {
          animation: nebula-drift-reverse 30s ease-in-out infinite;
        }

        .animate-nebula-pulse {
          animation: nebula-pulse 8s ease-in-out infinite;
        }

        /* Star field styles */
        .stars-small, .stars-medium, .stars-large {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-repeat: repeat;
        }

        .stars-small {
          background-image: radial-gradient(1px 1px at 20px 30px, white, transparent),
                           radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
                           radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
                           radial-gradient(1px 1px at 90px 40px, white, transparent),
                           radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
                           radial-gradient(1px 1px at 160px 120px, white, transparent);
          background-size: 200px 200px;
          opacity: 0.3;
          animation: twinkle 4s ease-in-out infinite;
        }

        .stars-medium {
          background-image: radial-gradient(1.5px 1.5px at 100px 50px, white, transparent),
                           radial-gradient(1.5px 1.5px at 200px 150px, rgba(255,255,255,0.9), transparent),
                           radial-gradient(1.5px 1.5px at 300px 250px, white, transparent),
                           radial-gradient(1.5px 1.5px at 400px 100px, rgba(255,255,255,0.8), transparent);
          background-size: 400px 400px;
          opacity: 0.4;
          animation: twinkle 6s ease-in-out infinite;
          animation-delay: -2s;
        }

        .stars-large {
          background-image: radial-gradient(2px 2px at 150px 200px, white, transparent),
                           radial-gradient(2.5px 2.5px at 400px 300px, rgba(255,255,255,0.9), transparent),
                           radial-gradient(2px 2px at 250px 450px, white, transparent);
          background-size: 600px 600px;
          opacity: 0.5;
          animation: twinkle 8s ease-in-out infinite;
          animation-delay: -4s;
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        /* Shooting star */
        @keyframes shooting-star {
          0% {
            transform: translateX(0) translateY(0);
            opacity: 1;
          }
          70% {
            opacity: 1;
          }
          100% {
            transform: translateX(300px) translateY(300px);
            opacity: 0;
          }
        }

        .shooting-star {
          animation: shooting-star 1.5s ease-out forwards;
        }

        .shooting-star > div {
          box-shadow: 0 0 3px 1px rgba(255, 255, 255, 0.3);
        }

        /* Cosmic glow for text */
        .cosmic-glow {
          text-shadow: 0 0 40px rgba(139, 92, 246, 0.3),
                       0 0 80px rgba(139, 92, 246, 0.1);
        }
      `}</style>
    </div>
  );
}

// Helper Components

function StatItem({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-light tracking-[-0.02em] mb-2">{number}</div>
      <div className="text-white/40 text-sm tracking-tight">{label}</div>
    </div>
  );
}

function ProblemItem({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-6">
      <span className="text-white/20 text-sm font-medium">{number}</span>
      <div>
        <h3 className="text-white text-lg font-medium tracking-tight mb-1">{title}</h3>
        <p className="text-white/40 text-sm">{description}</p>
      </div>
    </div>
  );
}

function ProcessStep({ number, title, description, time }: { number: string; title: string; description: string; time: string }) {
  return (
    <div className="group">
      <div className="flex items-center gap-4 mb-4">
        <span className="text-white/20 text-sm font-medium">{number}</span>
        <span className="text-white/30 text-xs tracking-[0.1em] uppercase">{time}</span>
      </div>
      <h3 className="text-2xl font-light tracking-[-0.01em] mb-4 group-hover:text-white/80 transition-colors">
        {title}
      </h3>
      <p className="text-white/40 leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-black p-8 md:p-10 group hover:bg-[#0a0a0a] transition-colors">
      <h3 className="text-xl font-light tracking-[-0.01em] mb-4">{title}</h3>
      <p className="text-white/40 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

// TypeWriter effect component
function TypeWriter({ text, delay = 50 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, delay]);

  return <span>{displayText}</span>;
}

// Animated counter for stats
function AnimatedStat({ number, label, suffix = '' }: { number: number; label: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const steps = 60;
          const increment = number / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= number) {
              setCount(number);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [number, hasAnimated]);

  return (
    <div ref={ref}>
      <div className="text-3xl md:text-4xl font-light tracking-[-0.02em] mb-2 font-mono">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-white/40 text-sm tracking-tight">{label}</div>
    </div>
  );
}

// Floating data visualization component
function FloatingDataViz() {
  const [values, setValues] = useState<number[]>([65, 78, 45, 89, 56, 72, 83, 67]);

  useEffect(() => {
    const interval = setInterval(() => {
      setValues(prev => prev.map(v => {
        const change = (Math.random() - 0.5) * 10;
        return Math.max(20, Math.min(95, v + change));
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-64 h-80 opacity-30">
      {/* Vertical bars */}
      <div className="absolute inset-0 flex items-end justify-between gap-2">
        {values.map((value, i) => (
          <div
            key={i}
            className="w-full bg-gradient-to-t from-white/20 to-white/5 transition-all duration-1000 ease-out"
            style={{ height: `${value}%` }}
          />
        ))}
      </div>

      {/* Scanning line */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/40 to-transparent animate-scan-slow" />
      </div>

      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-white/30" />
      <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-white/30" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-white/30" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-white/30" />

      {/* Data points */}
      <div className="absolute -right-2 top-1/4 text-[10px] text-white/30 font-mono">RISK: 0.23</div>
      <div className="absolute -right-2 top-1/2 text-[10px] text-white/30 font-mono">VAL: 312M</div>
      <div className="absolute -right-2 top-3/4 text-[10px] text-white/30 font-mono">CONF: 87%</div>

      {/* Orbital rings */}
      <div className="absolute -left-20 -top-10 w-32 h-32 animate-orbit">
        <div className="absolute inset-0 border border-white/10 rounded-full" />
        <div className="absolute top-0 left-1/2 w-2 h-2 -ml-1 -mt-1 bg-white/40 rounded-full" />
      </div>
      <div className="absolute -left-16 top-20 w-24 h-24 animate-orbit-reverse">
        <div className="absolute inset-0 border border-white/5 rounded-full" />
        <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 -ml-0.75 mb-0 bg-white/30 rounded-full" />
      </div>
    </div>
  );
}

// Shooting stars effect
function ShootingStars() {
  const [stars, setStars] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);

  useEffect(() => {
    // Create occasional shooting stars
    const createStar = () => {
      const id = Date.now();
      const x = Math.random() * 60; // Start in left 60% of screen
      const y = Math.random() * 40; // Start in top 40% of screen
      const delay = 0;

      setStars(prev => [...prev, { id, x, y, delay }]);

      // Remove star after animation
      setTimeout(() => {
        setStars(prev => prev.filter(s => s.id !== id));
      }, 1500);
    };

    // Create a star every 3-8 seconds
    const scheduleNext = () => {
      const delay = 3000 + Math.random() * 5000;
      setTimeout(() => {
        createStar();
        scheduleNext();
      }, delay);
    };

    // Initial star after 2 seconds
    const initialTimeout = setTimeout(() => {
      createStar();
      scheduleNext();
    }, 2000);

    return () => clearTimeout(initialTimeout);
  }, []);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute shooting-star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
          }}
        >
          <div className="w-px h-20 bg-gradient-to-b from-white via-white/50 to-transparent transform -rotate-45 origin-top" />
        </div>
      ))}
    </div>
  );
}

// Orbiting dots around a central point
function OrbitingData() {
  return (
    <div className="absolute right-20 bottom-32 w-40 h-40 hidden lg:block">
      {/* Central node */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white/30 rounded-full" />

      {/* Orbit rings */}
      <div className="absolute inset-0 border border-white/5 rounded-full animate-spin-slow" />
      <div className="absolute inset-4 border border-white/10 rounded-full animate-spin-reverse" />
      <div className="absolute inset-8 border border-white/5 rounded-full animate-spin-slow" />

      {/* Orbiting points */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-2 h-2 bg-green-500/50 rounded-full" />
      </div>
      <div className="absolute bottom-4 right-4">
        <div className="w-1.5 h-1.5 bg-blue-500/50 rounded-full" />
      </div>
      <div className="absolute top-8 left-2">
        <div className="w-1 h-1 bg-white/40 rounded-full" />
      </div>
    </div>
  );
}

// Data icon for navigation
function DataIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="opacity-60">
      <rect x="2" y="10" width="3" height="8" fill="currentColor" />
      <rect x="7" y="6" width="3" height="12" fill="currentColor" />
      <rect x="12" y="8" width="3" height="10" fill="currentColor" />
      <rect x="17" y="4" width="3" height="14" fill="currentColor" opacity="0.5" />
      <circle cx="3.5" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8.5" cy="4" r="1.5" fill="currentColor" />
      <circle cx="13.5" cy="6" r="1.5" fill="currentColor" />
      <line x1="3.5" y1="8" x2="8.5" y2="4" stroke="currentColor" strokeWidth="0.5" />
      <line x1="8.5" y1="4" x2="13.5" y2="6" stroke="currentColor" strokeWidth="0.5" />
    </svg>
  );
}
