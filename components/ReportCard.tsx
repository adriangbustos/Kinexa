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

  const handleDownloadPDF = () => {
    if (!window.jspdf) {
        console.error("jsPDF not loaded");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(119, 136, 115); // Sage Color
    doc.text("Kinexa - Physical Therapy Session", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Date: ${dateStr} at ${timeStr}`, 14, 30);
    doc.text(`Patient ID: Local User`, 14, 35);
    
    // Table Data
    const tableData = Object.entries(session.exerciseStats || {})
      .filter(([_, val]) => (val as number) > 0)
      .map(([name, val]) => [
        name, 
        name === 'Plank' ? `${val} seconds` : `${val} reps`, 
        "Completed"
      ]);

    if (tableData.length === 0) {
        tableData.push(["No exercises performed", "-", "-"]);
    }

    // AutoTable
    doc.autoTable({
        startY: 45,
        head: [['Exercise Name', 'Result', 'Notes']],
        body: tableData,
        headStyles: { fillColor: [119, 136, 115] },
        styles: { font: "helvetica" }
    });
    
    // AI Insight
    const finalY = (doc as any).lastAutoTable.finalY || 60;
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Clinical Notes", 14, finalY + 15);
    
    doc.setFontSize(10);
    doc.setTextColor(80);
    const splitText = doc.splitTextToSize(session.aiSummary, 180);
    doc.text(splitText, 14, finalY + 22);

    doc.save(`kinexa-report-${session.timestamp.getTime()}.pdf`);
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
          
          {/* Detailed Exercise Grid */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Exercises Performed</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(session.exerciseStats || {}).length > 0 ? (
                    Object.entries(session.exerciseStats)
                    .filter(([_, val]) => (val as number) > 0)
                    .map(([name, val]) => (
                        <div key={name} className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center shadow-sm">
                            <span className="font-bold text-gray-900">{name}</span>
                            <span className="text-[#778873] font-bold bg-green-50 px-3 py-1 rounded-lg">
                                {name === 'Plank' ? `${val}s` : `${val} reps`}
                            </span>
                        </div>
                    ))
                ) : (
                    <p className="text-slate-500 text-sm">No exercises recorded.</p>
                )}
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
          
          <div className="flex gap-4">
             <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <p className="text-xs text-slate-500 uppercase font-bold">Accuracy</p>
                <p className="text-xl font-bold text-gray-900">{session.accuracyScore}%</p>
             </div>
             <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                <p className="text-xs text-slate-500 uppercase font-bold">Total Time</p>
                <p className="text-xl font-bold text-gray-900">{Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s</p>
             </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
            <Button 
                onClick={handleDownloadPDF}
                variant="primary" 
                fullWidth
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>}
            >
                Download PDF Report
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