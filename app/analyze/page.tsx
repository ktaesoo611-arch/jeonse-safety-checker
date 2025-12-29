'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import Link from 'next/link';
import { SEOUL_DISTRICTS, Apartment } from '@/lib/data/address-data';
import { analytics } from '@/lib/analytics';

export default function AnalyzePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    city: '서울특별시',
    district: '',
    dong: '',
    building: '',
    proposedJeonse: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apartmentSearch, setApartmentSearch] = useState('');
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  const [debugInfo, setDebugInfo] = useState('');

  // Get available dongs for selected district
  const availableDongs = useMemo(() => {
    if (!formData.district) return [];
    const selectedDistrict = SEOUL_DISTRICTS.find(d => d.name === formData.district);
    return selectedDistrict?.dongs || [];
  }, [formData.district]);

  // Fetch apartments from API when search query or filters change
  useEffect(() => {
    const fetchApartments = async () => {
      try {
        const params = new URLSearchParams();
        if (apartmentSearch) params.append('q', apartmentSearch);
        if (formData.dong) params.append('dong', formData.dong);
        if (formData.district) params.append('district', formData.district);
        params.append('limit', '20');

        setDebugInfo(`Fetching... params: ${params.toString()}`);
        const response = await fetch(`/api/apartments?${params.toString()}`);
        const data = await response.json();
        setDebugInfo(`Got ${data.apartments?.length || 0} results. Success: ${data.success}`);

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

  // Format number with commas for display
  const formatNumber = (value: string) => {
    const num = value.replace(/,/g, '');
    if (!num || isNaN(parseInt(num))) return value;
    return parseInt(num).toLocaleString();
  };

  // Parse formatted number back to raw
  const parseNumber = (value: string) => {
    return value.replace(/,/g, '');
  };

  // Format amount in Korean units (만원, 억원)
  const formatKoreanAmount = (value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num <= 0) return null;

    const eok = Math.floor(num / 100000000); // 억
    const man = Math.floor((num % 100000000) / 10000); // 만

    if (eok > 0 && man > 0) {
      return `${eok}억 ${man.toLocaleString()}만원`;
    } else if (eok > 0) {
      return `${eok}억원`;
    } else if (man > 0) {
      return `${man.toLocaleString()}만원`;
    }
    return `${num.toLocaleString()}원`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.district) newErrors.district = 'Please select a district';
    if (!formData.dong) newErrors.dong = 'Please select a dong (neighborhood)';
    if (!formData.building) newErrors.building = 'Please enter building name';
    if (!formData.proposedJeonse) newErrors.proposedJeonse = 'Please enter deposit amount';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      // Create formatted address: 서울특별시 강남구 역삼동
      const address = `${formData.city} ${formData.district} ${formData.dong}`;

      // Create analysis with structured address data
      const response = await fetch('/api/analysis/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          city: formData.city,
          district: formData.district,
          dong: formData.dong,
          building: formData.building,
          proposedJeonse: parseInt(formData.proposedJeonse)
        })
      });

      const data = await response.json();

      if (response.ok && data.analysisId) {
        // Track analysis started
        analytics.analysisStarted('jeonse', data.analysisId);
        // Go directly to upload (payment happens after preview)
        router.push(`/analyze/${data.analysisId}/upload`);
      } else {
        alert('Analysis creation failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3748] selection:bg-amber-200 selection:text-amber-900">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 right-[10%] w-64 h-64 bg-amber-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[30%] left-[5%] w-48 h-48 bg-orange-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/analyze/wolse"
              className="text-[#4A5568] hover:text-orange-600 font-medium transition-colors"
            >
              Wolse Price
            </Link>
            <Link
              href="/analyze/full"
              className="text-[#4A5568] hover:text-green-600 font-medium transition-colors"
            >
              Full Wolse
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-6 py-16 max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href="/" className="text-amber-600 hover:text-amber-700 font-medium inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-full text-sm font-semibold mb-6 border border-amber-200">
            <span>Deposit Safety</span>
            <span className="text-amber-400">|</span>
            <span>Step 1 of 3</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Start your safety analysis
          </h1>
          <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
            Select the property location for accurate market price data
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-amber-900/5 border border-amber-100">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* City */}
            <div>
              <Select
                label="City *"
                value={formData.city}
                onChange={(value) => setFormData({ ...formData, city: value })}
                options={[{ value: '서울특별시', label: '서울특별시 (Seoul)' }]}
                helperText="Currently supporting Seoul only"
                className="text-lg"
              />
            </div>

            {/* District (구) */}
            <div>
              <Select
                label="District (구) *"
                value={formData.district}
                onChange={handleDistrictChange}
                options={SEOUL_DISTRICTS.map(d => ({ value: d.name, label: `${d.name} (${d.nameEn})` }))}
                placeholder="Select a district"
                error={errors.district}
                helperText="Select the district where the property is located"
                className="text-lg"
              />
            </div>

            {/* Neighborhood (동) */}
            <div>
              <Select
                label="Neighborhood (동) *"
                value={formData.dong}
                onChange={(value) => setFormData({ ...formData, dong: value })}
                options={availableDongs.map(dong => ({ value: dong.name, label: `${dong.name} (${dong.nameEn})` }))}
                placeholder="Select district first"
                error={errors.dong}
                disabled={!formData.district}
                helperText="Select the neighborhood (dong)"
                className="text-lg"
              />
            </div>

            {/* Building Name with Autocomplete */}
            <div className="relative">
              <Input
                label="Building / Apartment Name *"
                placeholder="Type to search: e.g., 개봉동아이파크, Raemian, Gaepo I-Park"
                value={formData.building || apartmentSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  if (formData.building) {
                    // Clear building and start search
                    setFormData({ ...formData, building: '' });
                  }
                  setApartmentSearch(value);
                }}
                error={errors.building}
                helperText="Select from list or type custom name (supports Korean and English)"
                className="text-lg"
              />

              {/* Autocomplete dropdown */}
              {apartmentSearch && !formData.building && (
                <div className="absolute z-10 w-full mt-2 bg-white border-2 border-amber-200 rounded-2xl shadow-lg max-h-64 overflow-y-auto">
                  {filteredApartments.length > 0 ? (
                    <>
                      {filteredApartments.map((apt, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleApartmentSelect(apt.name)}
                          className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors border-b border-amber-100 last:border-0"
                        >
                          <div className="font-semibold text-[#2D3748]">{apt.name}</div>
                          <div className="text-sm text-[#718096]">{apt.nameEn}</div>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => handleApartmentSelect(apartmentSearch)}
                        className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors border-t-2 border-amber-200 bg-amber-50/50"
                      >
                        <div className="font-semibold text-amber-600">Use custom name: "{apartmentSearch}"</div>
                        <div className="text-sm text-[#718096]">If your building isn't listed above</div>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApartmentSelect(apartmentSearch)}
                      className="w-full px-4 py-4 text-left hover:bg-amber-50 transition-colors"
                    >
                      <div className="font-semibold text-amber-600">Use "{apartmentSearch}"</div>
                      <div className="text-sm text-[#718096]">No matches found - click to use this custom name</div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Deposit Amount */}
            <div>
              <Input
                label="Deposit Amount (KRW) *"
                placeholder="500,000,000"
                value={formatNumber(formData.proposedJeonse)}
                onChange={(e) => setFormData({ ...formData, proposedJeonse: parseNumber(e.target.value) })}
                error={errors.proposedJeonse}
                helperText="Enter in Korean won (₩). Example: 5억원 = 500,000,000"
                className="text-lg"
              />
              {formData.proposedJeonse && formatKoreanAmount(formData.proposedJeonse) && (
                <p className="mt-2 text-base text-amber-600 font-semibold">
                  = {formatKoreanAmount(formData.proposedJeonse)}
                </p>
              )}
            </div>

            {/* Submit */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to upload
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-[#2D3748] mb-2 text-lg">Structured address</h3>
            <p className="text-[#718096] text-sm leading-relaxed">
              Using dropdowns ensures we find accurate market transaction data
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-bold text-[#2D3748] mb-2 text-lg">Deposit amount</h3>
            <p className="text-[#718096] text-sm leading-relaxed">
              Enter in Korean won. We'll show the amount in 억/만원 format
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-amber-100 shadow-sm hover:shadow-lg hover:shadow-amber-100/50 hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="font-bold text-[#2D3748] mb-2 text-lg">Next step</h3>
            <p className="text-[#718096] text-sm leading-relaxed">
              After this, you'll upload your register document (등기부등본) PDF
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
