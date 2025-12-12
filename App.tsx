import React, { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { SessionView } from './components/SessionView';
import { Header } from './components/Header';
import { ReportCard } from './components/ReportCard';
import { Session, ViewState } from './types';
import { GoogleGenAI } from "@google/genai";

function App() {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  // Local state for sessions instead of Firestore
  const [sessions, setSessions] = useState<Session[]>([]);
  // Temp state for report view
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const handleStartSession = () => {
    setView(ViewState.SESSION);
  };

  const handleBackToDashboard = () => {
    setView(ViewState.DASHBOARD);
  }

  const handleSessionComplete = async (data: any) => {
    setIsGeneratingReport(true);
    let summary = "Session analysis unavailable.";
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Act as a Physiotherapist. Analyze this patient data: 
            Total Reps: ${data.reps}
            Average Knee Angle: ${data.averageAngle} degrees
            Duration: ${data.durationSeconds} seconds
            Form Accuracy: ${data.accuracyScore}%
            
            Write a 3-sentence clinical observation for their doctor, focusing on stability and consistency.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        if (response.text) {
            summary = response.text;
        }
    } catch (e) {
        console.error("AI Generation failed", e);
        summary = "Session completed. Unable to generate clinical observation at this time.";
    }

    const newSession: Session = {
        id: Date.now().toString(),
        userId: 'local-user',
        timestamp: new Date(),
        durationSeconds: data.durationSeconds,
        exercises: data.exercises,
        painLevel: data.painLevel,
        accuracyScore: data.accuracyScore,
        reps: data.reps,
        averageAngle: data.averageAngle,
        aiSummary: summary
    };

    setCurrentSession(newSession);
    setView(ViewState.REPORT);
    setIsGeneratingReport(false);
  }

  const handleReportClose = () => {
    if (currentSession) {
        setSessions(prev => [currentSession, ...prev]);
        setCurrentSession(null);
    }
    setView(ViewState.DASHBOARD);
  };

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#778873] selection:text-white text-gray-900">
      {view === ViewState.DASHBOARD && (
        <Header />
      )}

      <main>
        {view === ViewState.DASHBOARD && (
          <Dashboard sessions={sessions} onStartSession={handleStartSession} />
        )}

        {view === ViewState.SESSION && (
            <>
            {isGeneratingReport ? (
                <div className="fixed inset-0 bg-white/95 flex flex-col items-center justify-center z-[60] backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#778873] mb-6"></div>
                    <h2 className="text-2xl font-bold text-gray-900 font-display">Generating Clinical Report...</h2>
                    <p className="text-slate-500 mt-2">Dr. AI is analyzing your biomechanics.</p>
                </div>
            ) : (
                <SessionView 
                    onExit={handleBackToDashboard}
                    onSave={handleSessionComplete}
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
    </div>
  );
}

export default App;