'use client';

import { useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import Link from 'next/link';

export default function UploadPage() {
  const router = useRouter();
  const params = useParams();
  const analysisId = params.id as string;

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

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

    // Redirect immediately to processing page
    router.push(`/analyze/${analysisId}/processing?uploadPending=true`);

    // Start upload in background (fire and forget)
    const formData = new FormData();
    formData.append('file', file);
    formData.append('analysisId', analysisId);
    formData.append('documentType', 'deunggibu');

    fetch('/api/documents/upload', {
      method: 'POST',
      body: formData
    })
      .then(response => response.json())
      .then(uploadData => {
        if (uploadData.documentId) {
          // Start parsing
          return fetch('/api/documents/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentId: uploadData.documentId })
          });
        }
        throw new Error('Upload failed');
      })
      .catch(error => {
        console.error('Background upload error:', error);
      });
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
            Step 2 of 3
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight" style={{ letterSpacing: '-0.03em' }}>
            Upload register document
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Upload the PDF register document (등기부등본) you downloaded from iros.go.kr
          </p>
        </div>

        {/* Upload Card */}
        <Card className="mb-8 shadow-xl shadow-gray-900/5 border-0">
          {/* Upload Area */}
          <div
            className={`
              relative border-3 border-dashed rounded-2xl p-16 text-center transition-all duration-200 cursor-pointer
              ${dragActive ? 'border-emerald-500 bg-emerald-50/50 scale-[1.02]' : 'border-gray-300 hover:border-emerald-400 hover:bg-gray-50'}
              ${file ? 'bg-emerald-50 border-emerald-500 border-solid' : ''}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !file && document.getElementById('file-upload')?.click()}
          >
            {file ? (
              <div className="space-y-6">
                <div className="w-20 h-20 mx-auto bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-emerald-900 mb-2">
                    File selected successfully
                  </h3>
                  <p className="text-emerald-700 font-medium text-lg mb-2">{file.name}</p>
                  <p className="text-gray-600">
                    Size: {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="mt-4"
                >
                  Choose different file
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Drag and drop your PDF here
                  </h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    or click to browse files
                  </p>
                  <p className="text-sm text-gray-500">
                    Only PDF files accepted • Max 10MB
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
            <div className="mt-8 pt-8 border-t border-gray-100">
              <Button
                size="lg"
                className="w-full text-lg py-5"
                onClick={handleUpload}
              >
                Start analysis →
              </Button>
            </div>
          )}
        </Card>

        {/* How to Get Document */}
        <div className="bg-gradient-to-br from-teal-900 to-emerald-950 rounded-2xl p-8 text-white shadow-xl">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <span className="text-3xl">📋</span>
            How to get your register document (등기부등본)
          </h3>
          <ol className="space-y-4">
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-emerald-100/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-emerald-100">1</span>
              <div>
                <p className="font-semibold text-emerald-100 mb-1">Visit Internet Register Office</p>
                <p className="text-emerald-50/80">Go to iros.go.kr (인터넷등기소)</p>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-emerald-100/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-emerald-100">2</span>
              <div>
                <p className="font-semibold text-emerald-100 mb-1">Select building register</p>
                <p className="text-emerald-50/80">Click 부동산 → 건물 등기사항증명서</p>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-emerald-100/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-emerald-100">3</span>
              <div>
                <p className="font-semibold text-emerald-100 mb-1">Search by address</p>
                <p className="text-emerald-50/80">Enter the property address and select it from results</p>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-8 h-8 bg-emerald-100/20 backdrop-blur-sm rounded-full flex items-center justify-center font-bold text-emerald-100">4</span>
              <div>
                <p className="font-semibold text-emerald-100 mb-1">Issue and download</p>
                <p className="text-emerald-50/80">Pay ₩1,000 and download the PDF document</p>
              </div>
            </li>
          </ol>

          <a
            href="https://www.iros.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-white text-emerald-900 font-semibold rounded-xl hover:bg-emerald-50 transition-all hover:scale-105"
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
