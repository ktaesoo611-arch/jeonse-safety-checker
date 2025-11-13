'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';
import { SEOUL_DISTRICTS, SEOUL_APARTMENTS, searchApartments } from '@/lib/data/address-data';

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

  // Get available dongs for selected district
  const availableDongs = useMemo(() => {
    if (!formData.district) return [];
    const selectedDistrict = SEOUL_DISTRICTS.find(d => d.name === formData.district);
    return selectedDistrict?.dongs || [];
  }, [formData.district]);

  // Search apartments based on input, filtered by selected dong
  const filteredApartments = useMemo(() => {
    if (!apartmentSearch) {
      // Show first 20 by default, but filter by dong if selected
      const filtered = formData.dong
        ? SEOUL_APARTMENTS.filter(apt => apt.dong === formData.dong)
        : SEOUL_APARTMENTS;
      return filtered.slice(0, 20);
    }
    // Search with dong/district filter
    return searchApartments(apartmentSearch, formData.dong, formData.district).slice(0, 20);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.district) newErrors.district = 'Please select a district';
    if (!formData.dong) newErrors.dong = 'Please select a dong (neighborhood)';
    if (!formData.building) newErrors.building = 'Please enter building name';
    if (!formData.proposedJeonse) newErrors.proposedJeonse = 'Please enter jeonse amount';

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
        // Redirect to upload page
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <Link href="/" className="text-2xl font-bold text-gray-900 tracking-tight hover:text-emerald-700 transition-colors">
            Pre-sale safety check
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-6 py-16 max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href="/" className="text-emerald-600 hover:text-emerald-700 font-medium inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold mb-6 border border-emerald-100">
            Step 1 of 3
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Start your safety analysis
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select the property location for accurate market price data
          </p>
        </div>

        {/* Form Card */}
        <Card className="mb-8 shadow-xl shadow-gray-900/5 border-0">
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
                <div className="absolute z-10 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {filteredApartments.length > 0 ? (
                    filteredApartments.map((apt, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleApartmentSelect(apt.name)}
                        className="w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <div className="font-semibold text-gray-900">{apt.name}</div>
                        <div className="text-sm text-gray-500">{apt.nameEn}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-sm">
                      No matches found. You can type a custom name.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Jeonse Amount */}
            <div>
              <Input
                label="Jeonse Deposit Amount (₩) *"
                type="number"
                placeholder="500000000"
                value={formData.proposedJeonse}
                onChange={(e) => setFormData({ ...formData, proposedJeonse: e.target.value })}
                error={errors.proposedJeonse}
                helperText="Example: ₩500 million = 500000000"
                className="text-lg"
              />
            </div>

            {/* Submit */}
            <div className="pt-6">
              <Button
                type="submit"
                size="lg"
                className="w-full text-lg py-5"
                loading={loading}
              >
                Continue to document upload →
              </Button>
            </div>
          </form>
        </Card>

        {/* Help Section */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📍</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-lg">Structured address</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Using dropdowns ensures we find accurate market transaction data
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-lg">Deposit amount</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Enter in Korean won. Example: ₩500 million = 500000000
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📄</span>
            </div>
            <h3 className="font-bold text-gray-900 mb-2 text-lg">Next step</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              After this, you'll upload your register document (등기부등본) PDF
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
