import React from 'react';
import { Session } from '../types';
import { Button } from './Button';

interface DashboardProps {
  sessions: Session[];
  onStartSession: () => void;
}

const PROTOCOLS = [
  {
    name: 'Squats',
    target: '100° – 130° Depth',
    plane: 'Frontal / Lateral',
    guardrail: 'Knee valgus collapse prevention',
    accent: 'bg-metric-blue'
  },
  {
    name: 'Pushups',
    target: '≤ 90° Flexion',
    plane: 'Lateral View',
    guardrail: 'Full extension lockout check',
    accent: 'bg-recovery-green'
  },
  {
    name: 'Lateral Lunge',
    target: '≤ 110° Working Knee',
    plane: 'Frontal View',
    guardrail: 'Trailing leg lock & hip level',
    accent: 'bg-signal-gold'
  },
  {
    name: 'Plank',
    target: '165° – 195° Alignment',
    plane: 'Lateral View',
    guardrail: 'Pelvic sagging / arching alert',
    accent: 'bg-sleep-lilac'
  }
];

export const Dashboard: React.FC<DashboardProps> = ({ sessions, onStartSession }) => {
  const totalTime = sessions.reduce((acc, curr) => acc + curr.durationSeconds, 0);
  const avgAccuracy = sessions.length > 0 
    ? Math.round(sessions.reduce((acc, curr) => acc + curr.accuracyScore, 0) / sessions.length) 
    : 0;

  return (
    <div className="space-y-16 sm:space-y-20 pb-24">
      {/* 1. Cloudlight Device Hero Field per Bevel DESIGN.md */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#d2e5ff_0%,#fff9ee_40%,#ffffff_100%)] pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-black/[0.04]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-paper/80 backdrop-blur-sm text-xs font-medium text-body-gray shadow-sm">
            <span className="w-2 h-2 rounded-full bg-recovery-green"></span>
            Morning Biomechanics Journal
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold text-ink tracking-[-0.03em] leading-[1.05]">
            Kinematic metrics in cloudlight.
          </h1>

          <p className="text-body-gray text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed font-normal">
            Real-time optical motion capture, joint angle telemetry, and AI physiotherapist clinical documentation.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={onStartSession} 
              variant="primary"
              className="text-base px-8 py-3.5"
              icon={
                <svg className="w-5 h-5 text-cloud" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              }
            >
              Start Biomechanics Session
            </Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* 2. Bento Metrics Strip — Cloud Card (#ebf0f8) with No Harsh Borders */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl sm:text-3xl font-semibold text-ink tracking-[-0.03em]">
              Daily Recovery Metrics
            </h2>
            <span className="text-xs text-body-gray">Calibrated by MediaPipe 33-pt ML</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Tile 1: Sessions */}
            <div className="bg-cloud rounded-3xl p-7 flex flex-col justify-between transition-all hover:translate-y-[-2px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-body-gray">Total Logged</span>
                  <span className="w-3 h-3 rounded-full bg-charcoal"></span>
                </div>
                <p className="text-4xl sm:text-5xl font-semibold text-ink tracking-tight tabular-nums">
                  {sessions.length}
                </p>
              </div>
              <p className="text-xs text-body-gray mt-6">Sessions saved in health journal</p>
            </div>

            {/* Tile 2: Form Accuracy (Recovery Green) */}
            <div className="bg-cloud rounded-3xl p-7 flex flex-col justify-between transition-all hover:translate-y-[-2px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-body-gray">Kinematic Form</span>
                  <span className="w-3 h-3 rounded-full bg-recovery-green"></span>
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-4xl sm:text-5xl font-semibold text-ink tracking-tight tabular-nums">
                    {sessions.length > 0 ? `${avgAccuracy}%` : '—'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-body-gray mt-6">Clinical adherence target ≥ 80%</p>
            </div>

            {/* Tile 3: Tension Time (Metric Blue) */}
            <div className="bg-cloud rounded-3xl p-7 flex flex-col justify-between transition-all hover:translate-y-[-2px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-body-gray">Tension Hold</span>
                  <span className="w-3 h-3 rounded-full bg-metric-blue"></span>
                </div>
                <p className="text-4xl sm:text-5xl font-semibold text-ink tracking-tight tabular-nums">
                  {Math.floor(totalTime / 60)}m {totalTime % 60}s
                </p>
              </div>
              <p className="text-xs text-body-gray mt-6">Active muscle under tension</p>
            </div>

            {/* Tile 4: Protocols (Sleep Lilac) */}
            <div className="bg-cloud rounded-3xl p-7 flex flex-col justify-between transition-all hover:translate-y-[-2px]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-body-gray">Ready Protocols</span>
                  <span className="w-3 h-3 rounded-full bg-sleep-lilac"></span>
                </div>
                <p className="text-4xl sm:text-5xl font-semibold text-ink tracking-tight tabular-nums">
                  4 Active
                </p>
              </div>
              <p className="text-xs text-body-gray mt-6">Dual plane sagittal & coronal FSM</p>
            </div>
          </div>
        </section>

        {/* 3. Cloud Feature Cards — Active Clinical Protocols */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl sm:text-3xl font-semibold text-ink tracking-[-0.03em]">
              Rehabilitation Protocols
            </h2>
            <span className="text-xs text-body-gray">Select before initiating session</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {PROTOCOLS.map((p) => (
              <div 
                key={p.name}
                className="bg-cloud rounded-3xl p-7 flex flex-col justify-between transition-all hover:translate-y-[-2px]"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-ink tracking-tight">{p.name}</h3>
                    <span className="w-2.5 h-2.5 rounded-full bg-recovery-green"></span>
                  </div>

                  <span className="inline-block text-[11px] font-medium text-body-gray bg-paper px-3 py-1 rounded-full shadow-sm mb-4">
                    {p.plane}
                  </span>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-body-gray block text-[11px]">Kinematic Target</span>
                      <span className="font-semibold text-ink text-sm tabular-nums">{p.target}</span>
                    </div>
                    <div>
                      <span className="text-body-gray block text-[11px]">Safety Guardrail</span>
                      <span className="text-body-gray">{p.guardrail}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Session History & Medical Records */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl sm:text-3xl font-semibold text-ink tracking-[-0.03em]">
              Session History & Clinical Logs
            </h2>
            <span className="text-xs text-body-gray">
              {sessions.length} {sessions.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {sessions.length > 0 ? (
            <div className="bg-cloud rounded-3xl p-6 sm:p-8 space-y-4">
              {sessions.map((session) => {
                const dateStr = session.timestamp.toLocaleDateString(undefined, { 
                  weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
                });
                const timeStr = session.timestamp.toLocaleTimeString(undefined, { 
                  hour: '2-digit', minute: '2-digit' 
                });
                
                return (
                  <div key={session.id} className="bg-paper rounded-2xl p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-6 shadow-sm">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-base font-semibold text-ink">{dateStr}</span>
                        <span className="text-xs text-body-gray tabular-nums">at {timeStr}</span>
                        <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-cloud text-ink tabular-nums inline-flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            session.accuracyScore >= 80 ? 'bg-recovery-green' :
                            session.accuracyScore >= 60 ? 'bg-signal-gold' : 'bg-coral-signal'
                          }`}></span>
                          {session.accuracyScore}% Form Accuracy
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {session.exercises.map((ex, i) => (
                          <span key={i} className="px-3 py-1 bg-cloud text-body-gray text-xs rounded-full font-medium">
                            {ex}
                          </span>
                        ))}
                      </div>

                      <div className="bg-cloud/60 p-4 rounded-xl">
                        <span className="font-semibold text-ink block mb-1 text-xs">
                          Physiotherapist Observation
                        </span>
                        <p className="text-body-gray text-sm leading-relaxed">
                          {session.aiSummary}
                        </p>
                      </div>
                    </div>

                    <div className="flex lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-black/[0.05] text-xs text-body-gray">
                      <span className="tabular-nums font-medium text-ink">
                        {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s duration
                      </span>
                      <span className="tabular-nums">
                        Pain score: <strong className="text-ink">{session.painLevel} / 10</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-cloud rounded-3xl p-12 sm:p-16 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 rounded-full bg-paper flex items-center justify-center mx-auto text-ink shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-ink tracking-tight">
                  No sessions recorded yet
                </h3>
                <p className="text-body-gray text-base leading-relaxed">
                  Start your first physical therapy session to log range-of-motion metrics and AI clinical notes in your journal.
                </p>
                <div className="pt-2">
                  <Button variant="primary" onClick={onStartSession}>
                    Begin Session
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
