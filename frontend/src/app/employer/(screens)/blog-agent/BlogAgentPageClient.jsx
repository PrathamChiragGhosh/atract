"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBlogPublisherSettings, useUpdateBlogPublisherSettings } from '@/hooks/useBlogPublisher';
import { useEmployerProfile } from '@/hooks/useEmployerProfile';
import './page.css';

const internalKeywords = {
  employer: [
    'hiring trends 2025',
    'recruitment strategies',
    'how to hire faster',
    'best hiring practices',
    'employee retention strategies',
    'employer branding ideas',
    'how to reduce hiring cost',
    'recruitment automation',
    'ai in recruitment',
    'interview process best practices',
    'how to evaluate candidates',
    'how to hire remote employees',
    'talent acquisition strategies',
    'recruitment analytics',
    'diversity hiring strategies',
    'startup hiring challenges',
    'enterprise hiring process',
  ],
  jobSeeker: [
    'how to get a job',
    'resume writing tips',
    'how to crack interviews',
    'interview questions and answers',
    'job search strategies',
    'career growth tips',
    'how to negotiate salary',
    'how to switch jobs',
    'linkedin profile optimization',
    'best skills to learn in 2025',
    'how to get remote jobs',
    'freshers job guide',
    'career planning tips',
    'job market trends',
  ],
  market: [
    'salary trends in india',
    'it salary trends 2025',
    'job market analysis',
    'future jobs in india',
    'high paying jobs',
    'tech job demand',
    'layoffs impact job market',
    'recession hiring trends',
    'industry wise salary growth',
  ],
  tech: [
    'ai jobs demand',
    'data science careers',
    'full stack developer roadmap',
    'cloud computing jobs',
    'cyber security careers',
    'product management careers',
    'ui ux design jobs',
    'digital marketing careers',
  ],
};

const flattenKeywords = Object.values(internalKeywords).flat();

export default function BlogAgentPageClient() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useBlogPublisherSettings();
  const mutation = useUpdateBlogPublisherSettings();
  const { data: employerProfile } = useEmployerProfile();
  const [mounted, setMounted] = useState(false);

  const initialSettings = data?.settings;

  // Check access - if API returns 403, redirect
  useEffect(() => {
    if (isError && error?.response?.status === 403) {
      // Access denied - redirect to home
      router.push('/employer/home');
    }
  }, [isError, error, router]);

  const [enabled, setEnabled] = useState(initialSettings?.enabled ?? false);
  const [time, setTime] = useState(initialSettings?.time ?? '09:00');
  const [extraKeywords, setExtraKeywords] = useState(
    initialSettings?.extraKeywords?.join(', ') ?? ''
  );
  const [showKeywords, setShowKeywords] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialSettings) {
      setEnabled(initialSettings.enabled);
      setTime(initialSettings.time || '09:00');
      setExtraKeywords((initialSettings.extraKeywords || []).join(', '));
    }
  }, [initialSettings]);

  const handleSave = (e) => {
    e.preventDefault();
    const keywordsArray = extraKeywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    mutation.mutate(
      {
        enabled,
        time: time || '09:00',
        extraKeywords: keywordsArray,
      },
      {
        onSuccess: () => {
          alert('Settings saved successfully');
        },
        onError: (err) => {
          alert(err.message || 'Failed to save settings');
        },
      }
    );
  };

  // Prevent hydration mismatch by showing loading until mounted
  if (!mounted || isLoading) {
    return (
      <div className="blogagent-container">
        <div className="blogagent-card">
          <div className="blogagent-header">
            <div>
              <p className="blogagent-eyebrow">Automation</p>
              <h1 className="blogagent-title">Blog Publisher</h1>
              <p className="blogagent-subtitle">
                Schedule and manage daily auto-publishing for recruitment content.
              </p>
            </div>
          </div>
          <div className="blogagent-loading">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="blogagent-container">
      <div className="blogagent-card">
        <div className="blogagent-header">
          <div>
            <p className="blogagent-eyebrow">Automation</p>
            <h1 className="blogagent-title">Blog Publisher</h1>
            <p className="blogagent-subtitle">
              Schedule and manage daily auto-publishing for recruitment content.
            </p>
          </div>
        </div>

        {isError ? (
          <div className="blogagent-error">Failed to load settings: {error?.message}</div>
        ) : (
          <form onSubmit={handleSave} className="blogagent-form">
            <div className="blogagent-row">
              <label className="blogagent-label">Auto publish</label>
              <label className="blogagent-switch">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span className="blogagent-slider" />
              </label>
            </div>

            <div className="blogagent-row">
              <label className="blogagent-label" htmlFor="blogagent-time">
                Daily publish time
              </label>
              <input
                id="blogagent-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="blogagent-input"
                required
              />
            </div>

            <div className="blogagent-rowColumn">
              <label className="blogagent-label" htmlFor="blogagent-keywords">
                Extra keywords (comma-separated)
              </label>
              <textarea
                id="blogagent-keywords"
                value={extraKeywords}
                onChange={(e) => setExtraKeywords(e.target.value)}
                className="blogagent-textarea"
                rows={3}
                placeholder="e.g., campus hiring, lateral hiring, leadership hiring"
              />
              <button
                type="button"
                className="blogagent-linkButton"
                onClick={() => setShowKeywords((v) => !v)}
              >
                {showKeywords ? 'Hide keywords' : 'Show keywords'}
              </button>
              {showKeywords && (
                <div className="blogagent-keywordPanel">
                  <p className="blogagent-panelTitle">Internal keyword pool</p>
                  <div className="blogagent-keywordGrid">
                    {flattenKeywords.map((k) => (
                      <span key={k} className="blogagent-keywordChip">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {initialSettings?.allowedEmails && initialSettings.allowedEmails.length > 0 && (
              <div className="blogagent-rowColumn">
                <label className="blogagent-label">Notification Emails</label>
                <div className="blogagent-emailList">
                  <p className="blogagent-emailInfo">
                    Blog publishing notifications will be sent to these email addresses:
                  </p>
                  <div className="blogagent-emailChips">
                    {initialSettings.allowedEmails.map((email, index) => (
                      <span key={index} className="blogagent-emailChip">
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="blogagent-actions">
              <button
                type="submit"
                className="blogagent-primaryButton"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

