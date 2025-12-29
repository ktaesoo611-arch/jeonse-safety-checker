// Google Analytics 4 utility functions

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    dataLayer: unknown[];
  }
}

// Event parameter types
export interface AnalyticsEventParams {
  // Common params
  analysis_id?: string;
  rental_type?: 'jeonse' | 'wolse' | 'full_wolse';

  // Risk analysis params
  risk_level?: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  safety_score?: number;

  // Payment params
  amount?: number;
  currency?: string;
  payment_method?: string;

  // Document params
  document_type?: string;

  // Price analysis params
  assessment?: 'GOOD_DEAL' | 'FAIR' | 'OVERPRICED' | 'SEVERELY_OVERPRICED';

  // Generic params
  [key: string]: unknown;
}

// Track a custom event
export function trackEvent(eventName: string, params?: AnalyticsEventParams): void {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) {
    // Skip tracking in SSR or if GA is not configured
    return;
  }

  window.gtag('event', eventName, params);
}

// Track page view (optional - GA4 does this automatically with enhanced measurement)
export function trackPageView(url: string): void {
  if (typeof window === 'undefined' || !window.gtag || !GA_MEASUREMENT_ID) {
    return;
  }

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  });
}

// Predefined event functions for type safety
export const analytics = {
  // User selects rental type on /check page
  rentalTypeSelected: (rentalType: 'jeonse' | 'wolse' | 'full_wolse') => {
    trackEvent('rental_type_selected', { rental_type: rentalType });
  },

  // User starts analysis (form submission)
  analysisStarted: (rentalType: 'jeonse' | 'wolse' | 'full_wolse', analysisId?: string) => {
    trackEvent('analysis_started', { rental_type: rentalType, analysis_id: analysisId });
  },

  // User uploads document
  documentUploaded: (analysisId: string, documentType?: string) => {
    trackEvent('document_uploaded', { analysis_id: analysisId, document_type: documentType });
  },

  // Analysis processing completed
  analysisCompleted: (
    analysisId: string,
    rentalType: 'jeonse' | 'wolse' | 'full_wolse',
    riskLevel?: string,
    safetyScore?: number
  ) => {
    trackEvent('analysis_completed', {
      analysis_id: analysisId,
      rental_type: rentalType,
      risk_level: riskLevel as AnalyticsEventParams['risk_level'],
      safety_score: safetyScore,
    });
  },

  // User views payment page
  paymentInitiated: (analysisId: string, amount: number) => {
    trackEvent('payment_initiated', {
      analysis_id: analysisId,
      amount,
      currency: 'KRW',
    });
  },

  // Payment completed successfully
  paymentCompleted: (analysisId: string, amount: number, paymentMethod?: string) => {
    trackEvent('payment_completed', {
      analysis_id: analysisId,
      amount,
      currency: 'KRW',
      payment_method: paymentMethod,
    });
  },

  // User uses free beta option
  freeBetaUsed: (analysisId: string, rentalType: 'jeonse' | 'wolse' | 'full_wolse') => {
    trackEvent('free_beta_used', {
      analysis_id: analysisId,
      rental_type: rentalType,
    });
  },

  // User views the final report
  reportViewed: (
    analysisId: string,
    rentalType: 'jeonse' | 'wolse' | 'full_wolse',
    riskLevel?: string,
    safetyScore?: number
  ) => {
    trackEvent('report_viewed', {
      analysis_id: analysisId,
      rental_type: rentalType,
      risk_level: riskLevel as AnalyticsEventParams['risk_level'],
      safety_score: safetyScore,
    });
  },
};
