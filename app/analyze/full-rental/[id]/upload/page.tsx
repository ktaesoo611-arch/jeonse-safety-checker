'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function FullRentalUploadPage() {
  const router = useRouter();
  const params = useParams();
  const analysisId = params.id as string;

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [wolseData, setWolseData] = useState<any>(null);

  // Load wolse data from session storage
  useEffect(() => {
    const storedData = sessionStorage.getItem(`full-rental-${analysisId}`);
    if (storedData) {
      setWolseData(JSON.parse(storedData));
    }
  }, [analysisId]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      } else {
        alert('PDF files only');
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(10);

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${analysisId}/deunggibu_${timestamp}_${sanitizedFileName}`;

      console.log('Uploading to Supabase Storage:', storagePath);
      setUploadProgress(20);

      // Upload directly to Supabase Storage from client
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('File uploaded to storage:', uploadData);
      setUploadProgress(60);

      // Register the upload in database
      const registerResponse = await fetch('/api/documents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId,
          documentType: 'deunggibu',
          fileName: file.name,
          filePath: storagePath,
          fileSize: file.size,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || 'Failed to register document');
      }

      const registerData = await registerResponse.json();
      console.log('Document registered:', registerData);
      setUploadProgress(100);

      // Start parsing in background (don't wait for it)
      fetch('/api/documents/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: registerData.documentId })
      }).catch(err => console.error('Parse request error:', err));

      console.log('Upload complete, redirecting to processing');

      // Redirect to full-rental processing page
      router.push(`/analyze/full-rental/${analysisId}/processing`);

    } catch (error: any) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Warm gradient background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className="absolute top-20 right-[10%] w-64 h-64 bg-green-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[30%] left-[5%] w-48 h-48 bg-emerald-200/20 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-green-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-[#2D3748]">K-Rent Safety</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 container mx-auto px-6 py-16 max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link href="/analyze/full-rental" className="text-green-600 hover:text-green-700 font-medium inline-flex items-center gap-2 group">
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to form
          </Link>
        </div>

        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-semibold mb-6 border border-green-200">
            <span>Full Rental Check</span>
            <span className="text-green-400">|</span>
            <span>Step 2 of 3</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Upload register document
          </h1>
          <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
            Upload the PDF register document (등기부등본) you downloaded from iros.go.kr
          </p>
        </div>

        {/* Rental Summary Card */}
        {wolseData && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 mb-8 border border-green-200">
            <h3 className="font-semibold text-[#1A202C] mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Your rental details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[#718096]">Location</p>
                <p className="font-medium text-[#2D3748]">{wolseData.district} {wolseData.dong}</p>
              </div>
              <div>
                <p className="text-[#718096]">Building</p>
                <p className="font-medium text-[#2D3748]">{wolseData.apartmentName}</p>
              </div>
              <div>
                <p className="text-[#718096]">Deposit</p>
                <p className="font-medium text-[#2D3748]">₩{wolseData.deposit?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[#718096]">Monthly Rent</p>
                <p className="font-medium text-[#2D3748]">₩{wolseData.monthlyRent?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Card */}
        <div className="bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-green-900/5 border border-green-100">
          {/* Upload Area */}
          <div
            className={`
              relative border-3 border-dashed rounded-2xl p-16 text-center transition-all duration-200 cursor-pointer
              ${dragActive ? 'border-green-500 bg-green-50/50 scale-[1.02]' : 'border-green-200 hover:border-green-400 hover:bg-green-50/30'}
              ${file ? 'bg-green-50 border-green-500 border-solid' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && document.getElementById('file-upload')?.click()}
          >
            {file ? (
              <div className="space-y-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-green-900 mb-2">
                    File selected successfully
                  </h3>
                  <p className="text-green-700 font-medium text-lg mb-2">{file.name}</p>
                  <p className="text-[#4A5568]">
                    Size: {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-4 px-6 py-2.5 bg-green-100 text-green-700 font-semibold rounded-xl hover:bg-green-200 transition-colors"
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-emerald-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-[#1A202C] mb-3">
                    Drag and drop your PDF here
                  </h3>
                  <p className="text-[#4A5568] mb-6 text-lg">
                    or click to browse files
                  </p>
                  <p className="text-sm text-[#718096]">
                    Only PDF files accepted
                  </p>
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
              </div>
            )}
          </div>

          {/* Upload Button */}
          {file && (
            <div className="mt-8 pt-8 border-t border-green-100">
              {isUploading && (
                <div className="mb-4">
                  <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-[#4A5568] mt-2 text-center">
                    {uploadProgress}% complete
                  </p>
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold text-lg rounded-2xl hover:shadow-xl hover:shadow-green-200/50 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-3"
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Uploading to server...
                  </>
                ) : (
                  <>
                    Start full analysis
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Analysis Preview */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-semibold text-[#1A202C]">Deposit Safety</h4>
            </div>
            <p className="text-sm text-[#718096]">Property register analysis, debt check, LTV calculation, risk assessment</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-[#1A202C]">Price Check</h4>
            </div>
            <p className="text-sm text-[#718096]">Market comparison, fair price rating, negotiation tips</p>
          </div>
        </div>

        {/* How to Get Document */}
        <div className="bg-gradient-to-br from-green-900 to-emerald-950 rounded-3xl p-8 text-white shadow-xl shadow-green-900/20">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="w-10 h-10 bg-green-100/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            How to get your register document (등기부등본)
          </h3>
          <ol className="space-y-4">
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-green-100/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-green-100">1</span>
              <div>
                <p className="font-semibold text-green-100 mb-1">Visit Internet Register Office</p>
                <p className="text-green-50/80">Go to iros.go.kr (인터넷등기소)</p>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-green-100/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-green-100">2</span>
              <div>
                <p className="font-semibold text-green-100 mb-1">Select building register</p>
                <p className="text-green-50/80">Click 부동산 on main page</p>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-green-100/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-green-100">3</span>
              <div>
                <p className="font-semibold text-green-100 mb-1">Search by address</p>
                <p className="text-green-50/80">Enter the property address and select it from results</p>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-green-100/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-green-100">4</span>
              <div>
                <p className="font-semibold text-green-100 mb-1">Issue with summary (IMPORTANT!)</p>
                <p className="text-green-50/80">Pay ₩700, and <span className="font-bold text-yellow-200">MUST check 등기사항요약 checkbox</span> before downloading PDF</p>
              </div>
            </li>
          </ol>

          <a
            href="https://www.iros.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-white text-green-900 font-semibold rounded-xl hover:bg-green-50 transition-all hover:scale-105 shadow-lg"
          >
            Visit Internet Register Office
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
