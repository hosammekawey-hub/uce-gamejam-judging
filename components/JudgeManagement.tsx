
import React, { useState } from 'react';
import { Judge, Team } from '../types';

interface JudgeManagementProps {
  judges: Judge[];
  teams: Team[];
  onRemoveJudge: (judgeId: string) => void;
}

const JudgeManagement: React.FC<JudgeManagementProps> = ({ judges, teams, onRemoveJudge }) => {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleAttemptDelete = (id: string) => {
    if (confirmingDeleteId === id) {
      onRemoveJudge(id);
      setConfirmingDeleteId(null);
    } else {
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId(prev => prev === id ? null : prev), 3000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tight leading-none uppercase">Judge <span className="text-indigo-600">Roster</span></h2>
          <p className="text-slate-500 font-bold mt-4 text-lg">
            Manage the panel. Removing a judge will delete all their submitted ratings.
          </p>
        </div>
        <div className="inline-flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl font-black text-xs tracking-widest uppercase shadow-xl shadow-slate-200/50">
          <span className="w-2 h-2 bg-indigo-600 rounded-full" />
          {judges.length} Active Judges
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {judges.length === 0 ? (
          <div className="col-span-full bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center">
            <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-sm">No judges registered yet</p>
          </div>
        ) : (
          judges.map(judge => {
            // Calculate progress for UI
            // Note: The 'status' field in Judge type is derived in App.tsx based on count
            const isDone = judge.status === 'completed';
            
            return (
              <div key={judge.id} className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 hover:border-indigo-200 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-xl text-slate-400">
                    {judge.name.charAt(0).toUpperCase()}
                  </div>
                  <button 
                    onClick={() => handleAttemptDelete(judge.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      confirmingDeleteId === judge.id 
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30' 
                      : 'bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                    }`}
                  >
                    {confirmingDeleteId === judge.id ? 'Confirm?' : 'Remove'}
                  </button>
                </div>
                
                <h3 className="text-2xl font-black text-slate-900 mb-2">{judge.name}</h3>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                    isDone 
                      ? 'bg-green-50 text-green-600 border-green-200' 
                      : judge.status === 'in-progress'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {judge.status}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span>Progress</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isDone ? 'bg-green-500' : 'bg-indigo-600'}`} 
                      style={{ width: isDone ? '100%' : judge.status === 'in-progress' ? '50%' : '5%' }} 
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default JudgeManagement;
