'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DeleteAccountButton() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Sign out locally
      await supabase.auth.signOut();

      // Redirect to home
      router.push('/?deleted=true');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="w-full text-center bg-red-50 text-red-600 hover:bg-red-100 px-6 py-4 rounded-2xl transition-all font-semibold border border-red-200"
      >
        Delete Account
      </button>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-red-800 mb-1">Delete your account?</h4>
          <p className="text-sm text-red-700">
            This action is permanent and cannot be undone. All your data, including analysis history, will be permanently deleted.
          </p>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-red-800 mb-2">
          Type <span className="font-bold">DELETE</span> to confirm
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="w-full px-4 py-3 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all bg-white text-[#1A202C] placeholder-[#718096]"
          disabled={isDeleting}
        />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => {
            setShowConfirm(false);
            setConfirmText('');
            setError(null);
          }}
          disabled={isDeleting}
          className="flex-1 px-4 py-3 bg-white text-[#4A5568] hover:bg-gray-50 rounded-xl transition-all font-medium border border-gray-200 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting || confirmText !== 'DELETE'}
          className="flex-1 px-4 py-3 bg-red-600 text-white hover:bg-red-700 rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isDeleting ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Deleting...
            </>
          ) : (
            'Delete Account'
          )}
        </button>
      </div>
    </div>
  );
}
