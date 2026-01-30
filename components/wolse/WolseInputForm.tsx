'use client';

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SUPPORTED_CITIES, getDistrictsByCity, Apartment } from '@/lib/data/address-data';

interface WolseInputFormProps {
  onSubmit: (data: WolseFormData) => void;
  loading?: boolean;
}

export interface WolseFormData {
  city: string;
  district: string;
  dong: string;
  apartmentName: string;
  exclusiveArea: number;
  deposit: number;
  monthlyRent: number;
}

export function WolseInputForm({ onSubmit, loading }: WolseInputFormProps) {
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

  // Reset district and dong when city changes
  const handleCityChange = (city: string) => {
    setFormData({ ...formData, city, district: '', dong: '', building: '' });
    setApartmentSearch('');
  };

  // Reset dong when district changes
  const handleDistrictChange = (district: string) => {
    setFormData({ ...formData, district, dong: '' });
  };

  // Handle apartment selection
  const handleApartmentSelect = (apartmentName: string) => {
    setFormData({ ...formData, building: apartmentName });
    setApartmentSearch('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};

    if (!formData.district) newErrors.district = 'Please select a district';
    if (!formData.dong) newErrors.dong = 'Please select a dong (neighborhood)';
    if (!formData.building) newErrors.building = 'Please enter building name';
    if (!formData.exclusiveArea) newErrors.exclusiveArea = 'Please enter area';
    if (!formData.deposit) newErrors.deposit = 'Please enter deposit amount';
    if (!formData.monthlyRent) newErrors.monthlyRent = 'Please enter monthly rent';

    // Validate numbers
    const exclusiveArea = parseFloat(formData.exclusiveArea);
    const deposit = parseInt(formData.deposit);
    const monthlyRent = parseInt(formData.monthlyRent);

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
      return;
    }

    onSubmit({
      city: formData.city,
      district: formData.district,
      dong: formData.dong,
      apartmentName: formData.building,
      exclusiveArea,
      deposit,
      monthlyRent
    });
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Location Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#1A202C] flex items-center gap-2">
          <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">1</span>
          Property Location
        </h3>

        {/* City */}
        <Select
          label="City / Province"
          value={formData.city}
          onChange={handleCityChange}
          options={SUPPORTED_CITIES.map(c => ({ value: c.name, label: `${c.name} (${c.nameEn})` }))}
          helperText="Seoul and Gyeonggi Province supported"
        />

        {/* District (구/시) */}
        <Select
          label="District (구/시) *"
          value={formData.district}
          onChange={handleDistrictChange}
          options={availableDistricts.map(d => ({ value: d.name, label: `${d.name} (${d.nameEn})` }))}
          placeholder="Select a district"
          error={errors.district}
        />

        {/* Neighborhood (동) */}
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
      <div className="space-y-4 pt-4 border-t border-amber-100">
        <h3 className="text-lg font-semibold text-[#1A202C] flex items-center gap-2">
          <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">2</span>
          Building Details
        </h3>

        {/* Building Name */}
        <div className="relative">
          <Input
            label="Building Name *"
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

          {/* Autocomplete dropdown */}
          {apartmentSearch && !formData.building && (
            <div className="absolute z-10 w-full mt-2 bg-white border-2 border-amber-200 rounded-2xl shadow-xl shadow-amber-900/10 max-h-64 overflow-y-auto">
              {filteredApartments.length > 0 ? (
                <>
                  {filteredApartments.map((apt, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleApartmentSelect(apt.name)}
                      className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors border-b border-amber-100 last:border-0"
                    >
                      <div className="font-semibold text-[#1A202C]">{apt.name}</div>
                      <div className="text-sm text-[#718096]">{apt.nameEn}</div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleApartmentSelect(apartmentSearch)}
                    className="w-full px-4 py-3 text-left hover:bg-amber-50 transition-colors border-t-2 border-amber-200 bg-amber-50/50"
                  >
                    <div className="font-semibold text-amber-600">Use custom: "{apartmentSearch}"</div>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleApartmentSelect(apartmentSearch)}
                  className="w-full px-4 py-4 text-left hover:bg-amber-50 transition-colors"
                >
                  <div className="font-semibold text-amber-600">Use "{apartmentSearch}"</div>
                  <div className="text-sm text-[#718096]">No matches found</div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Exclusive Area */}
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
      <div className="space-y-4 pt-4 border-t border-amber-100">
        <h3 className="text-lg font-semibold text-[#1A202C] flex items-center gap-2">
          <span className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">3</span>
          Your Wolse Quote
        </h3>

        {/* Deposit */}
        <div>
          <Input
            label="Deposit (보증금) *"
            placeholder="50,000,000"
            value={formatNumber(formData.deposit)}
            onChange={(e) => setFormData({ ...formData, deposit: parseNumber(e.target.value) })}
            error={errors.deposit}
            helperText="Enter in won (₩). Example: ₩5,000만원 = 50,000,000"
          />
          {formData.deposit && formatKoreanAmount(formData.deposit) && (
            <p className="mt-1 text-sm text-amber-600 font-medium">
              = {formatKoreanAmount(formData.deposit)}
            </p>
          )}
        </div>

        {/* Monthly Rent */}
        <div>
          <Input
            label="Monthly Rent (월세) *"
            placeholder="1,500,000"
            value={formatNumber(formData.monthlyRent)}
            onChange={(e) => setFormData({ ...formData, monthlyRent: parseNumber(e.target.value) })}
            error={errors.monthlyRent}
            helperText="Enter in won (₩). Example: ₩150만원 = 1,500,000"
          />
          {formData.monthlyRent && formatKoreanAmount(formData.monthlyRent) && (
            <p className="mt-1 text-sm text-amber-600 font-medium">
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
          className="w-full px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-amber-200/50 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze My Quote'
          )}
        </button>
      </div>
    </form>
  );
}
