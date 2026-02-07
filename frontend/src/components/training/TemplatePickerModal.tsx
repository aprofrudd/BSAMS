'use client';

import { useState, useEffect } from 'react';
import { sessionTemplatesApi } from '@/lib/api';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import type { SessionTemplate } from '@/lib/types';

interface TemplatePickerModalProps {
  sessionId: string;
  onClose: () => void;
  onApplied: () => void;
}

export function TemplatePickerModal({ sessionId, onClose, onApplied }: TemplatePickerModalProps) {
  const focusTrapRef = useFocusTrap<HTMLDivElement>();
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await sessionTemplatesApi.list();
        setTemplates(data);
      } catch {
        setError('Failed to load templates');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  async function handleApply(templateId: string) {
    setApplying(templateId);
    setError(null);
    try {
      await sessionTemplatesApi.apply(templateId, sessionId);
      onApplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
      setApplying(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={focusTrapRef} className="card w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title text-base">Import from Template</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <p className="text-red-400 text-sm py-4 text-center">{error}</p>
        ) : templates.length === 0 ? (
          <p className="text-white/60 text-sm py-8 text-center">
            No templates yet. Create templates in the Library page.
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="border border-secondary-muted rounded-lg p-3 hover:border-accent/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{t.template_name}</p>
                    <p className="text-xs text-white/40">
                      {t.training_type} &middot; {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleApply(t.id)}
                    disabled={applying !== null}
                    className="px-3 py-1.5 rounded text-xs font-medium bg-accent text-[#090A3D] hover:bg-accent/80 transition-colors disabled:opacity-50"
                  >
                    {applying === t.id ? 'Applying...' : 'Apply'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
