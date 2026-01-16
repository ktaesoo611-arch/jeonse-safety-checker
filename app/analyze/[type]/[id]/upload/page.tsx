'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { analytics } from '@/lib/analytics';

export default function UploadPage() {
  const router = useRouter();
  const params = useParams();
  const type = params.type as string;
  const analysisId = params.id as string;

  // Validate type
  if (type !== 'jeonse' && type !== 'wolse') {
    notFound();
  }

  const isWolse = type === 'wolse';
  const accentColor = isWolse ? 'orange' : 'amber';

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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

      // Upload via server API (bypasses RLS for anonymous users)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('analysisId', analysisId);
      formData.append('documentType', 'deunggibu');

      setUploadProgress(20);

      const uploadResponse = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const uploadData = await uploadResponse.json();
      setUploadProgress(70);

      // Track document upload
      analytics.documentUploaded(analysisId, 'deunggibu');

      // Start parsing and analysis (run in background)
      fetch('/api/documents/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: uploadData.documentId })
      }).catch(err => console.error('Parse request error:', err));

      setUploadProgress(100);

      // Redirect to processing page (shows progress bar while analysis runs)
      router.push(`/analyze/${type}/${analysisId}/processing`);

    } catch (error: any) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
      alert(`Upload failed: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FEF7ED] via-[#FDFBF7] to-[#F5F0E8]" />
        <div className={`absolute top-20 right-[10%] w-64 h-64 ${isWolse ? 'bg-orange-200/20' : 'bg-amber-200/20'} rounded-full blur-3xl`} />
        <div className={`absolute bottom-[30%] left-[5%] w-48 h-48 ${isWolse ? 'bg-amber-200/20' : 'bg-orange-200/20'} rounded-full blur-3xl`} />
      </div>

      {/* Header */}
      <header className="relative z-10 bg-[#FDFBF7]/80 backdrop-blur-md border-b border-amber-100">
        <div className="container mx-auto px-6 py-4 max-w-7xl">
          <Link href="/" className="flex items-center gap-3 group">
            <div className={`w-10 h-10 bg-gradient-to-br ${isWolse ? 'from-orange-500 to-amber-600' : 'from-amber-500 to-orange-600'} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform`}>
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
          <Link href={`/analyze/${type}`} className={`text-${accentColor}-600 hover:text-${accentColor}-700 font-medium inline-flex items-center gap-2 group`}>
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
            <span>Step 2 of 4</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#1A202C] mb-4 tracking-tight">
            Upload Register Document
          </h1>
          <p className="text-xl text-[#4A5568] max-w-2xl mx-auto">
            Upload the PDF register document (등기부등본) from iros.go.kr
          </p>
        </div>

        {/* Upload Card */}
        <div className={`bg-white rounded-3xl p-8 mb-8 shadow-xl shadow-${accentColor}-900/5 border border-${accentColor}-100`}>
          {/* Upload Area */}
          <div
            className={`
              relative border-3 border-dashed rounded-2xl p-16 text-center transition-all duration-200 cursor-pointer
              ${dragActive ? `border-${accentColor}-500 bg-${accentColor}-50/50 scale-[1.02]` : `border-${accentColor}-200 hover:border-${accentColor}-400 hover:bg-${accentColor}-50/30`}
              ${file ? `bg-${accentColor}-50 border-${accentColor}-500 border-solid` : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && document.getElementById('file-upload')?.click()}
          >
            {file ? (
              <div className="space-y-6">
                <div className={`w-20 h-20 mx-auto bg-gradient-to-br from-${accentColor}-100 to-orange-100 rounded-2xl flex items-center justify-center`}>
                  <svg className={`w-10 h-10 text-${accentColor}-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-2xl font-bold text-${accentColor}-900 mb-2`}>
                    File selected
                  </h3>
                  <p className={`text-${accentColor}-700 font-medium text-lg mb-2`}>{file.name}</p>
                  <p className="text-[#4A5568]">
                    Size: {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className={`mt-4 px-6 py-2.5 bg-${accentColor}-100 text-${accentColor}-700 font-semibold rounded-xl hover:bg-${accentColor}-200 transition-colors`}
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className={`w-20 h-20 mx-auto bg-gradient-to-br from-${accentColor}-100 to-orange-100 rounded-2xl flex items-center justify-center`}>
                  <svg className={`w-10 h-10 text-${accentColor}-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className={`mt-8 pt-8 border-t border-${accentColor}-100`}>
              {isUploading && (
                <div className="mb-4">
                  <div className={`h-2 bg-${accentColor}-100 rounded-full overflow-hidden`}>
                    <div
                      className={`h-full bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} transition-all duration-300`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-[#4A5568] mt-2 text-center">
                    {uploadProgress < 50 ? 'Uploading...' : uploadProgress < 100 ? 'Processing...' : 'Complete!'} {uploadProgress}%
                  </p>
                </div>
              )}
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className={`w-full px-8 py-4 bg-gradient-to-r ${isWolse ? 'from-orange-500 to-amber-500' : 'from-amber-500 to-orange-500'} text-white font-semibold text-lg rounded-2xl hover:shadow-xl transition-all hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-3`}
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Preview
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* How to Get Document */}
        <div className={`bg-gradient-to-br ${isWolse ? 'from-orange-900 to-amber-950' : 'from-amber-900 to-orange-950'} rounded-3xl p-8 text-white shadow-xl`}>
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            How to get 등기부등본
          </h3>
          <ol className="space-y-4">
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">1</span>
              <div>
                <p className="font-semibold text-amber-100">Visit iros.go.kr</p>
                <p className="text-amber-50/80">Internet Register Office (인터넷등기소)</p>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">2</span>
              <div>
                <p className="font-semibold text-amber-100">Click 부동산</p>
                <p className="text-amber-50/80">Select building register</p>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">3</span>
              <div>
                <p className="font-semibold text-amber-100">Search by address</p>
                <p className="text-amber-50/80">Enter property address</p>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">4</span>
              <div>
                <p className="font-semibold text-amber-100">Download PDF (₩1,000)</p>
                <p className="text-amber-50/80"><span className="font-bold text-yellow-200">Check 등기사항요약</span> before download</p>
              </div>
            </li>
          </ol>

          <a
            href="https://www.iros.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-white text-amber-900 font-semibold rounded-xl hover:bg-amber-50 transition-all hover:scale-105 shadow-lg"
          >
            Visit iros.go.kr
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
