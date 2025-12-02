'use client';

import Header from '@/components/Header';
import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 w-full z-50">
        <Header />
      </div>

      <div className="pt-32 pb-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            Terms of Service & Refund Policy
          </h1>
          <p className="text-lg text-gray-600 mb-12">
            Jeonse Safety Checker | 서비스 이용약관 및 환불정책
          </p>

          {/* Table of Contents */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-12">
            <h2 className="text-lg font-bold text-emerald-900 mb-3">Contents</h2>
            <ul className="space-y-2 text-emerald-800">
              <li><a href="#service-overview" className="hover:underline">1. Service Overview</a></li>
              <li><a href="#payment-terms" className="hover:underline">2. Payment Terms</a></li>
              <li><a href="#refund-policy" className="hover:underline">3. Refund Policy</a></li>
              <li><a href="#service-delivery" className="hover:underline">4. Service Delivery</a></li>
              <li><a href="#disclaimer" className="hover:underline">5. Disclaimer & Limitations</a></li>
              <li><a href="#contact" className="hover:underline">6. Contact Information</a></li>
            </ul>
          </div>

          {/* Service Overview */}
          <section id="service-overview" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
              1. Service Overview | 서비스 개요
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-700 leading-relaxed mb-4">
                Jeonse Safety Checker provides digital property analysis reports for Korean real estate, specifically designed for foreigners. Our service includes:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>English translation of Korean property registers (등기부등본)</li>
                <li>Automated risk analysis covering 20+ safety factors</li>
                <li>Property valuation based on government transaction data</li>
                <li>Comprehensive safety score and actionable recommendations</li>
                <li>Downloadable PDF report delivered instantly</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                전세안전연구소는 외국인을 위한 한국 부동산 분석 리포트를 제공하는 디지털 서비스입니다.
                등기부등본 영문 번역, 20개 이상의 위험 요소 분석, 정부 실거래가 기반 시세 평가,
                안전도 점수 및 실행 가능한 조언을 포함한 PDF 리포트를 즉시 제공합니다.
              </p>
            </div>
          </section>

          {/* Payment Terms */}
          <section id="payment-terms" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
              2. Payment Terms | 결제 약관
            </h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Pricing</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Current Beta Period:</strong> The service is currently FREE during our beta testing period.
                <br />
                <strong>Future Pricing:</strong> Standard pricing will be ₩29,000 - ₩50,000 per report after the beta period ends.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>베타 기간:</strong> 현재 베타 테스트 기간 동안 무료로 제공됩니다.
                <br />
                <strong>향후 가격:</strong> 베타 기간 종료 후 리포트당 ₩29,000 - ₩50,000의 요금이 부과됩니다.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.2 Payment Methods</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We accept the following payment methods through Toss Payments:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Credit Cards (신용카드) - All major Korean and international cards</li>
                <li>Bank Transfer (계좌이체)</li>
                <li>Virtual Account (가상계좌)</li>
                <li>Simple Payment (간편결제) - Toss, Naver Pay, Kakao Pay, etc.</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.3 Payment Processing</h3>
              <p className="text-gray-700 leading-relaxed">
                All payments are securely processed through Toss Payments.
                Your payment information is encrypted and we do not store your credit card details.
                <br /><br />
                모든 결제는 토스페이먼츠를 통해 안전하게 처리됩니다.
                결제 정보는 암호화되며 당사는 신용카드 정보를 저장하지 않습니다.
              </p>
            </div>
          </section>

          {/* Refund Policy */}
          <section id="refund-policy" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-emerald-500 pb-2">
              3. Refund Policy | 환불 정책
            </h2>
            <div className="bg-emerald-50 border-l-4 border-emerald-500 p-6 mb-6">
              <p className="font-semibold text-emerald-900 mb-2">
                Important: Digital Product Refund Policy
              </p>
              <p className="text-emerald-800 text-sm">
                As our service delivers digital reports instantly upon payment completion,
                refunds are subject to specific conditions outlined below.
              </p>
            </div>

            <div className="prose prose-gray max-w-none">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Full Refund (100%)</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You are eligible for a full refund in the following cases:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>Payment error:</strong> If you were charged but did not receive the report</li>
                <li><strong>Technical failure:</strong> If the analysis failed due to our system error</li>
                <li><strong>Incorrect property:</strong> If the report shows a different property than requested</li>
                <li><strong>Before download:</strong> If you request a refund before downloading the report</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                다음의 경우 100% 환불이 가능합니다:
                결제 오류로 리포트를 받지 못한 경우, 시스템 오류로 분석이 실패한 경우,
                요청한 부동산과 다른 리포트가 생성된 경우, 리포트 다운로드 전 환불 요청 시
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">3.2 No Refund</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Refunds are NOT available in the following cases:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li><strong>After download:</strong> Once you have downloaded the PDF report</li>
                <li><strong>Change of mind:</strong> Simple change of mind after receiving the report</li>
                <li><strong>Disagreement with results:</strong> If you disagree with the analysis results (our analysis is based on objective data and established risk assessment criteria)</li>
                <li><strong>User error:</strong> If you selected the wrong property or uploaded incorrect documents</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                다음의 경우 환불이 불가능합니다:
                PDF 리포트 다운로드 후, 단순 변심, 분석 결과에 대한 의견 차이,
                잘못된 부동산 선택 또는 문서 업로드 등 사용자 실수
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">3.3 Refund Request Process</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                To request a refund:
              </p>
              <ol className="list-decimal list-inside text-gray-700 space-y-2 mb-4">
                <li>Contact us at <strong>contact@jeonse-safety.com</strong> or call <strong>010-2382-8432</strong></li>
                <li>Provide your order number and reason for refund request</li>
                <li>We will review your request within 1 business day</li>
                <li>If approved, refunds will be processed within 3-5 business days</li>
              </ol>
              <p className="text-gray-700 leading-relaxed">
                환불 요청 절차: contact@jeonse-safety.com 또는 010-2382-8432로 연락 →
                주문번호 및 환불 사유 제공 → 1 영업일 내 검토 → 승인 시 3-5 영업일 내 환불 처리
              </p>
            </div>
          </section>

          {/* Service Delivery */}
          <section id="service-delivery" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
              4. Service Delivery | 서비스 제공
            </h2>
            <div className="prose prose-gray max-w-none">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Delivery Timeline</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Instant Delivery:</strong> Our service is a digital product delivered immediately upon payment completion.
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Analysis typically completes within 2-5 minutes</li>
                <li>Report is available for immediate download after analysis</li>
                <li>No physical delivery or shipping involved</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>즉시 제공:</strong> 결제 완료 후 즉시 제공되는 디지털 상품입니다.
                분석은 일반적으로 2-5분 내 완료되며, 완료 즉시 다운로드 가능합니다.
                물리적 배송은 없습니다.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.2 Access Period</h3>
              <p className="text-gray-700 leading-relaxed">
                Once generated, your report will be accessible in your account dashboard for 30 days.
                We recommend downloading and saving the PDF report for your records.
                <br /><br />
                리포트 생성 후 30일간 대시보드에서 접근 가능합니다.
                기록 보관을 위해 PDF를 다운로드하여 저장하시기를 권장합니다.
              </p>
            </div>
          </section>

          {/* Disclaimer */}
          <section id="disclaimer" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
              5. Disclaimer & Limitations | 면책 조항
            </h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-6">
              <p className="font-semibold text-yellow-900 mb-2">
                Important Legal Notice
              </p>
              <p className="text-yellow-800 text-sm">
                This service provides informational analysis only and does not constitute legal, financial, or investment advice.
              </p>
            </div>
            <div className="prose prose-gray max-w-none">
              <ul className="list-disc list-inside text-gray-700 space-y-2 mb-4">
                <li>Our analysis is based on public data and automated risk assessment algorithms</li>
                <li>We cannot guarantee the accuracy or completeness of government-provided data</li>
                <li>This service does not replace professional legal or real estate consultation</li>
                <li>Users are responsible for verifying critical information independently</li>
                <li>We are not liable for any decisions made based on our reports</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                본 서비스는 정보 제공 목적이며 법률, 금융, 투자 자문이 아닙니다.
                공공 데이터 기반 자동 분석이며, 정부 제공 데이터의 정확성이나 완전성을 보장할 수 없습니다.
                전문적인 법률 또는 부동산 상담을 대체하지 않습니다.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section id="contact" className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
              6. Contact Information | 연락처
            </h2>
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="space-y-3 text-gray-700">
                <p><strong>Company:</strong> 전세안전연구소 (Jeonse Safety Institute)</p>
                <p><strong>Representative:</strong> 김태수 (Kim Tae-soo)</p>
                <p><strong>Business Registration:</strong> 595-47-01161</p>
                <p><strong>Address:</strong> 서울특별시 중구 왕십리로 407, 101동 601호 (신당동, 신당파인힐하나유보라아파트)</p>
                <p><strong>Phone:</strong> 010-2382-8432</p>
                <p><strong>Email:</strong> contact@jeonse-safety.com</p>
                <p><strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM KST</p>
              </div>
            </div>
          </section>

          {/* Footer Navigation */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
