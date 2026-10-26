import React from 'react';
import { Session } from '../types';
import { Button } from './Button';

interface ReportCardProps {
  session: Session;
  onClose: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ session, onClose }) => {
  const dateStr = session.timestamp.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const timeStr = session.timestamp.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleDownloadPDF = () => {
    if (!window.jspdf) {
      console.error("jsPDF not loaded");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Clinical Document Header per Bevel style
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(34, 35, 38); // Ink
    doc.text("KINEXA — BIOMECHANICS HEALTH JOURNAL", 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(116, 118, 121); // Body Gray
    doc.text(`Recorded Date: ${dateStr} at ${timeStr}`, 14, 27);
    doc.text(`Patient Profile: Local User`, 14, 32);
    doc.text(`Kinematic Engine: Google MediaPipe Pose 33-Keypoint Optical Capture`, 14, 37);
    
    // Performance Metrics Line
    doc.setDrawColor(235, 240, 248);
    doc.line(14, 41, 196, 41);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(34, 35, 38);
    doc.text(`Overall Form Accuracy: ${session.accuracyScore}%`, 14, 47);
    doc.text(`Time under Tension: ${Math.floor(session.durationSeconds / 60)}m ${session.durationSeconds % 60}s`, 85, 47);
    doc.text(`Pain Index: ${session.painLevel} / 10`, 155, 47);

    // Table Data
    const tableData = Object.entries(session.exerciseStats || {})
      .filter(([_, val]) => (val as number) > 0)
      .map(([name, val]) => [
        name, 
        name === 'Plank' ? `${val} seconds` : `${val} completed reps`, 
        "Verified Optical Form"
      ]);

    if (tableData.length === 0) {
      tableData.push(["No completed reps recorded", "-", "Calibration Only"]);
    }

    // AutoTable
    doc.autoTable({
      startY: 53,
      head: [['Rehabilitation Protocol', 'Volume / Tension', 'Verification Status']],
      body: tableData,
      headStyles: { 
        fillColor: [31, 32, 37], // Charcoal
        textColor: [235, 240, 248], // Cloud Card
        fontStyle: 'bold' 
      },
      styles: { 
        font: "helvetica",
        fontSize: 9,
        cellPadding: 4
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });
    
    // AI Clinical Observation
    const finalY = (doc as any).lastAutoTable.finalY || 80;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(34, 35, 38);
    doc.text("Attending Physiotherapist Biomechanical Observation", 14, finalY + 12);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(116, 118, 121);
    const splitText = doc.splitTextToSize(session.aiSummary, 180);
    doc.text(splitText, 14, finalY + 19);

    // Footer signature notice
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Document generated via Kinexa Clinical Rehabilitation Engine. Store in patient medical records.", 14, 280);

    doc.save(`kinexa-health-journal-${session.timestamp.getTime()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 sm:p-6 text-ink">
      {/* Cloud Card Container with 32px radius per Bevel DESIGN.md */}
      <div className="bg-cloud w-full max-w-2xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        
        {/* Document Header Card */}
        <div className="bg-paper rounded-2xl p-6 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-body-gray mb-1">
              <span className="w-2 h-2 rounded-full bg-recovery-green"></span>
              Session Evaluation Journal
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-ink tracking-tight">
              Clinical Evaluation Report
            </h2>
            <p className="text-xs sm:text-sm text-body-gray mt-1 tabular-nums">
              {dateStr} at {timeStr} • Local User
            </p>
          </div>
          
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cloud text-ink tabular-nums inline-flex items-center gap-1.5 shrink-0">
            <span className={`w-2 h-2 rounded-full ${
              session.accuracyScore >= 80 ? 'bg-recovery-green' :
              session.accuracyScore >= 60 ? 'bg-signal-gold' : 'bg-coral-signal'
            }`}></span>
            {session.accuracyScore}% Form Accuracy
          </span>
        </div>

        {/* Summary Metrics Strip */}
        <div className="grid grid-cols-3 gap-3 bg-paper p-5 rounded-2xl">
          <div>
            <p className="text-xs text-body-gray">Form Accuracy</p>
            <p className="text-xl sm:text-2xl font-semibold text-ink tabular-nums mt-0.5">
              {session.accuracyScore}%
            </p>
          </div>
          <div>
            <p className="text-xs text-body-gray">Tension Hold</p>
            <p className="text-xl sm:text-2xl font-semibold text-ink tabular-nums mt-0.5">
              {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s
            </p>
          </div>
          <div>
            <p className="text-xs text-body-gray">Pain Index</p>
            <p className="text-xl sm:text-2xl font-semibold text-ink tabular-nums mt-0.5">
              {session.painLevel} / 10
            </p>
          </div>
        </div>

        {/* Protocols Completed */}
        <div className="bg-paper rounded-2xl p-6 space-y-3">
          <h3 className="text-base font-semibold text-ink">
            Completed Protocols
          </h3>
          <div className="divide-y divide-black/[0.04]">
            {Object.entries(session.exerciseStats || {}).filter(([_, val]) => (val as number) > 0).length > 0 ? (
              Object.entries(session.exerciseStats)
                .filter(([_, val]) => (val as number) > 0)
                .map(([name, val]) => (
                  <div key={name} className="py-2.5 flex justify-between items-center text-sm">
                    <span className="font-medium text-ink">{name}</span>
                    <span className="text-body-gray font-semibold tabular-nums">
                      {name === 'Plank' ? `${val}s hold` : `${val} reps`}
                    </span>
                  </div>
                ))
            ) : (
              <div className="py-2.5 text-xs text-body-gray">
                Calibration session only.
              </div>
            )}
          </div>
        </div>

        {/* Physician Observation */}
        <div className="bg-paper rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-body-gray">
            <span className="w-2 h-2 rounded-full bg-metric-blue"></span>
            Physiotherapist Observation
          </div>
          <p className="text-sm text-body-gray leading-relaxed font-normal">
            {session.aiSummary}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            onClick={handleDownloadPDF}
            variant="primary" 
            fullWidth
            icon={
              <svg className="w-4 h-4 text-cloud" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            }
          >
            Export Health PDF
          </Button>
          <Button 
            onClick={onClose}
            variant="secondary"
            fullWidth
          >
            Close & Return to Journal
          </Button>
        </div>
      </div>
    </div>
  );
};
