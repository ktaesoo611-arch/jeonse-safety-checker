'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SEOUL_DISTRICTS, Apartment } from '@/lib/data/address-data';
import { WolseAnalysisResult } from '@/lib/types';
import { useHaptic } from '@/lib/hooks/useHaptic';

type ViewState = 'form' | 'preview' | 'full';

interface DepositSafetyResult {
  safetyScore: number;
  riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  ltvRatio: number;
  estimatedPropertyValue: number;
  riskFactors: string[];
  recommendations: string[];
}

export default function FullRentalCheckPage() {
  const haptic = useHaptic();
  const [viewState, setViewState] = useState<ViewState>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    city: '서울특별시',
    district: '',
    dong: '',
    building: '',
    exclusiveArea: '',
    deposit: '',
    monthlyRent: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apartmentSearch, setApartmentSearch] = useState('');
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);

  // Results
  const [wolseResult, setWolseResult] = useState<WolseAnalysisResult | null>(null);
  const [depositSafetyResult, setDepositSafetyResult] = useState<DepositSafetyResult | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  // Get available dongs for selected district
  const availableDongs = useMemo(() => {
    if (!formData.district) return [];
    const selectedDistrict = SEOUL_DISTRICTS.find(d => d.name === formData.district);
    return selectedDistrict?.dongs || [];
  }, [formData.district]);

  // Fetch apartments from API
  useEffect(() => {
    const fetchApartments = async () => {
      try {
        const params = new URLSearchParams();
        if (apartmentSearch) params.append('q', apartmentSearch);
        if (formData.dong) params.append('dong', formData.dong);
        if (formData.district) params.append('district', formData.district);
        params.append('limit', '20');

        const response = await fetch(`/api/apartments?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setFilteredApartments(data.apartments);
        }
      } catch (error) {
        console.error('Failed to fetch apartments:', error);
        setFilteredApartments([]);
      }
    };

    fetchApartments();
  }, [apartmentSearch, formData.dong, formData.district]);

  // Reset dong when district changes
  const handleDistrictChange = (district: string) => {
    setFormData({ ...formData, district, dong: '' });
  };

  // Handle apartment selection
  const handleApartmentSelect = (apartmentName: string) => {
    setFormData({ ...formData, building: apartmentName });
    setApartmentSearch('');
  };

  // Format number with commas
  const formatNumber = (value: string) => {
    const num = value.replace(/,/g, '');
    if (!num || isNaN(parseInt(num))) return value;
    return parseInt(num).toLocaleString();
  };

  // Parse formatted number
  const parseNumber = (value: string) => {
    return value.replace(/,/g, '');
  };

  // Format Korean amount
  const formatKoreanAmount = (value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num <= 0) return null;

    const eok = Math.floor(num / 100000000);
    const man = Math.floor((num % 100000000) / 10000);

    if (eok > 0 && man > 0) {
      return `${eok}억 ${man.toLocaleString()}만원`;
    } else if (eok > 0) {
      return `${eok}억원`;
    } else if (man > 0) {
      return `${man.toLocaleString()}만원`;
    }
    return `${num.toLocaleString()}원`;
  };

  // Calculate deposit safety based on deposit amount and area
  const calculateDepositSafety = (deposit: number, area: number): DepositSafetyResult => {
    // Estimate property value based on area (Seoul average ~20M per sqm for apartments)
    const pricePerSqm = 20000000; // 2000만원/㎡ average
    const estimatedPropertyValue = area * pricePerSqm;

    // Calculate LTV ratio
    const ltvRatio = (deposit / estimatedPropertyValue) * 100;

    // Determine risk level based on LTV
    let riskLevel: 'SAFE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    let safetyScore: number;

    if (ltvRatio <= 60) {
      riskLevel = 'SAFE';
      safetyScore = Math.round(90 - (ltvRatio * 0.5));
    } else if (ltvRatio <= 70) {
      riskLevel = 'MODERATE';
      safetyScore = Math.round(80 - ((ltvRatio - 60) * 2));
    } else if (ltvRatio <= 80) {
      riskLevel = 'HIGH';
      safetyScore = Math.round(60 - ((ltvRatio - 70) * 3));
    } else {
      riskLevel = 'CRITICAL';
      safetyScore = Math.max(10, Math.round(30 - ((ltvRatio - 80) * 2)));
    }

    // Generate risk factors
    const riskFactors: string[] = [];
    if (ltvRatio > 70) {
      riskFactors.push('High deposit-to-value ratio increases risk');
    }
    if (ltvRatio > 80) {
      riskFactors.push('Deposit exceeds safe threshold (80% of property value)');
    }
    if (deposit > 300000000) {
      riskFactors.push('Large deposit amount increases exposure');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    recommendations.push('Request the property register (등기부등본) to verify ownership and debts');
    if (ltvRatio > 70) {
      recommendations.push('Consider negotiating a lower deposit or choosing another property');
    }
    recommendations.push('Register your lease with the court (전세권 설정) for protection');
    recommendations.push('Verify landlord identity with official ID');

    return {
      safetyScore,
      riskLevel,
      ltvRatio,
      estimatedPropertyValue,
      riskFactors,
      recommendations
    };
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    haptic.medium();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.district) newErrors.district = 'Please select a district';
    if (!formData.dong) newErrors.dong = 'Please select a neighborhood';
    if (!formData.building) newErrors.building = 'Please enter building name';
    if (!formData.exclusiveArea) newErrors.exclusiveArea = 'Please enter area';
    if (!formData.deposit) newErrors.deposit = 'Please enter deposit amount';
    if (!formData.monthlyRent) newErrors.monthlyRent = 'Please enter monthly rent';

    const exclusiveArea = parseFloat(formData.exclusiveArea);
    const deposit = parseInt(parseNumber(formData.deposit));
    const monthlyRent = parseInt(parseNumber(formData.monthlyRent));

    if (formData.exclusiveArea && (isNaN(exclusiveArea) || exclusiveArea <= 0)) {
      newErrors.exclusiveArea = 'Please enter a valid area';
    }
    if (formData.deposit && (isNaN(deposit) || deposit <= 0)) {
      newErrors.deposit = 'Please enter a valid deposit amount';
    }
    if (formData.monthlyRent && (isNaN(monthlyRent) || monthlyRent <= 0)) {
      newErrors.monthlyRent = 'Please enter a valid rent amount';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      haptic.error();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Run wolse price analysis
      const wolseResponse = await fetch('/api/wolse/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: formData.city,
          district: formData.district,
          dong: formData.dong,
          apartmentName: formData.building,
          exclusiveArea,
          deposit,
          monthlyRent
        })
      });

      const wolseData = await wolseResponse.json();

      if (!wolseResponse.ok) {
        throw new Error(wolseData.error || 'Failed to analyze rent price');
      }

      // Calculate deposit safety
      const depositSafety = calculateDepositSafety(deposit, exclusiveArea);

      // Store results
      setWolseResult(wolseData.result);
      setDepositSafetyResult(depositSafety);
      setViewState('preview');

      haptic.success();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  // Handle unlock
  const handleUnlock = () => {
    setShowPaymentModal(true);
  };

  // Handle free beta unlock
  const handleFreeBeta = async () => {
    if (!wolseResult) return;

    setUnlocking(true);
    haptic.medium();

    try {
      // Save wolse analysis
      const response = await fetch('/api/wolse/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: wolseResult,
          inputData: {
            city: formData.city,
            district: formData.district,
            dong: formData.dong,
            apartmentName: formData.building,
            exclusiveArea: parseFloat(formData.exclusiveArea),
            deposit: parseInt(parseNumber(formData.deposit)),
            monthlyRent: parseInt(parseNumber(formData.monthlyRent))
          },
          paymentKey: null,
          paymentAmount: 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save analysis');
      }

      setWolseResult(data.result);
      setViewState('full');
      setShowPaymentModal(false);

      haptic.success();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock');
      haptic.error();
    } finally {
      setUnlocking(false);
    }
  };

  // New analysis
  const handleNewAnalysis = () => {
    setViewState('form');
    setWolseResult(null);
    setDepositSafetyResult(null);
    setError(null);
  };

  // Format won
  const formatWon = (amount: number) => {
    if (amount >= 100000000) {
      const eok = Math.floor(amount / 100000000);
      const man = Math.floor((amount % 100000000) / 10000);
      if (man > 0) return `${eok}억 ${man.toLocaleString()}만원`;
      return `${eok}억원`;
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  // Blurred value component
  const BlurredValue = ({ hint }: { hint: string }) => (
    <span className="relative inline-block">
      <span className="blur-md select-none">{hint}</span>
      <span className="absolute inset-0 flex items-center justify-center">
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </span>
    </span>
  );

  // Get risk level styling
  const getRiskLevelStyle = (riskLevel: string) => {
    switch (riskLevel) {
      case 'SAFE':
        return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', label: 'Low Risk' };
      case 'MODERATE':
        return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', label: 'Moderate Risk' };
      case 'HIGH':
        return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', label: 'High Risk' };
      case 'CRITICAL':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', label: 'Critical Risk' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', label: 'Unknown' };
    }
  };

  // Get assessment styling
  const getAssessmentStyle = (assessment: string) => {
    switch (assessment) {
      case 'GOOD_DEAL':
        return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: '🎉', label: 'Great Deal!' };
      case 'FAIR':
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '✓', label: 'Fair Price' };
      case 'OVERPRICED':
        return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: '⚠️', label: 'Above Market' };
      case 'SEVERELY_OVERPRICED':
        return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: '🚨', label: 'Significantly Overpriced' };
      default:
        return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', icon: '?', label: 'Unknown' };
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 right-[10%] w-96 h-96 bg-green-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[20%] left-[5%] w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-green-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/analyze" className="text-[#4A5568] hover:text-amber-600 font-medium transition-colors">
              Jeonse
            </Link>
            <Link href="/analyze/wolse" className="text-[#4A5568] hover:text-amber-600 font-medium transition-colors">
              Wolse
            </Link>
            <span className="text-green-600 font-semibold">Full Check</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-6 py-12 max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          {viewState === 'form' ? (
            <Link href="/check/wolse" className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-2 group">
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </Link>
          ) : (
            <button
              onClick={handleNewAnalysis}
              className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-2 group"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              New Analysis
            </button>
          )}
        </div>

        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold mb-6 border border-green-200">
            <span>Full Rental Check</span>
            {viewState === 'preview' && (
              <>
                <span className="text-green-400">|</span>
                <span>Preview</span>
              </>
            )}
            {viewState === 'full' && (
              <>
                <span className="text-green-400">|</span>
                <span>Full Report</span>
              </>
            )}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight">
            {viewState === 'form' && 'Full Rental Check'}
            {viewState === 'preview' && 'Your Analysis Preview'}
            {viewState === 'full' && 'Your Full Report'}
          </h1>
          <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
            {viewState === 'form' && 'Check your deposit safety and rent price together'}
            {viewState === 'preview' && 'Unlock to see exact numbers and recommendations'}
            {viewState === 'full' && 'Complete analysis of your rental contract'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Form View */}
        {viewState === 'form' && (
          <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-green-900/5 border border-green-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#1A202C] flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">1</span>
                  Property Location
                </h3>

                <Select
                  label="City"
                  value={formData.city}
                  onChange={(value) => setFormData({ ...formData, city: value })}
                  options={[{ value: '서울특별시', label: '서울특별시 (Seoul)' }]}
                  helperText="Currently supporting Seoul only"
                />

                <Select
                  label="District (구) *"
                  value={formData.district}
                  onChange={handleDistrictChange}
                  options={SEOUL_DISTRICTS.map(d => ({ value: d.name, label: `${d.name} (${d.nameEn})` }))}
                  placeholder="Select a district"
                  error={errors.district}
                />

                <Select
                  label="Neighborhood (동) *"
                  value={formData.dong}
                  onChange={(value) => setFormData({ ...formData, dong: value })}
                  options={availableDongs.map(dong => ({ value: dong.name, label: `${dong.name} (${dong.nameEn})` }))}
                  placeholder="Select district first"
                  error={errors.dong}
                  disabled={!formData.district}
                />
              </div>

              {/* Building Section */}
              <div className="space-y-4 pt-4 border-t border-green-100">
                <h3 className="text-lg font-semibold text-[#1A202C] flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">2</span>
                  Building Details
                </h3>

                <div className="relative">
                  <Input
                    label="Building / Apartment Name *"
                    placeholder="Type to search: e.g., 래미안역삼, Raemian"
                    value={formData.building || apartmentSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (formData.building) {
                        setFormData({ ...formData, building: '' });
                      }
                      setApartmentSearch(value);
                    }}
                    error={errors.building}
                    helperText="Search by Korean or English name"
                  />

                  {apartmentSearch && !formData.building && (
                    <div className="absolute z-10 w-full mt-2 bg-white border-2 border-green-200 rounded-2xl shadow-xl shadow-green-900/10 max-h-64 overflow-y-auto">
                      {filteredApartments.length > 0 ? (
                        <>
                          {filteredApartments.map((apt, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleApartmentSelect(apt.name)}
                              className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors border-b border-green-100 last:border-0"
                            >
                              <div className="font-semibold text-[#1A202C]">{apt.name}</div>
                              <div className="text-sm text-[#718096]">{apt.nameEn}</div>
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleApartmentSelect(apartmentSearch)}
                            className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors border-t-2 border-green-200 bg-green-50/50"
                          >
                            <div className="font-semibold text-green-600">Use custom: "{apartmentSearch}"</div>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApartmentSelect(apartmentSearch)}
                          className="w-full px-4 py-4 text-left hover:bg-green-50 transition-colors"
                        >
                          <div className="font-semibold text-green-600">Use "{apartmentSearch}"</div>
                          <div className="text-sm text-[#718096]">No matches found</div>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <Input
                  label="Exclusive Area (㎡) *"
                  type="number"
                  step="0.01"
                  placeholder="84.5"
                  value={formData.exclusiveArea}
                  onChange={(e) => setFormData({ ...formData, exclusiveArea: e.target.value })}
                  error={errors.exclusiveArea}
                  helperText="전용면적 - Check your contract or building register"
                />
              </div>

              {/* Rent Quote Section */}
              <div className="space-y-4 pt-4 border-t border-green-100">
                <h3 className="text-lg font-semibold text-[#1A202C] flex items-center gap-2">
                  <span className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">3</span>
                  Your Rental Quote
                </h3>

                <div>
                  <Input
                    label="Deposit (보증금) *"
                    placeholder="50,000,000"
                    value={formatNumber(formData.deposit)}
                    onChange={(e) => setFormData({ ...formData, deposit: parseNumber(e.target.value) })}
                    error={errors.deposit}
                    helperText="Enter in won (₩). This is the amount at risk."
                  />
                  {formData.deposit && formatKoreanAmount(formData.deposit) && (
                    <p className="mt-1 text-sm text-green-600 font-medium">
                      = {formatKoreanAmount(formData.deposit)}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    label="Monthly Rent (월세) *"
                    placeholder="1,500,000"
                    value={formatNumber(formData.monthlyRent)}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: parseNumber(e.target.value) })}
                    error={errors.monthlyRent}
                    helperText="Enter in won (₩)"
                  />
                  {formData.monthlyRent && formatKoreanAmount(formData.monthlyRent) && (
                    <p className="mt-1 text-sm text-green-600 font-medium">
                      = {formatKoreanAmount(formData.monthlyRent)}/month
                    </p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-green-200/50 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Run Full Analysis'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Preview View */}
        {viewState === 'preview' && wolseResult && depositSafetyResult && (
          <div className="space-y-8">
            {/* Section 1: Deposit Safety Results */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-green-900/5 border border-green-100">
              <h2 className="text-2xl font-bold text-[#1A202C] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                Deposit Safety Analysis
              </h2>

              {/* Safety Score */}
              <div className={`rounded-2xl p-6 mb-6 ${getRiskLevelStyle(depositSafetyResult.riskLevel).bg} ${getRiskLevelStyle(depositSafetyResult.riskLevel).border} border-2`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#718096] mb-1">Safety Score</p>
                    <p className="text-4xl font-bold text-[#1A202C]">
                      <BlurredValue hint="85" />
                      <span className="text-xl text-[#718096]">/100</span>
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-full ${getRiskLevelStyle(depositSafetyResult.riskLevel).bg} ${getRiskLevelStyle(depositSafetyResult.riskLevel).text} font-semibold`}>
                    {getRiskLevelStyle(depositSafetyResult.riskLevel).label}
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-[#718096] mb-1">Your Deposit</p>
                  <p className="text-xl font-bold text-[#1A202C]">{formatWon(parseInt(parseNumber(formData.deposit)))}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-[#718096] mb-1">Est. Property Value</p>
                  <p className="text-xl font-bold text-[#1A202C]">
                    <BlurredValue hint="6억원" />
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-[#718096] mb-1">LTV Ratio</p>
                  <p className="text-xl font-bold text-[#1A202C]">
                    <BlurredValue hint="42%" />
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-[#718096] mb-1">Risk Factors</p>
                  <p className="text-xl font-bold text-[#1A202C]">
                    <BlurredValue hint="2" />
                  </p>
                </div>
              </div>

              {/* Recommendations Preview (locked) */}
              <div className="bg-gray-50 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute inset-0 backdrop-blur-sm bg-white/60 flex items-center justify-center z-10">
                  <div className="text-center">
                    <svg className="w-6 h-6 text-green-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <p className="text-[#4A5568] font-medium text-sm">Unlock for detailed recommendations</p>
                  </div>
                </div>
                <h4 className="font-semibold text-[#1A202C] mb-2">Recommendations</h4>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </div>
            </div>

            {/* Section 2: Rent Price Results */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-amber-900/5 border border-amber-100">
              <h2 className="text-2xl font-bold text-[#1A202C] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Rent Price Analysis
              </h2>

              {/* Assessment Banner */}
              <div className={`rounded-2xl p-6 mb-6 ${getAssessmentStyle(wolseResult.assessment).bg} ${getAssessmentStyle(wolseResult.assessment).border} border-2`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{getAssessmentStyle(wolseResult.assessment).icon}</span>
                  <div>
                    <h3 className={`text-xl font-bold ${getAssessmentStyle(wolseResult.assessment).text}`}>
                      {getAssessmentStyle(wolseResult.assessment).label}
                    </h3>
                    <p className="text-[#4A5568]">
                      {wolseResult.assessment === 'GOOD_DEAL' && 'Your rent is below market expectation.'}
                      {wolseResult.assessment === 'FAIR' && 'Your rent is at market expectation.'}
                      {wolseResult.assessment === 'OVERPRICED' && 'Your rent is above market expectation.'}
                      {wolseResult.assessment === 'SEVERELY_OVERPRICED' && 'Your rent is significantly above market.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-[#718096] mb-1">Your Rent</p>
                  <p className="text-xl font-bold text-[#1A202C]">{formatWon(wolseResult.userMonthlyRent)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-[#718096] mb-1">Expected Rent</p>
                  <p className="text-xl font-bold text-amber-600">
                    <BlurredValue hint="150만원" />
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-[#718096] mb-1">Difference</p>
                  <p className="text-xl font-bold text-[#1A202C]">
                    <BlurredValue hint="+10만원" />
                  </p>
                </div>
              </div>

              {/* Data Quality */}
              <div className="flex items-center justify-center gap-6 text-sm text-[#718096]">
                <span>Data Quality: {wolseResult.confidenceLevel}</span>
                <span>•</span>
                <span>{wolseResult.contractCount} contracts analyzed</span>
              </div>
            </div>

            {/* Unlock CTA */}
            <div className="bg-gradient-to-br from-green-900 to-emerald-950 rounded-3xl p-8 text-white shadow-xl">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-3">Unlock Full Report</h3>
                <p className="text-green-100 mb-6 max-w-md mx-auto">
                  Get complete deposit safety analysis, exact rent comparisons, and actionable recommendations.
                </p>

                <div className="flex flex-wrap justify-center gap-3 mb-6 text-sm">
                  <span className="bg-green-100/20 px-3 py-1 rounded-full">✓ Safety score details</span>
                  <span className="bg-green-100/20 px-3 py-1 rounded-full">✓ LTV calculation</span>
                  <span className="bg-green-100/20 px-3 py-1 rounded-full">✓ Risk factors</span>
                  <span className="bg-green-100/20 px-3 py-1 rounded-full">✓ Exact rent numbers</span>
                  <span className="bg-green-100/20 px-3 py-1 rounded-full">✓ Recommendations</span>
                </div>

                {/* Pricing */}
                <div className="mb-6">
                  <span className="text-green-200 line-through mr-2">₩19,900</span>
                  <span className="text-3xl font-bold">FREE</span>
                  <span className="ml-2 px-2 py-1 bg-green-400/20 text-green-200 text-xs font-bold rounded-full">BETA</span>
                </div>

                <button
                  onClick={handleFreeBeta}
                  disabled={unlocking}
                  className="bg-gradient-to-r from-green-400 to-emerald-400 text-green-900 font-bold text-lg px-10 py-4 rounded-2xl hover:shadow-xl hover:shadow-green-400/30 transition-all duration-200 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {unlocking ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Unlocking...
                    </span>
                  ) : (
                    'Unlock Full Report - Free'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Full Report View */}
        {viewState === 'full' && wolseResult && depositSafetyResult && (
          <div className="space-y-8">
            {/* Section 1: Deposit Safety Results - Full */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-green-900/5 border border-green-100">
              <h2 className="text-2xl font-bold text-[#1A202C] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                Deposit Safety Analysis
              </h2>

              {/* Safety Score */}
              <div className={`rounded-2xl p-6 mb-6 ${getRiskLevelStyle(depositSafetyResult.riskLevel).bg} ${getRiskLevelStyle(depositSafetyResult.riskLevel).border} border-2`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#718096] mb-1">Safety Score</p>
                    <p className="text-4xl font-bold text-[#1A202C]">
                      {depositSafetyResult.safetyScore}
                      <span className="text-xl text-[#718096]">/100</span>
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-full ${getRiskLevelStyle(depositSafetyResult.riskLevel).bg} ${getRiskLevelStyle(depositSafetyResult.riskLevel).text} font-semibold`}>
                    {getRiskLevelStyle(depositSafetyResult.riskLevel).label}
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-[#718096] mb-1">Your Deposit</p>
                  <p className="text-xl font-bold text-[#1A202C]">{formatWon(parseInt(parseNumber(formData.deposit)))}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-[#718096] mb-1">Est. Property Value</p>
                  <p className="text-xl font-bold text-[#1A202C]">{formatWon(depositSafetyResult.estimatedPropertyValue)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-[#718096] mb-1">LTV Ratio (Deposit/Value)</p>
                  <p className="text-xl font-bold text-[#1A202C]">{depositSafetyResult.ltvRatio.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-[#718096] mb-1">Risk Factors Found</p>
                  <p className="text-xl font-bold text-[#1A202C]">{depositSafetyResult.riskFactors.length}</p>
                </div>
              </div>

              {/* Risk Factors */}
              {depositSafetyResult.riskFactors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-red-700 mb-2">⚠️ Risk Factors</h4>
                  <ul className="space-y-2">
                    {depositSafetyResult.riskFactors.map((factor, i) => (
                      <li key={i} className="text-red-600 text-sm flex items-start gap-2">
                        <span>•</span>
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-green-50 rounded-xl p-4">
                <h4 className="font-semibold text-green-700 mb-2">✓ Recommendations</h4>
                <ul className="space-y-2">
                  {depositSafetyResult.recommendations.map((rec, i) => (
                    <li key={i} className="text-green-600 text-sm flex items-start gap-2">
                      <span>•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <p className="mt-4 text-xs text-[#718096]">
                * This is a preliminary assessment based on deposit amount and area. For a complete analysis
                including ownership verification and debt check, upload your property register (등기부등본).
              </p>
            </div>

            {/* Section 2: Rent Price Results - Full */}
            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-amber-900/5 border border-amber-100">
              <h2 className="text-2xl font-bold text-[#1A202C] mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Rent Price Analysis
              </h2>

              {/* Assessment Banner */}
              <div className={`rounded-2xl p-6 mb-6 ${getAssessmentStyle(wolseResult.assessment).bg} ${getAssessmentStyle(wolseResult.assessment).border} border-2`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{getAssessmentStyle(wolseResult.assessment).icon}</span>
                  <div>
                    <h3 className={`text-xl font-bold ${getAssessmentStyle(wolseResult.assessment).text}`}>
                      {getAssessmentStyle(wolseResult.assessment).label}
                    </h3>
                    <p className="text-[#4A5568]">{wolseResult.assessmentDetails}</p>
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-[#718096] mb-1">Your Rent</p>
                  <p className="text-xl font-bold text-[#1A202C]">{formatWon(wolseResult.userMonthlyRent)}</p>
                  <p className="text-xs text-[#718096]">at {formatWon(wolseResult.userDeposit)} deposit</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-[#718096] mb-1">Expected Rent</p>
                  <p className="text-xl font-bold text-amber-600">{formatWon(wolseResult.expectedRent)}</p>
                  <p className="text-xs text-[#718096]">at {wolseResult.marketRate.toFixed(2)}% market rate</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-[#718096] mb-1">Difference</p>
                  <p className={`text-xl font-bold ${wolseResult.rentDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {wolseResult.rentDifference > 0 ? '+' : ''}{formatWon(wolseResult.rentDifference)}
                  </p>
                  <p className="text-xs text-[#718096]">
                    {wolseResult.rentDifferencePercent > 0 ? '+' : ''}{wolseResult.rentDifferencePercent.toFixed(1)}% vs expected
                  </p>
                </div>
              </div>

              {/* Market Trend */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-[#1A202C] mb-2">📈 Market Trend</h4>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    wolseResult.trend.direction.includes('RISING') ? 'bg-red-100 text-red-700' :
                    wolseResult.trend.direction.includes('DECLINING') ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {wolseResult.trend.direction.replace('_', ' ')}
                  </span>
                  <span className="text-[#4A5568]">{wolseResult.trend.advice}</span>
                </div>
              </div>

              {/* Savings Potential */}
              {wolseResult.savingsPotential.vsMarket > 0 && (
                <div className="bg-green-50 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-green-700 mb-2">💰 Potential Savings</h4>
                  <p className="text-green-600">
                    If negotiated to market rate: <strong>{formatWon(wolseResult.savingsPotential.vsMarket * 12)}/year</strong>
                  </p>
                </div>
              )}

              {/* Negotiation Options */}
              {wolseResult.negotiationOptions && wolseResult.negotiationOptions.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-amber-700 mb-3">🤝 Negotiation Tips</h4>
                  <div className="space-y-3">
                    {wolseResult.negotiationOptions.map((option, i) => (
                      <div key={i} className="bg-white rounded-lg p-3">
                        <p className="font-medium text-[#1A202C]">{option.name}</p>
                        <p className="text-sm text-[#4A5568]">
                          Deposit: {formatWon(option.deposit)} → Rent: {formatWon(option.monthlyRent)}/month
                          {option.monthlySavings > 0 && ` (Save ${formatWon(option.monthlySavings)}/month)`}
                        </p>
                        {option.script && (
                          <p className="mt-2 text-sm italic text-amber-700 bg-amber-50 p-2 rounded">
                            "{option.script}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {wolseResult.recentTransactions && wolseResult.recentTransactions.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-[#1A202C] mb-3">📊 Recent Transactions ({wolseResult.contractCount} total)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[#718096]">
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Floor</th>
                          <th className="pb-2">Deposit</th>
                          <th className="pb-2">Rent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wolseResult.recentTransactions.slice(0, 5).map((tx, i) => (
                          <tr key={i} className="border-t border-gray-200">
                            <td className="py-2">{tx.year}.{tx.month}.{tx.day}</td>
                            <td className="py-2">{tx.floor}F</td>
                            <td className="py-2">{formatWon(tx.deposit)}</td>
                            <td className="py-2">{formatWon(tx.monthlyRent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Data Quality */}
              <div className="flex items-center justify-center gap-6 text-sm text-[#718096] mt-6">
                <span>Data Quality: {wolseResult.confidenceLevel}</span>
                <span>•</span>
                <span>{wolseResult.contractCount} contracts analyzed</span>
                {wolseResult.cleanTransactionCount && (
                  <>
                    <span>•</span>
                    <span>{wolseResult.cleanTransactionCount} clean transactions used</span>
                  </>
                )}
              </div>
            </div>

            {/* Pricing Footer */}
            <div className="text-center py-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-100">
              <p className="text-[#718096] mb-2">Full Rental Check</p>
              <p className="text-2xl font-bold text-[#1A202C]">
                <span className="line-through text-[#718096] text-lg mr-2">₩19,900</span>
                FREE
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">BETA</span>
              </p>
            </div>

            {/* New Analysis Button */}
            <div className="text-center">
              <button
                onClick={handleNewAnalysis}
                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-green-200/50 transition-all hover:-translate-y-1"
              >
                Run Another Analysis
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="relative z-10 bg-green-50 border-t border-green-100 py-8 mt-16">
        <div className="container mx-auto px-6 max-w-4xl text-center text-[#4A5568] text-sm">
          <p>Data source: MOLIT Real Transaction Price API (국토교통부 실거래가 공개시스템)</p>
          <p className="mt-2">Deposit safety estimates based on Seoul apartment market averages</p>
        </div>
      </footer>
    </div>
  );
}
