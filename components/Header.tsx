import React from 'react';

interface HeaderProps {
  onOpenSettings?: () => void;
  hasApiKey?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, hasApiKey = false }) => {
  return (
    <header className="absolute top-4 sm:top-5 left-0 right-0 z-40 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Floating Capsule Navigation directly over the Hero Sky gradient */}
      <nav className="bg-paper/85 backdrop-blur-md rounded-full px-5 sm:px-6 h-14 sm:h-16 flex items-center justify-between shadow-bevel-subtle border border-black/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-charcoal flex items-center justify-center text-cloud shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-semibold text-ink tracking-tight">Kinexa</span>
            <span className="text-xs text-body-gray font-normal hidden sm:inline">Health Journal</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cloud text-ink font-medium">
            <span className="w-2 h-2 rounded-full bg-recovery-green animate-pulse"></span>
            <span className="hidden sm:inline">MediaPipe Pose •</span> 60 FPS
          </span>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="p-2 sm:px-3 sm:py-1 rounded-full bg-cloud hover:bg-[#e2eaf5] text-ink font-medium transition-colors flex items-center gap-1.5"
              title="Open Gemini API Key Settings"
              aria-label="Settings"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span className="hidden sm:inline">Settings</span>
              <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-recovery-green' : 'bg-coral-signal'}`}></span>
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};
