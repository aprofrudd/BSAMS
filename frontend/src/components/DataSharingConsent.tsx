'use client';

import { useState, useEffect } from 'react';
import { consentApi } from '@/lib/api';

export function DataSharingConsent() {
  const [enabled, setEnabled] = useState(false);
  const [infoText, setInfoText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    loadConsent();
  }, []);

  async function loadConsent() {
    try {
      setIsLoading(true);
      const data = await consentApi.get();
      setEnabled(data.data_sharing_enabled);
      setInfoText(data.info_text);
    } catch {
      setError('Failed to load consent status');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggle() {
    if (!enabled) {
      // Turning on - show confirmation first
      setShowConfirm(true);
      return;
    }

    // Turning off - go ahead
    await saveConsent(false);
  }

  async function saveConsent(newValue: boolean) {
    try {
      setIsSaving(true);
      setError(null);
      const data = await consentApi.update(newValue);
      setEnabled(data.data_sharing_enabled);
      setShowConfirm(false);
    } catch {
      setError('Failed to update consent');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="card">
        <div className="text-center py-4">
          <div className="inline-block w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-accent mb-3">Data Sharing</h2>

      <p className="text-white/60 text-sm mb-4">{infoText}</p>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-white/80">Status:</span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            enabled
              ? 'bg-green-500/20 text-green-400'
              : 'bg-white/10 text-white/40'
          }`}
        >
          {enabled ? 'Sharing Enabled' : 'Not Sharing'}
        </span>
      </div>

      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

      {/* Toggle button */}
      <button
        onClick={handleToggle}
        disabled={isSaving}
        className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
          enabled
            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            : 'bg-accent text-[#090A3D] hover:bg-accent/80'
        }`}
      >
        {isSaving ? 'Updating...' : enabled ? 'Revoke Sharing' : 'Enable Sharing'}
      </button>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConfirm(false);
          }}
        >
          <div className="card w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-accent mb-3">Confirm Data Sharing</h3>
            <p className="text-white/60 text-sm mb-4">{infoText}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => saveConsent(true)}
                disabled={isSaving}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {isSaving ? 'Enabling...' : 'I Agree'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
