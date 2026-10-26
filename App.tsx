import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SessionView } from './components/SessionView';
import { Header } from './components/Header';
import { ReportCard } from './components/ReportCard';
import { SettingsModal, GEMINI_KEY_STORAGE, GEMINI_MODEL_STORAGE, DEFAULT_GEMINI_MODEL } from './components/SettingsModal';
import { Session, ViewState } from './types';
import { GoogleGenAI } from "@google/genai";

function App() {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  // Local state for sessions instead of Firestore
  const [sessions, setSessions] = useState<Session[]>([]);
  // Temp state for report view
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [keyVersion, setKeyVersion] = useState(0);

  const handleStartSession = () => {
    setView(ViewState.SESSION);
  };

  const handleBackToDashboard = () => {
    setView(ViewState.DASHBOARD);
  };

  const openSettingsWithMessage = (msg?: string) => {
    setSettingsMessage(msg || '');
    setIsSettingsOpen(true);
  };

  const handleSessionComplete = async (data: any) => {
    setIsGeneratingReport(true);
    let summary = "Session analysis unavailable.";
    
    try {
        const apiKey = localStorage.getItem(GEMINI_KEY_STORAGE) || process.env.API_KEY;
        const model = localStorage.getItem(GEMINI_MODEL_STORAGE) || DEFAULT_GEMINI_MODEL;

        if (!apiKey) {
          throw new Error("No Gemini API key configured.");
        }

        const ai = new GoogleGenAI({ apiKey });
        // Format exercise data for the prompt
        const exerciseText = Object.entries(data.exerciseStats || {})
            .map(([name, val]) => `${name}: ${val} ${name === 'Plank' ? 'seconds' : 'reps'}`)
            .join(', ');

        const prompt = `Act as a Physiotherapist. Analyze this patient data: 
            Exercises Performed: ${exerciseText}
            Duration: ${data.durationSeconds} seconds
            Form Accuracy: ${data.accuracyScore}%
            
            Write a 3-sentence clinical observation for their doctor, focusing on stability and consistency.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
        });
        if (response && response.text) {
            summary = response.text;
        }
    } catch (e: any) {
        console.error("AI Generation failed", e);
        summary = "Session completed. Configure your Gemini API key in Settings to generate AI doctor observations.";
    }

    const newSession: Session = {
        id: Date.now().toString(),
        userId: 'local-user',
        timestamp: new Date(),
        durationSeconds: data.durationSeconds,
        exercises: data.exercises,
        exerciseStats: data.exerciseStats,
        painLevel: data.painLevel,
        accuracyScore: data.accuracyScore,
        reps: data.reps,
        averageAngle: data.averageAngle,
        aiSummary: summary
    };

    setCurrentSession(newSession);
    setView(ViewState.REPORT);
    setIsGeneratingReport(false);
  };

  const handleReportClose = () => {
    if (currentSession) {
        setSessions(prev => [currentSession, ...prev]);
        setCurrentSession(null);
    }
    setView(ViewState.DASHBOARD);
  };

  const hasConfiguredKey = typeof window !== 'undefined' && !!localStorage.getItem(GEMINI_KEY_STORAGE);

  return (
    <div className="min-h-screen bg-paper font-sans selection:bg-charcoal selection:text-paper text-ink relative">
      {view === ViewState.DASHBOARD && (
        <Header 
          onOpenSettings={() => openSettingsWithMessage()}
          hasApiKey={hasConfiguredKey}
        />
      )}

      <main className="w-full">
        {view === ViewState.DASHBOARD && (
          <Dashboard sessions={sessions} onStartSession={handleStartSession} />
        )}

        {view === ViewState.SESSION && (
            <>
            {isGeneratingReport ? (
                <div className="fixed inset-0 bg-paper/95 flex flex-col items-center justify-center z-[60] backdrop-blur-md p-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-cloud border-t-charcoal mb-5"></div>
                    <h2 className="text-xl sm:text-2xl font-semibold text-ink tracking-tight">Generating Clinical Report...</h2>
                    <p className="text-body-gray text-sm mt-1">Analyzing kinematics and angle metrics.</p>
                </div>
            ) : (
                <SessionView 
                    onExit={handleBackToDashboard}
                    onSave={handleSessionComplete}
                    onOpenSettings={(msg) => openSettingsWithMessage(msg)}
                />
            )}
            </>
        )}

        {view === ViewState.REPORT && currentSession && (
            <ReportCard 
                session={currentSession}
                onClose={handleReportClose}
            />
        )}
      </main>

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialMessage={settingsMessage}
        onKeySaved={() => setKeyVersion(v => v + 1)}
      />
    </div>
  );
}

export default App;
