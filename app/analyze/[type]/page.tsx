'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { analytics } from '@/lib/analytics';

type RentalType = 'jeonse' | 'wolse';

interface AddressData {
  fullAddress: string;
  jibunAddress: string;
  sido: string;
  sigungu: string;
  bname: string;           // 동/읍/면/리 name (e.g., "광명동")
  buildingName: string;
  zonecode: string;
  lotNumber?: string;      // 지번 (e.g., "123-45")
  roadName?: string;       // 도로명 (e.g., "새터로")
  roadBuildingNumber?: string; // 도로명 건물번호 (e.g., "44-7")
}

export default function SimplifiedAnalysisPage() {
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

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  // Form state
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [unitNumber, setUnitNumber] = useState(''); // 동/호수 input
  const [deposit, setDeposit] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');

  // Kakao Postcode popup
  const openPostcode = useDaumPostcodePopup();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddressSearch = () => {
    openPostcode({
      onComplete: (data) => {
        // Extract address components
        let fullAddress = data.roadAddress || data.jibunAddress;

        // Add building name if exists
        if (data.buildingName) {
          fullAddress += ` (${data.buildingName})`;
        }

        // Extract lot number (지번) from jibunAddress
        // Format: "경기 광명시 광명동 123-45" -> "123-45"
        let lotNumber = '';
        const jibunMatch = data.jibunAddress?.match(/(\d+(?:-\d+)?)\s*$/);
        if (jibunMatch) {
          lotNumber = jibunMatch[1];
        }

        // Extract road name and building number from roadAddress
        // Format: "경기 광명시 새터로 44-7" -> roadName: "새터로", buildingNumber: "44-7"
        let roadName = '';
        let roadBuildingNumber = '';
        if (data.roadAddress) {
          // data.roadname contains just the road name
          roadName = data.roadname || '';
          // Extract building number from road address
          const roadMatch = data.roadAddress.match(/(\d+(?:-\d+)?)\s*$/);
          if (roadMatch) {
            roadBuildingNumber = roadMatch[1];
          }
        }

        setAddressData({
          fullAddress,
          jibunAddress: data.jibunAddress,
          sido: data.sido,
          sigungu: data.sigungu,
          bname: data.bname,
          buildingName: data.buildingName || '',
          zonecode: data.zonecode,
          lotNumber,
          roadName,
          roadBuildingNumber,
        });

        haptic.light();
      },
    });
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
    if (!addressData) {
      setError('Please search and select an address');
      haptic.error();
      return;
    }

    const depositNum = parseInt(parseNumber(deposit));
    if (!depositNum || depositNum <= 0) {
      setError('Please enter a valid deposit amount');
      haptic.error();
      return;
    }

    if (isWolse) {
      const monthlyRentNum = parseInt(parseNumber(monthlyRent));
      if (!monthlyRentNum || monthlyRentNum <= 0) {
        setError('Please enter a valid monthly rent');
        haptic.error();
        return;
      }
    }

    setLoading(true);
    setError(null);
    setProgress(5);
    setProgressMessage('Creating analysis...');

    try {
      // Build full address with unit number (for display)
      const fullAddressWithUnit = unitNumber
        ? `${addressData.fullAddress} ${unitNumber}`
        : addressData.fullAddress;

      // Build jibun address with unit number (for CODEF lookup - works better with lot numbers)
      const jibunAddressWithUnit = unitNumber
        ? `${addressData.jibunAddress} ${unitNumber}`
        : addressData.jibunAddress;

      // Step 1: Create analysis
      const createResponse = await fetch('/api/analysis/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          address: fullAddressWithUnit, // Full address including building name, 동, 호
          jibunAddress: jibunAddressWithUnit, // Lot-based address for building type detection
          city: addressData.sido,
          district: addressData.sigungu,
          dong: addressData.bname,
          building: addressData.buildingName || undefined,
          // buildingType omitted - auto-detected by backend from Building Registry API
          proposedJeonse: depositNum,
          analysisType: rentalType,
          monthlyRent: isWolse ? parseInt(parseNumber(monthlyRent)) : undefined,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok || !createData.analysisId) {
        // Use detailed message if available (e.g., for unsupported building types)
        throw new Error(createData.message || createData.error || 'Failed to create analysis');
      }

      const analysisId = createData.analysisId;
      console.log(`Analysis created: ${analysisId}`);

      // Parse dong/ho/floor from unit number
      // Supports: "101동 1001호", "제2층 제1호", "2층 1호", "101동 3층 501호"
      let dongNum = '';
      let hoNum = '';
      let floorNum = '';
      if (unitNumber) {
        const dongMatch = unitNumber.match(/(\d+)\s*동/);
        const hoMatch = unitNumber.match(/(\d+)\s*호/);
        const floorMatch = unitNumber.match(/(\d+)\s*층/);
        if (dongMatch) dongNum = dongMatch[1];
        if (hoMatch) hoNum = hoMatch[1];
        if (floorMatch) floorNum = floorMatch[1];
      }

      // Store form data in session storage (including structured address for CODEF)
      // Use detected buildingType from create API response (defaults to 'apartment')
      const detectedBuildingType = createData.buildingType || 'apartment';
      sessionStorage.setItem(`analysis-${analysisId}`, JSON.stringify({
        type: rentalType,
        city: addressData.sido,
        district: addressData.sigungu,
        dongName: addressData.bname,  // 읍면동 name (e.g., "광명동")
        building: addressData.buildingName || null,
        buildingType: detectedBuildingType,
        deposit: depositNum,
        monthlyRent: isWolse ? parseInt(parseNumber(monthlyRent)) : null,
        fullAddress: fullAddressWithUnit,
        jibunAddress: jibunAddressWithUnit,
        // Structured address for CODEF inquiryType='2'
        lotNumber: addressData.lotNumber || null,
        roadName: addressData.roadName || null,
        roadBuildingNumber: addressData.roadBuildingNumber || null,
        dong: dongNum || null,  // 동 number (e.g., "101")
        ho: hoNum || null,      // 호 number (e.g., "1001")
        floor: floorNum || null, // 층 number (e.g., "2")
      }));

      setProgress(50);
      setProgressMessage('Starting analysis...');

      analytics.analysisStarted(rentalType, analysisId);

      // Step 2: Trigger registry lookup + parse in background (non-blocking)
      // Use structured params for CODEF inquiryType='2' (소재지번으로 찾기)
      fetch('/api/registry/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Structured address params for CODEF
          addr_sido: addressData.sido,
          addr_sigungu: addressData.sigungu,
          addr_dong: addressData.bname,
          addr_lotNumber: addressData.lotNumber || undefined,
          buildingName: addressData.buildingName || undefined,
          dong: dongNum || undefined,
          ho: hoNum || undefined,
          floor: floorNum || undefined,
          // Fallback combined address
          address: jibunAddressWithUnit,
          type: '집합건물',
          analysisId,
        }),
      })
        .then(res => res.json())
        .then(lookupData => {
          if (lookupData.success && lookupData.documentId) {
            console.log(`Registry fetched, documentId: ${lookupData.documentId}`);
            analytics.documentUploaded(analysisId, 'deunggibu-auto');
            // Trigger parsing
            return fetch('/api/documents/parse', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentId: lookupData.documentId,
                buildingType: detectedBuildingType,
              }),
            });
          } else {
            console.warn('Registry lookup failed:', lookupData.error);
          }
        })
        .catch(err => console.error('Background registry/parse error:', err));

      haptic.success();
      setProgress(100);
      setProgressMessage('Redirecting...');

      // Redirect to processing page
      router.push(`/analyze/${rentalType}/${analysisId}/processing`);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      haptic.error();
      setLoading(false);
      setProgress(0);
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

      <div className={`relative z-10 container mx-auto px-6 py-12 max-w-2xl transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
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
        <div className="text-center mb-10">
          <div className={`inline-flex items-center gap-2 px-4 py-2 bg-${accentColor}-50 text-${accentColor}-700 rounded-full text-sm font-semibold mb-6 border border-${accentColor}-200`}>
            <span>{isWolse ? 'Wolse' : 'Jeonse'} Check</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight">
            Quick Analysis
          </h1>
          <p className="text-xl text-[#4A5568] max-w-xl mx-auto">
            Enter your property address and rental quote to get a safety analysis
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Form Card */}
        <div className={`bg-white rounded-3xl p-8 shadow-xl shadow-${accentColor}-900/5 border border-${accentColor}-100`}>
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Address Search */}
            <div>
              <label className="block text-sm font-semibold text-[#2D3748] mb-2">
                Property Address *
              </label>
              <div
                onClick={!loading ? handleAddressSearch : undefined}
                className={`
                  w-full px-4 py-4 border-2 rounded-xl cursor-pointer transition-all
                  ${addressData
                    ? `border-${accentColor}-500 bg-${accentColor}-50/50`
                    : `border-${accentColor}-200 hover:border-${accentColor}-400 bg-white`
                  }
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {addressData ? (
                  <div>
                    <div className="font-semibold text-[#1A202C]">{addressData.fullAddress}</div>
                    <div className="text-sm text-[#718096] mt-1">{addressData.zonecode}</div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-[#718096]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Click to search address</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-[#718096] mt-2">
                Search by building name, road name, or jibun address
              </p>
            </div>

            {/* Unit Number (Optional) */}
            {addressData && (
              <div>
                <label className="block text-sm font-semibold text-[#2D3748] mb-2">
                  Unit Number (동/호)
                </label>
                <input
                  type="text"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  placeholder="e.g., 101동 1001호"
                  className={`w-full px-4 py-3 border-2 border-${accentColor}-200 rounded-xl focus:border-${accentColor}-500 focus:ring-2 focus:ring-${accentColor}-200 outline-none transition-all text-[#1A202C] placeholder:text-[#A0AEC0]`}
                  disabled={loading}
                />
                <p className="text-sm text-[#718096] mt-2">
                  Enter your building and unit number for accurate registry lookup
                </p>
              </div>
            )}

            {/* Deposit */}
            <div>
              <label className="block text-sm font-semibold text-[#2D3748] mb-2">
                {isWolse ? 'Deposit (보증금) *' : 'Jeonse Deposit *'}
              </label>
              <input
                type="text"
                value={formatNumber(deposit)}
                onChange={(e) => setDeposit(parseNumber(e.target.value))}
                placeholder={isWolse ? '50,000,000' : '500,000,000'}
                className={`w-full px-4 py-3 border-2 border-${accentColor}-200 rounded-xl focus:border-${accentColor}-500 focus:ring-2 focus:ring-${accentColor}-200 outline-none transition-all text-[#1A202C] placeholder:text-[#A0AEC0]`}
                disabled={loading}
              />
              {deposit && formatKoreanAmount(deposit) && (
                <p className={`mt-2 text-sm text-${accentColor}-600 font-medium`}>
                  = {formatKoreanAmount(deposit)}
                </p>
              )}
            </div>

            {/* Monthly Rent (Wolse only) */}
            {isWolse && (
              <div>
                <label className="block text-sm font-semibold text-[#2D3748] mb-2">
                  Monthly Rent (월세) *
                </label>
                <input
                  type="text"
                  value={formatNumber(monthlyRent)}
                  onChange={(e) => setMonthlyRent(parseNumber(e.target.value))}
                  placeholder="1,500,000"
                  className={`w-full px-4 py-3 border-2 border-${accentColor}-200 rounded-xl focus:border-${accentColor}-500 focus:ring-2 focus:ring-${accentColor}-200 outline-none transition-all text-[#1A202C] placeholder:text-[#A0AEC0]`}
                  disabled={loading}
                />
                {monthlyRent && formatKoreanAmount(monthlyRent) && (
                  <p className={`mt-2 text-sm text-${accentColor}-600 font-medium`}>
                    = {formatKoreanAmount(monthlyRent)}/month
                  </p>
                )}
              </div>
            )}

            {/* Progress Bar */}
            {loading && (
              <div className="pt-4">
                <div className={`h-2 bg-${accentColor}-100 rounded-full overflow-hidden`}>
                  <div
                    className={`h-full bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} transition-all duration-500`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-[#4A5568] mt-2 text-center">
                  {progressMessage} ({progress}%)
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !addressData}
                className={`w-full px-8 py-4 bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-${accentColor}-200/50 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Analyze Safety
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className={`mt-8 p-6 bg-gradient-to-br ${isWolse ? 'from-orange-50 to-amber-50' : 'from-amber-50 to-orange-50'} rounded-2xl border border-${accentColor}-200`}>
          <h3 className="font-semibold text-[#1A202C] mb-3 flex items-center gap-2">
            <svg className={`w-5 h-5 text-${accentColor}-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What happens next?
          </h3>
          <ol className="space-y-2 text-sm text-[#4A5568]">
            <li className="flex items-start gap-2">
              <span className={`flex-shrink-0 w-5 h-5 bg-${accentColor}-200 text-${accentColor}-800 rounded-full flex items-center justify-center text-xs font-bold`}>1</span>
              <span>We automatically fetch the property registry (등기부등본)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={`flex-shrink-0 w-5 h-5 bg-${accentColor}-200 text-${accentColor}-800 rounded-full flex items-center justify-center text-xs font-bold`}>2</span>
              <span>Extract property details, mortgages, and liens</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={`flex-shrink-0 w-5 h-5 bg-${accentColor}-200 text-${accentColor}-800 rounded-full flex items-center justify-center text-xs font-bold`}>3</span>
              <span>Analyze market price and calculate LTV risk</span>
            </li>
            <li className="flex items-start gap-2">
              <span className={`flex-shrink-0 w-5 h-5 bg-${accentColor}-200 text-${accentColor}-800 rounded-full flex items-center justify-center text-xs font-bold`}>4</span>
              <span>Generate your safety report</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
