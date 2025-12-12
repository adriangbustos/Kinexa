import React from 'react';
import { Session } from '../types';
import { Button } from './Button';

interface ReportCardProps {
  session: Session;
  onClose: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ session, onClose }) => {
  const dateStr = session.timestamp.toLocaleDateString();
  const timeStr = session.timestamp.toLocaleTimeString();

  const handleDownload = () => {
    const content = `
KINEXA - CLINICAL SESSION REPORT
=======================================
Date: ${dateStr} at ${timeStr}
Patient ID: Local User

SESSION STATISTICS
------------------
Duration: ${session.durationSeconds} seconds
Total Reps: ${session.reps}
Average Knee Angle: ${session.averageAngle}°
Form Accuracy: ${session.accuracyScore}%
Pain Level reported: ${session.painLevel}/10
Exercises: ${session.exercises.join(', ')}

CLINICAL OBSERVATION (AI GENERATED)
-----------------------------------
${session.aiSummary}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinexa-report-${session.timestamp.getTime()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-[#778873] p-8 text-white">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-bold font-display tracking-wide">Session Report Card</h2>
            <div className="p-2 bg-white/10 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
          </div>
          <p className="opacity-90">{dateStr} • {timeStr}</p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          
          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Reps</p>
                <p className="text-2xl font-bold text-gray-900">{session.reps}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Avg Angle</p>
                <p className="text-2xl font-bold text-gray-900">{session.averageAngle}°</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Accuracy</p>
                <p className="text-2xl font-bold text-gray-900">{session.accuracyScore}%</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Duration</p>
                <p className="text-2xl font-bold text-gray-900">{session.durationSeconds}s</p>
            </div>
          </div>

          {/* AI Summary */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm ring-1 ring-[#778873]/5">
             <h3 className="text-[#778873] font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                Clinical Observation
             </h3>
             <p className="text-gray-800 leading-relaxed italic text-lg">
                "{session.aiSummary}"
             </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
            <Button 
                onClick={handleDownload}
                variant="primary" 
                fullWidth
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>}
            >
                Download Report
            </Button>
            <Button 
                onClick={onClose}
                variant="outline"
                fullWidth
            >
                Close & Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};