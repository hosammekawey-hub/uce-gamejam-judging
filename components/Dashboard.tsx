
import React, { useState } from 'react';
import { Team, Rating, Judge, UserRole } from '../types';
import { RUBRIC } from '../constants';

interface DashboardProps {
  teams: Team[];
  ratings: Rating[];
  currentJudge: string;
  currentRole: UserRole;
  otherJudges: Judge[];
  onSelectTeam: (team: Team) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ teams, ratings, currentJudge, currentRole, otherJudges, onSelectTeam }) => {
  const [showRubric, setShowRubric] = useState(false);

  const getTeamStatus = (teamId: string) => {
    return ratings.some(r => r.teamId === teamId && r.judgeId === currentJudge);
  };

  const progress = teams.length > 0 
    ? Math.round((ratings.filter(r => r.judgeId === currentJudge).length / teams.length) * 100)
    : 0;

  return (
    <div className="space-y-12 animate-fadeIn">
      {/* Header with Rubric Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-6xl font-black text-slate-900 tracking-tight leading-none uppercase">
            UCE Global <span className="text-indigo-600">Game Jam</span>
          </h1>
          <p className="text-slate-500 font-bold mt-4 text-lg">
            {currentRole === 'organizer' 
              ? `Management Console: ${teams.length} submissions registered.` 
              : `Judging Portal: Reviewing ${teams.length} submissions.`}
          </p>
        </div>
        <button 
          onClick={() => setShowRubric(true)}
          className="flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
          Judging Rubric
        </button>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-8">
            <h3 className="text-indigo-600 text-xs font-black uppercase tracking-[0.25em]">Personal Progress</h3>
            <span className="bg-indigo-100 text-indigo-600 text-[10px] px-4 py-1.5 rounded-full font-black tracking-widest border border-indigo-200">{progress}%</span>
          </div>
          <div className="space-y-6">
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
              <div 
                className="bg-indigo-600 h-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(79,70,229,0.3)]" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm font-black text-slate-900">
              {ratings.filter(r => r.judgeId === currentJudge).length} <span className="text-slate-400 uppercase tracking-widest ml-1">/ {teams.length} Reviewed</span>
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[180px] flex flex-col">
          <h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.25em] mb-8">
            {currentRole === 'organizer' ? 'Judging Panel Status' : 'Peer Status'}
          </h3>
          <div className="flex-1 flex items-start justify-start overflow-y-auto max-h-[150px]">
            {otherJudges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                {otherJudges.map(judge => (
                  <div key={judge.id} className="flex items-center gap-5 bg-slate-50 border border-slate-100 px-6 py-4 rounded-3xl group hover:bg-white hover:border-indigo-200 hover:shadow-lg transition-all">
                    <div className={`w-3 h-3 rounded-full ring-4 ${
                      judge.status === 'completed' ? 'bg-green-500 ring-green-100' : 
                      judge.status === 'in-progress' ? 'bg-amber-400 ring-amber-100 animate-pulse' : 'bg-slate-300 ring-slate-100'
                    }`} />
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-none">{judge.name}</p>
                      <p className={`text-[9px] font-black uppercase mt-1 tracking-widest ${
                         judge.status === 'completed' ? 'text-green-600' : 
                         judge.status === 'in-progress' ? 'text-amber-600' : 'text-slate-400'
                      }`}>{judge.status.replace('-', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 w-full h-full flex items-center justify-center">
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Waiting for other judges to begin...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Team Grid */}
      <div className="space-y-10">
        <div className="flex items-center gap-5">
          <div className="w-3 h-12 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/30" />
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">Active Entries</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {teams.map(team => {
            const isRated = getTeamStatus(team.id);
            return (
              <div 
                key={team.id}
                onClick={() => onSelectTeam(team)}
                className="group bg-white rounded-[3rem] border border-slate-200 shadow-lg hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] hover:border-indigo-600 transition-all cursor-pointer overflow-hidden relative transform hover:-translate-y-4"
              >
                <div className="aspect-video relative overflow-hidden">
                  <img src={team.thumbnail} alt={team.gameTitle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <h3 className="text-white font-black text-3xl leading-tight tracking-tight drop-shadow-2xl">{team.gameTitle}</h3>
                    <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em] mt-3">Team {team.name}</p>
                  </div>
                  {isRated && (
                    <div className="absolute top-6 right-6 bg-green-500 text-white px-5 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-white/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Complete
                    </div>
                  )}
                </div>
                <div className="p-10">
                  <p className="text-slate-600 font-bold leading-relaxed mb-10 line-clamp-2 h-14 text-sm opacity-80 group-hover:opacity-100 transition-opacity">{team.description}</p>
                  <div className="flex justify-between items-center pt-8 border-t border-slate-100">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ID: {team.id}</span>
                    <button className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all ${
                      currentRole === 'organizer' 
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white'
                        : isRated 
                          ? 'bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white shadow-sm' 
                          : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/30'
                    }`}>
                      {currentRole === 'organizer' ? 'View Official Record' : (isRated ? 'Update' : 'Review')}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rubric Modal */}
      {showRubric && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-5xl max-h-[90vh] rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col relative">
            <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Judging Guidelines</h2>
                <p className="text-slate-500 font-bold mt-2">Official scoring breakdown for GGJ 2026.</p>
              </div>
              <button 
                onClick={() => setShowRubric(false)}
                className="w-14 h-14 bg-white hover:bg-rose-500 hover:text-white rounded-2xl transition-all text-slate-400 shadow-xl flex items-center justify-center border border-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-20">
              {RUBRIC.map(c => (
                <section key={c.id}>
                  <div className="flex items-center gap-6 mb-10">
                    <div className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-indigo-600/30">
                      {Math.round(c.weight * 100)}%
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{c.name}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {c.guidelines.map((g, idx) => (
                      <div key={idx} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 hover:border-indigo-200 transition-all group/card">
                        <div className="flex justify-between items-center mb-6">
                          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100">{g.label}</span>
                          <span className="text-xs font-black text-slate-400 tracking-widest group-hover/card:text-slate-900 transition-colors">Range: {g.range}</span>
                        </div>
                        <p className="text-sm text-slate-700 font-bold leading-relaxed">{g.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <div className="px-12 py-10 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowRubric(false)}
                className="px-12 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 hover:bg-indigo-600"
              >
                Close Rubric
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
