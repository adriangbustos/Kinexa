import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
  initialMessage?: string;
}

export const GEMINI_KEY_STORAGE = 'kinexa_gemini_key';
export const GEMINI_MODEL_STORAGE = 'kinexa_gemini_model';
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  onKeySaved,
  initialMessage 
}) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem(GEMINI_KEY_STORAGE) || '';
      let storedModel = localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_GEMINI_MODEL;
      if (storedModel.includes('2.5')) {
        storedModel = DEFAULT_GEMINI_MODEL;
        localStorage.setItem(GEMINI_MODEL_STORAGE, DEFAULT_GEMINI_MODEL);
      }
      setApiKey(storedKey);
      setModel(storedModel);
      setTestStatus('idle');
      setTestMessage(initialMessage || '');
    }
  }, [isOpen, initialMessage]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus('error');
      setTestMessage('Please enter an API key before testing.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('Verifying API key with Google Gemini...');

    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const response = await ai.models.generateContent({
        model: model,
        contents: 'Respond with "OK" if connection is valid.',
      });

      if (response && response.text) {
        setTestStatus('success');
        setTestMessage(`Connection verified! Model (${model}) responded successfully.`);
      } else {
        throw new Error('No response text received.');
      }
    } catch (err: any) {
      console.error('API Verification failed:', err);
      setTestStatus('error');
      setTestMessage(err?.message || 'Verification failed. Check your API key and permissions.');
    }
  };

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    } else {
      localStorage.removeItem(GEMINI_KEY_STORAGE);
    }
    localStorage.setItem(GEMINI_MODEL_STORAGE, model);

    if (onKeySaved) {
      onKeySaved();
    }
    onClose();
  };

  const handleClear = () => {
    localStorage.removeItem(GEMINI_KEY_STORAGE);
    setApiKey('');
    setTestStatus('idle');
    setTestMessage('API key cleared from local storage.');
    if (onKeySaved) {
      onKeySaved();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      {/* Bevel Cloud Card Modal Container */}
      <div className="bg-paper w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-bevel-float border border-black/[0.06] space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-body-gray mb-1">
              <span className="w-2 h-2 rounded-full bg-recovery-green"></span>
              AI Telemetry Configuration
            </div>
            <h2 className="text-2xl font-semibold text-ink tracking-tight">
              Settings & AI Credentials
            </h2>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close settings"
            className="p-2 -mr-2 text-body-gray hover:text-ink rounded-full hover:bg-cloud transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-5">
          {/* API Key Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="gemini-key" className="text-xs font-semibold text-ink">
                Google Gemini API Key
              </label>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] text-metric-blue hover:underline font-medium"
              >
                Get API key from Google AI Studio ↗
              </a>
            </div>

            <div className="relative">
              <input
                id="gemini-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your AIzaSy... API key"
                className="w-full bg-cloud text-ink rounded-2xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-charcoal transition-all placeholder:text-body-gray/50 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-body-gray hover:text-ink"
                title={showKey ? 'Hide Key' : 'Show Key'}
              >
                {showKey ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[11px] text-body-gray leading-normal">
              Keys are saved locally in your browser's <code className="font-mono bg-cloud px-1 py-0.5 rounded">localStorage</code> and never transmitted to any third-party server.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label htmlFor="gemini-model" className="text-xs font-semibold text-ink">
              Gemini Model
            </label>
            <select
              id="gemini-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-cloud text-ink font-medium rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-charcoal transition-all cursor-pointer"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended • Fast & Clinical)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (High Speed)</option>
              <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite (Ultra-low Latency)</option>
            </select>
          </div>

          {/* Test Status Feedback */}
          {testMessage && (
            <div className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
              testStatus === 'success' 
                ? 'bg-recovery-green/10 text-ink border border-recovery-green/20' 
                : testStatus === 'error'
                ? 'bg-coral-signal/20 text-[#a82a14] border border-coral-signal/40'
                : 'bg-cloud text-body-gray'
            }`}>
              {testStatus === 'testing' && (
                <div className="animate-spin h-4 w-4 border-2 border-charcoal border-t-transparent rounded-full shrink-0"></div>
              )}
              {testStatus === 'success' && (
                <span className="w-2 h-2 rounded-full bg-recovery-green shrink-0 mt-1"></span>
              )}
              {testStatus === 'error' && (
                <span className="w-2 h-2 rounded-full bg-[#d95338] shrink-0 mt-1"></span>
              )}
              <span className="leading-relaxed">{testMessage}</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-black/[0.05]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestKey}
              disabled={testStatus === 'testing' || !apiKey.trim()}
              className="text-xs py-2 px-4 flex-1 sm:flex-initial"
            >
              Test Connection
            </Button>
            {apiKey && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-body-gray hover:text-[#d95338] px-2 py-1 transition-colors"
              >
                Clear Key
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="text-xs py-2 px-4 flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              className="text-xs py-2 px-5 flex-1 sm:flex-initial"
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
