'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SEOUL_DISTRICTS, GYEONGGI_DISTRICTS, SUPPORTED_CITIES, getDistrictsByCity, Apartment } from '@/lib/data/address-data';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { analytics } from '@/lib/analytics';

type RentalType = 'jeonse' | 'wolse';

export default function PropertyInfoPage() {
  const router = useRouter();
  const params = useParams();
  const haptic = useHaptic();

  const type = params.type as string;

  // Validate type
  if (type !== 'jeonse' && type !== 'wolse') {
    notFound();
  }

  const rentalType: RentalType = type as RentalType;
  const isWolse = rentalType === 'wolse';
  const accentColor = isWolse ? 'orange' : 'amber';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [freeUnlocksRemaining, setFreeUnlocksRemaining] = useState<number | null>(null);

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

  useEffect(() => {
    setMounted(true);

    // Fetch beta counter
    fetch('/api/beta/counter')
      .then(res => res.json())
      .then(data => {
        if (typeof data.remaining === 'number') {
          setFreeUnlocksRemaining(data.remaining);
        }
      })
      .catch(() => setFreeUnlocksRemaining(47));
  }, []);

  // Get available districts for selected city
  const availableDistricts = useMemo(() => {
    return getDistrictsByCity(formData.city);
  }, [formData.city]);

  // Get available dongs for selected district
  const availableDongs = useMemo(() => {
    if (!formData.district) return [];
    const selectedDistrict = availableDistricts.find(d => d.name === formData.district);
    return selectedDistrict?.dongs || [];
  }, [formData.district, availableDistricts]);

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

  const handleCityChange = (city: string) => {
    setFormData({ ...formData, city, district: '', dong: '', building: '' });
    setApartmentSearch('');
  };

  const handleDistrictChange = (district: string) => {
    setFormData({ ...formData, district, dong: '' });
  };

  const handleApartmentSelect = (apartmentName: string) => {
    setFormData({ ...formData, building: apartmentName });
    setApartmentSearch('');
  };

  const formatNumber = (value: string) => {
    const num = value.replace(/,/g, '');
    if (!num || isNaN(parseInt(num))) return value;
    return parseInt(num).toLocaleString();
  };

  const parseNumber = (value: string) => {
    return value.replace(/,/g, '');
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    haptic.medium();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.district) newErrors.district = 'Please select a district';
    if (!formData.dong) newErrors.dong = 'Please select a neighborhood';
    if (!formData.building) newErrors.building = 'Please enter building name';
    if (!formData.deposit) newErrors.deposit = 'Please enter deposit amount';

    if (isWolse) {
      if (!formData.monthlyRent) newErrors.monthlyRent = 'Please enter monthly rent';
    }
    if (!formData.exclusiveArea) newErrors.exclusiveArea = 'Please enter exclusive area';

    const exclusiveArea = parseFloat(formData.exclusiveArea);
    const deposit = parseInt(parseNumber(formData.deposit));
    const monthlyRent = parseInt(parseNumber(formData.monthlyRent));

    if (formData.exclusiveArea && (isNaN(exclusiveArea) || exclusiveArea <= 0)) {
      newErrors.exclusiveArea = 'Please enter a valid area';
    }
    if (formData.deposit && (isNaN(deposit) || deposit <= 0)) {
      newErrors.deposit = 'Please enter a valid deposit amount';
    }
    if (isWolse && formData.monthlyRent && (isNaN(monthlyRent) || monthlyRent <= 0)) {
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
      const address = `${formData.city} ${formData.district} ${formData.dong}`;

      const response = await fetch('/api/analysis/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Explicitly include cookies
        body: JSON.stringify({
          address,
          city: formData.city,
          district: formData.district,
          dong: formData.dong,
          building: formData.building,
          proposedJeonse: deposit,
          analysisType: rentalType,
          exclusiveArea: exclusiveArea || undefined,
          monthlyRent: isWolse ? monthlyRent : undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.analysisId) {
        // Store form data in session storage for later use
        sessionStorage.setItem(`analysis-${data.analysisId}`, JSON.stringify({
          type: rentalType,
          city: formData.city,
          district: formData.district,
          dong: formData.dong,
          building: formData.building,
          exclusiveArea: exclusiveArea || null,
          deposit,
          monthlyRent: isWolse ? monthlyRent : null
        }));

        analytics.analysisStarted(rentalType, data.analysisId);
        haptic.success();
        router.push(`/analyze/${rentalType}/${data.analysisId}/upload`);
      } else {
        throw new Error(data.error || 'Failed to create analysis');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      haptic.error();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className={`absolute top-20 right-[10%] w-96 h-96 ${isWolse ? 'bg-orange-200/20' : 'bg-amber-200/20'} rounded-full blur-3xl`} />
        <div className={`absolute bottom-[20%] left-[5%] w-72 h-72 ${isWolse ? 'bg-amber-200/20' : 'bg-orange-200/20'} rounded-full blur-3xl`} />
      </div>

      {/* Header */}
      <header className={`relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-${accentColor}-100`}>
        <div className="container mx-auto px-6 py-4 max-w-7xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className={`w-10 h-10 bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-600' : 'from-amber-500 to-orange-600'} rounded-xl flex items-center justify-center shadow-lg shadow-${accentColor}-200 group-hover:scale-105 transition-transform`}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
        </div>
      </header>

      <div className={`relative z-10 container mx-auto px-6 py-12 max-w-3xl transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href="/check" className={`text-${accentColor}-600 hover:text-${accentColor}-700 font-medium inline-flex items-center gap-2 group`}>
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center mb-12">
          <div className={`inline-flex items-center gap-2 px-4 py-2 bg-${accentColor}-50 text-${accentColor}-700 rounded-full text-sm font-semibold mb-6 border border-${accentColor}-200`}>
            <span>{isWolse ? 'Wolse' : 'Jeonse'} Check</span>
            <span className={`text-${accentColor}-400`}>|</span>
            <span>Step 1 of 4</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight">
            Property Information
          </h1>
          <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
            {isWolse
              ? 'Enter your property details and rental terms for a complete analysis'
              : 'Enter your property details for deposit safety analysis'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Form Card */}
        <div className={`bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-${accentColor}-900/5 border border-${accentColor}-100`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Location Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#1A202C] flex items-center gap-2">
                <span className={`w-8 h-8 bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm`}>1</span>
                Property Location
              </h3>

              <Select
                label="City / Province"
                value={formData.city}
                onChange={handleCityChange}
                options={SUPPORTED_CITIES.map(c => ({ value: c.name, label: `${c.name} (${c.nameEn})` }))}
                helperText="Seoul and Gyeonggi Province supported"
              />

              <Select
                label="District (구/시) *"
                value={formData.district}
                onChange={handleDistrictChange}
                options={availableDistricts.map(d => ({ value: d.name, label: `${d.name} (${d.nameEn})` }))}
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
            <div className={`space-y-4 pt-4 border-t border-${accentColor}-100`}>
              <h3 className="text-lg font-semibold text-[#1A202C] flex items-center gap-2">
                <span className={`w-8 h-8 bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm`}>2</span>
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
                  <div className={`absolute z-10 w-full mt-2 bg-white border-2 border-${accentColor}-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto`}>
                    {filteredApartments.length > 0 ? (
                      <>
                        {filteredApartments.map((apt, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleApartmentSelect(apt.name)}
                            className={`w-full px-4 py-3 text-left hover:bg-${accentColor}-50 transition-colors border-b border-${accentColor}-100 last:border-0`}
                          >
                            <div className="font-semibold text-[#1A202C]">{apt.name}</div>
                            <div className="text-sm text-[#718096]">{apt.nameEn}</div>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleApartmentSelect(apartmentSearch)}
                          className={`w-full px-4 py-3 text-left hover:bg-${accentColor}-50 transition-colors border-t-2 border-${accentColor}-200 bg-${accentColor}-50/50`}
                        >
                          <div className={`font-semibold text-${accentColor}-600`}>Use custom: "{apartmentSearch}"</div>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApartmentSelect(apartmentSearch)}
                        className={`w-full px-4 py-4 text-left hover:bg-${accentColor}-50 transition-colors`}
                      >
                        <div className={`font-semibold text-${accentColor}-600`}>Use "{apartmentSearch}"</div>
                        <div className="text-sm text-[#718096]">No matches found</div>
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Rental Terms Section */}
            <div className={`space-y-4 pt-4 border-t border-${accentColor}-100`}>
              <h3 className="text-lg font-semibold text-[#1A202C] flex items-center gap-2">
                <span className={`w-8 h-8 bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm`}>3</span>
                {isWolse ? 'Your Rental Quote' : 'Deposit Amount'}
              </h3>

              <div>
                <Input
                  label={isWolse ? "Deposit (보증금) *" : "Deposit Amount (KRW) *"}
                  placeholder={isWolse ? "50,000,000" : "500,000,000"}
                  value={formatNumber(formData.deposit)}
                  onChange={(e) => setFormData({ ...formData, deposit: parseNumber(e.target.value) })}
                  error={errors.deposit}
                  helperText="Enter in Korean won (₩)"
                />
                {formData.deposit && formatKoreanAmount(formData.deposit) && (
                  <p className={`mt-1 text-sm text-${accentColor}-600 font-medium`}>
                    = {formatKoreanAmount(formData.deposit)}
                  </p>
                )}
              </div>

              {isWolse && (
                <div>
                  <Input
                    label="Monthly Rent (월세) *"
                    placeholder="1,500,000"
                    value={formatNumber(formData.monthlyRent)}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: parseNumber(e.target.value) })}
                    error={errors.monthlyRent}
                    helperText="Enter in Korean won (₩)"
                  />
                  {formData.monthlyRent && formatKoreanAmount(formData.monthlyRent) && (
                    <p className={`mt-1 text-sm text-${accentColor}-600 font-medium`}>
                      = {formatKoreanAmount(formData.monthlyRent)}/month
                    </p>
                  )}
                </div>
              )}

              <div>
                <Input
                  label="Exclusive Area (전용면적) *"
                  placeholder="84.5"
                  value={formData.exclusiveArea}
                  onChange={(e) => setFormData({ ...formData, exclusiveArea: e.target.value.replace(/[^0-9.]/g, '') })}
                  error={errors.exclusiveArea}
                  helperText="Enter in ㎡ (e.g., 84.5). Check your contract or property listing."
                />
                {formData.exclusiveArea && !isNaN(parseFloat(formData.exclusiveArea)) && (
                  <p className={`mt-1 text-sm text-${accentColor}-600 font-medium`}>
                    = {(parseFloat(formData.exclusiveArea) / 3.306).toFixed(1)}평
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className={`w-full px-8 py-4 bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-${accentColor}-200/50 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating Analysis...
                  </>
                ) : (
                  <>
                    Continue to Document Upload
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Free Beta Info */}
        {freeUnlocksRemaining !== null && freeUnlocksRemaining > 0 && (
          <div className={`text-center p-4 bg-red-50 rounded-2xl border border-red-100`}>
            <p className="text-[#4A5568] flex items-center justify-center gap-2">
              <span className="text-lg">🔥</span>
              <span><span className="font-bold text-red-600">{freeUnlocksRemaining}</span> free reports remaining</span>
            </p>
            <p className="text-sm text-[#718096] mt-1">
              Includes risk analysis, market position, and action items
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
