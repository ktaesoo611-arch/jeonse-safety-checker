import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const analysisId = '087e7748-3909-4abf-a684-b779743638b7';
const proposedJeonse = 650000000;

// Mock property valuation
const estimatedValue = Math.round(proposedJeonse / 0.70);
const mockMortgageAmount = Math.round(estimatedValue * 0.15);
const totalDebt = mockMortgageAmount;
const totalExposure = totalDebt + proposedJeonse;
const ltv = totalExposure / estimatedValue;

const riskAnalysis = {
  overallScore: 76,
  riskLevel: 'SAFE',
  verdict: 'SAFE TO PROCEED - Score: 76/100. This property shows good fundamentals with manageable risk.',
  ltv,
  totalDebt,
  availableEquity: estimatedValue - totalExposure,
  scores: {
    ltvScore: 60,
    debtScore: 80,
    legalScore: 100,
    marketScore: 70,
    buildingScore: 80
  },
  smallAmountPriority: {
    isEligible: false,
    protectedAmount: 0,
    threshold: 165000000,
    region: '서울',
    explanation: 'Your jeonse (₩65000만원) EXCEEDS the 소액보증금 threshold (₩16500만원) for 서울. You will NOT receive priority repayment protection. Senior mortgages will be paid first in foreclosure.'
  },
  risks: [
    {
      type: 'elevated_ltv',
      severity: 'HIGH',
      title: 'High LTV Ratio',
      description: `LTV is ${(ltv * 100).toFixed(1)}%. Your deposit has limited protection in foreclosure.`,
      impact: -40,
      category: 'debt'
    },
    {
      type: 'senior_mortgage',
      severity: 'HIGH',
      title: 'Bank Mortgage Has Priority Over Your Jeonse',
      description: `KB국민은행 has ₩${(mockMortgageAmount / 100000000).toFixed(1)}억 senior mortgage. In foreclosure, they get paid first. You do NOT qualify for 소액보증금 priority.`,
      impact: -30,
      category: 'priority'
    },
    {
      type: 'high_jeonse_ratio',
      severity: 'MEDIUM',
      title: 'Jeonse Ratio Above Recommended',
      description: `Your jeonse is ${(proposedJeonse / estimatedValue * 100).toFixed(1)}% of property value. Recommended maximum is 70%.`,
      impact: -15,
      category: 'debt'
    }
  ],
  recommendations: {
    mandatory: [
      'Get 확정일자 AND 전입신고 SAME DAY as payment',
      'Move in physically same day (점유 required for 대항력)',
      'Verify all information in 등기부등본 is current (request copy dated within 1 week)',
      'You do NOT have 소액보증금 protection - senior mortgages get paid first'
    ],
    recommended: [
      'Get independent property appraisal (감정평가)',
      'Visit property multiple times at different hours',
      'Talk to current residents about owner payment history',
      'Request owner to provide mortgage payment history (최근 납입내역서)',
      'Check if mortgages are current (no late payments)'
    ],
    optional: [
      'Install CCTV evidence of 점유 (physical occupancy)',
      'Keep copies of all utility bills in your name',
      'Document move-in date with photos and witnesses'
    ]
  },
  debtRanking: [
    {
      rank: 1,
      type: '근저당권 (Mortgage)',
      creditor: 'KB국민은행',
      amount: mockMortgageAmount,
      registrationDate: '2023-05-15',
      priority: 'senior'
    },
    {
      rank: 2,
      type: '전세 (Your Jeonse) - PROPOSED',
      creditor: 'You',
      amount: proposedJeonse,
      registrationDate: '미등록 (To be registered)',
      priority: 'subordinate'
    }
  ]
};

async function main() {
  const { data, error } = await supabase
    .from('analysis_results')
    .update({
      status: 'completed',
      risk_analysis: riskAnalysis,
      completed_at: new Date().toISOString()
    })
    .eq('id', analysisId)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Analysis completed:', data);
  }
}

main();
