import React from 'react';
import { Session } from '../types';
import { Button } from './Button';

interface DashboardProps {
  sessions: Session[];
  onStartSession: () => void;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className="w-12 h-12 rounded-xl bg-[#778873] text-white flex items-center justify-center shadow-md shadow-[#778873]/20">
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

interface SessionCardProps {
  session: Session;
}

const SessionCard: React.FC<SessionCardProps> = ({ session }) => {
  const dateStr = session.timestamp.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const timeStr = session.timestamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#778873] transition-colors">{dateStr}</h3>
          <span className="text-sm text-slate-500">{timeStr}</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
          session.accuracyScore >= 80 ? 'bg-green-50 text-green-700 border-green-200' : 
          session.accuracyScore >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'
        }`}>
          {session.accuracyScore}% Accuracy
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-3">
            {session.exercises.map((ex, i) => (
                <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-semibold border border-gray-200">
                    {ex}
                </span>
            ))}
        </div>
        <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
           <span className="font-bold text-[#778873] block mb-1 text-xs uppercase tracking-wider flex items-center gap-1">
             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
             AI Analysis
           </span>
           {session.aiSummary}
        </p>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500 mt-4 pt-4 border-t border-gray-100">
        <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {Math.floor(session.durationSeconds / 60)}m {session.durationSeconds % 60}s
        </span>
        <span className="flex items-center gap-1.5">
             <span className="w-2 h-2 rounded-full bg-slate-300"></span>
             Pain Level: {session.painLevel}/10
        </span>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ sessions, onStartSession }) => {
  const totalTime = sessions.reduce((acc, curr) => acc + curr.durationSeconds, 0);
  const avgAccuracy = sessions.length > 0 ? Math.round(sessions.reduce((acc, curr) => acc + curr.accuracyScore, 0) / sessions.length) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 font-display tracking-tight">Welcome back</h2>
          <p className="text-slate-500 mt-1 text-lg">Ready to continue your recovery journey?</p>
        </div>
        <Button onClick={onStartSession} icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        }>
          Start New Session
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
            label="Total Sessions" 
            value={sessions.length.toString()} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>}
        />
        <StatCard 
            label="Avg. Accuracy" 
            value={sessions.length > 0 ? `${avgAccuracy}%` : "-"} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
        />
        <StatCard 
            label="Time Recovering" 
            value={`${Math.round(totalTime / 60)} mins`} 
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
        />
      </div>

      {/* Session List */}
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 font-display">Recent Activity</h3>
        {sessions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sessions.map(session => (
                    <SessionCard key={session.id} session={session} />
                ))}
            </div>
        ) : (
            <div className="bg-gray-50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-[#778873] shadow-sm">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </div>
                <h4 className="text-lg font-bold text-gray-900">No sessions recorded</h4>
                <p className="text-slate-500 mb-6">Complete a session to see your results here. Data is stored locally for this session.</p>
                <Button variant="outline" onClick={onStartSession}>Start Now</Button>
            </div>
        )}
      </div>
    </div>
  );
};