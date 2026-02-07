
import React, { useState, useEffect } from 'react';
import { Contestant, Rating, Judge, UserRole, Criterion, CompetitionConfig } from '../types';

interface DashboardProps {
  title: string;
  competitionId?: string;
  rubric: Criterion[];
  teams: Contestant[];
  ratings: Rating[];
  currentJudge: string;
  currentRole: UserRole;
  otherJudges: Judge[];
  onSelectTeam: (team: Contestant) => void;
  tieBreakers?: { title: string; question: string }[];
  onUpdateConfig?: (rubric: Criterion[], tieBreakers: { title: string; question: string }[]) => void;
  onUpdateSettings?: (settings: Partial<CompetitionConfig>) => void;
  onDeleteEvent?: () => void;
  canEditRubric?: boolean;
  eventSettings?: { visibility: 'public' | 'private'; registration: 'open' | 'closed'; viewPass?: string; organizerPass?: string; judgePass?: string };
}

const Dashboard: React.FC<DashboardProps> = ({ 
  title,
  competitionId,
  rubric, 
  teams, 
  ratings, 
  currentJudge, 
  currentRole, 
  otherJudges, 
  onSelectTeam, 
  tieBreakers,
  onUpdateConfig,
  onUpdateSettings,
  onDeleteEvent,
  canEditRubric,
  eventSettings
}) => {
  const [showRubric, setShowRubric] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // Local state for editing
  const [tempRubric, setTempRubric] = useState<Criterion[]>([]);
  const [tempTieBreakers, setTempTieBreakers] = useState<{ title: string; question: string }[]>([]);

  // Local state for settings
  const [tempTitle, setTempTitle] = useState('');
  const [tempVisibility, setTempVisibility] = useState<'public' | 'private'>('public');
  const [tempRegistration, setTempRegistration] = useState<'open' | 'closed'>('closed');
  const [tempViewPass, setTempViewPass] = useState('');
  const [tempOrgPass, setTempOrgPass] = useState('');
  const [tempJudgePass, setTempJudgePass] = useState('');

  useEffect(() => {
    if (showRubric) {
      setTempRubric(JSON.parse(JSON.stringify(rubric)));
      setTempTieBreakers(tieBreakers ? JSON.parse(JSON.stringify(tieBreakers)) : []);
      setIsEditing(false);
    }
  }, [showRubric, rubric, tieBreakers]);

  useEffect(() => {
      if (showSettings) {
          setTempTitle(title);
          if (eventSettings) {
            setTempVisibility(eventSettings.visibility);
            setTempRegistration(eventSettings.registration);
            setTempViewPass(eventSettings.viewPass || '');
            setTempOrgPass(eventSettings.organizerPass || '');
            setTempJudgePass(eventSettings.judgePass || '');
          }
      }
  }, [showSettings, eventSettings, title]);

  const handleSave = () => {
    const totalWeight = tempRubric.reduce((acc, c) => acc + c.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.05) {
        alert(`Total weight must equal 100%. Current: ${(totalWeight * 100).toFixed(0)}%`);
        return;
    }
    
    if (onUpdateConfig) {
        onUpdateConfig(tempRubric, tempTieBreakers);
    }
    setIsEditing(false);
  };

  const handleSaveSettings = () => {
      if (tempVisibility === 'private' && !tempViewPass.trim()) {
          alert("Private events require an Access Key.");
          return;
      }

      if (onUpdateSettings) {
          onUpdateSettings({
              title: tempTitle,
              visibility: tempVisibility,
              registration: tempRegistration,
              viewPass: tempViewPass,
              organizerPass: tempOrgPass,
              judgePass: tempJudgePass
          });
      }
      setShowSettings(false);
  };

  const handleRubricChange = (idx: number, field: keyof Criterion, value: any) => {
    const updated = [...tempRubric];
    updated[idx] = { ...updated[idx], [field]: value };
    setTempRubric(updated);
  };

  const handleGuidelineChange = (cIdx: number, gIdx: number, field: 'label' | 'text' | 'range', value: string) => {
    const updated = [...tempRubric];
    updated[cIdx].guidelines[gIdx] = { ...updated[cIdx].guidelines[gIdx], [field]: value };
    setTempRubric(updated);
  };

  const handleTieBreakerChange = (idx: number, field: 'title' | 'question', value: string) => {
    const updated = [...tempTieBreakers];
    updated[idx] = { ...updated[idx], [field]: value };
    setTempTieBreakers(updated);
  };

  const getTeamStatus = (teamId: string) => {
    return ratings.some(r => r.teamId === teamId && r.judgeId === currentJudge);
  };

  const calculateJudgeStatus = (judgeId: string): { label: string, color: 'slate' | 'amber' | 'green', percent: number } => {
      if (teams.length === 0) return { label: 'Joined', color: 'slate', percent: 0 };
      
      const count = ratings.filter(r => r.judgeId === judgeId).length;
      if (count === 0) return { label: 'Joined', color: 'slate', percent: 0 };
      if (count >= teams.length) return { label: 'Completed', color: 'green', percent: 100 };
      return { label: 'In Progress', color: 'amber', percent: Math.round((count / teams.length) * 100) };
  };

  const progress = teams.length > 0 
    ? Math.round((ratings.filter(r => r.judgeId === currentJudge).length / teams.length) * 100)
    : 0;

  return (
    <div className="space-y-12 animate-fadeIn">
      {/* Header with Rubric Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-none uppercase">
            {title}
          </h1>
          {competitionId && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-lg border border-slate-200">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ID:</span>
               <code className="text-sm font-bold text-slate-700 select-all">{competitionId}</code>
            </div>
          )}
          <p className="text-slate-500 font-bold mt-4 text-lg">
            {currentRole === 'organizer' 
              ? `Management Console: ${teams.length} entries registered.` 
              : currentRole === 'judge'
                ? `Judging Portal: Reviewing ${teams.length} entries.`
                : `Event Overview: ${teams.length} active entries.`}
          </p>
        </div>
        <div className="flex gap-4">
            {currentRole === 'organizer' && (
                <button 
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-3 px-8 py-5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-[0.25em] hover:bg-slate-50 transition-all shadow-xl active:scale-95"
                >
                    Settings
                </button>
            )}
            <button 
            onClick={() => setShowRubric(true)}
            className="flex items-center gap-4 px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.25em] hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            Judging Criteria
            </button>
        </div>
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
                {otherJudges.map(judge => {
                  const status = calculateJudgeStatus(judge.id);
                  return (
                    <div key={judge.id} className="flex items-center gap-5 bg-slate-50 border border-slate-100 px-6 py-4 rounded-3xl group hover:bg-white hover:border-indigo-200 hover:shadow-lg transition-all">
                      <div className={`w-3 h-3 rounded-full ring-4 ${
                        status.color === 'green' ? 'bg-green-500 ring-green-100' : 
                        status.color === 'amber' ? 'bg-amber-400 ring-amber-100 animate-pulse' : 'bg-slate-300 ring-slate-100'
                      }`} />
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-black text-slate-900 leading-none">{judge.name}</p>
                            <span className="text-[9px] font-black text-slate-300">{status.percent}%</span>
                        </div>
                        <p className={`text-[9px] font-black uppercase mt-1 tracking-widest ${
                           status.color === 'green' ? 'text-green-600' : 
                           status.color === 'amber' ? 'text-amber-600' : 'text-slate-400'
                        }`}>{status.label}</p>
                      </div>
                    </div>
                  );
                })}
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

      {/* Contestant Grid */}
      <div className="space-y-10">
        <div className="flex items-center gap-5">
          <div className="w-3 h-12 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/30" />
          <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">Active Entries</h2>
        </div>
        {teams.length === 0 ? (
            <div className="text-center py-12 bg-slate-100 rounded-[3rem] border border-slate-200">
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No entries yet. Organizer must add participants.</p>
            </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {teams.map(team => {
            const isRated = getTeamStatus(team.id);
            
            let actionLabel = 'View Stats';
            let actionClass = 'bg-slate-100 text-slate-600 hover:bg-slate-200';

            if (currentRole === 'organizer') {
                actionLabel = 'View Record';
                actionClass = 'bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white';
            } else if (currentRole === 'judge') {
                actionLabel = isRated ? 'Update' : 'Evaluate';
                actionClass = isRated 
                    ? 'bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white shadow-sm' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/30';
            }

            return (
              <div 
                key={team.id}
                onClick={() => onSelectTeam(team)}
                className="group bg-white rounded-[3rem] border border-slate-200 shadow-lg hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] hover:border-indigo-600 transition-all cursor-pointer overflow-hidden relative transform hover:-translate-y-4"
              >
                <div className="aspect-video relative overflow-hidden bg-slate-200">
                  {team.thumbnail ? (
                     <img src={team.thumbnail} alt={team.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">🏆</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                  <div className="absolute bottom-8 left-8 right-8">
                    <h3 className="text-white font-black text-3xl leading-tight tracking-tight drop-shadow-2xl">{team.title}</h3>
                    <p className="text-indigo-400 text-xs font-black uppercase tracking-[0.3em] mt-3">{team.name}</p>
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
                    <button className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] transition-all ${actionClass}`}>
                      {actionLabel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
              <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden max-h-[90vh] overflow-y-auto">
                  <div className="px-10 py-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Event Settings</h2>
                        <p className="text-slate-500 text-xs font-bold mt-1">Control access and visibility.</p>
                    </div>
                    <button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-md">✕</button>
                  </div>
                  <div className="p-10 space-y-8">
                       <div className="space-y-4">
                           <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Event Name</h3>
                           <input 
                               value={tempTitle}
                               onChange={e => setTempTitle(e.target.value)}
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                               placeholder="Event Title"
                           />
                       </div>

                       <div className="space-y-4">
                           <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Registration Status</h3>
                           <div className="flex gap-2">
                               <button 
                                onClick={() => setTempRegistration('open')} 
                                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${tempRegistration === 'open' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                               >
                                   Open
                               </button>
                               <button 
                                onClick={() => setTempRegistration('closed')} 
                                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${tempRegistration === 'closed' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                               >
                                   Closed
                               </button>
                           </div>
                           <p className="text-[10px] text-slate-400">If closed, only you (the organizer) can add new entries.</p>
                       </div>

                       <div className="space-y-4">
                           <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Visibility</h3>
                           <div className="flex gap-2">
                               <button 
                                onClick={() => setTempVisibility('public')} 
                                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${tempVisibility === 'public' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                               >
                                   Public
                               </button>
                               <button 
                                onClick={() => setTempVisibility('private')} 
                                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${tempVisibility === 'private' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}
                               >
                                   Private
                               </button>
                           </div>
                           {tempVisibility === 'private' && (
                               <div className="animate-slideUp">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                                       View Password <span className="text-rose-500">*</span>
                                   </label>
                                   <input 
                                     value={tempViewPass}
                                     onChange={e => setTempViewPass(e.target.value)}
                                     className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold ${!tempViewPass.trim() ? 'border-rose-300 focus:border-rose-500' : 'border-slate-200'}`}
                                     placeholder="Set access key (Required)"
                                   />
                               </div>
                           )}
                       </div>

                       <div className="space-y-4 pt-4 border-t border-slate-100">
                           <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Security & Access</h3>
                           <div className="grid grid-cols-1 gap-4">
                               <div>
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Guest Organizer Password</label>
                                   <input 
                                     type="text"
                                     value={tempOrgPass}
                                     onChange={e => setTempOrgPass(e.target.value)}
                                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold font-mono text-slate-900"
                                     placeholder="Set organizer password"
                                   />
                                   <p className="text-[10px] text-slate-400 mt-2">Required for managing this event without a Google Account.</p>
                               </div>
                               <div>
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Judge Password</label>
                                   <input 
                                     type="text"
                                     value={tempJudgePass}
                                     onChange={e => setTempJudgePass(e.target.value)}
                                     className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold font-mono text-slate-900"
                                     placeholder="Set judge password"
                                   />
                                   <p className="text-[10px] text-slate-400 mt-2">Required for judges to join the event.</p>
                               </div>
                           </div>
                       </div>

                       <div className="pt-4 space-y-4">
                           <button 
                            onClick={handleSaveSettings}
                            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-indigo-600 shadow-xl"
                           >
                               Save Changes
                           </button>

                           {onDeleteEvent && (
                               <div className="pt-6 border-t border-slate-100">
                                   <h3 className="font-black text-sm uppercase tracking-wider text-rose-600 mb-2">Danger Zone</h3>
                                   <button 
                                    onClick={onDeleteEvent}
                                    className="w-full py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-600 hover:text-white transition-all"
                                   >
                                       Delete Event Permanently
                                   </button>
                               </div>
                           )}
                       </div>
                  </div>
              </div>
          </div>
      )}

      {/* Rubric Modal */}
      {showRubric && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-5xl max-h-[90vh] rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col relative">
            <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Judging Guidelines</h2>
                <p className="text-slate-500 font-bold mt-2">Official scoring breakdown.</p>
              </div>
              <div className="flex gap-4">
                  {canEditRubric && !isEditing && (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="px-6 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-200 transition-all border border-indigo-200"
                      >
                        Edit Rubric
                      </button>
                  )}
                  <button 
                    onClick={() => setShowRubric(false)}
                    className="w-14 h-14 bg-white hover:bg-rose-500 hover:text-white rounded-2xl transition-all text-slate-400 shadow-xl flex items-center justify-center border border-slate-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-12 space-y-20">
              {/* EDIT MODE */}
              {isEditing ? (
                  <>
                    <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl mb-8">
                        <p className="text-amber-800 font-bold text-sm">Editing Mode Active</p>
                        <p className="text-amber-700 text-xs mt-1">Changes here will update the rubric for all judges instantly. Ensure Total Weight sums to 100%.</p>
                    </div>
                    {tempRubric.map((c, idx) => (
                        <section key={c.id} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 relative">
                            <div className="flex flex-col md:flex-row gap-6 mb-6">
                                <div className="flex-1 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Criterion Name</label>
                                    <input 
                                        value={c.name} 
                                        onChange={e => handleRubricChange(idx, 'name', e.target.value)}
                                        className="w-full font-black text-2xl bg-white border border-slate-200 rounded-xl px-4 py-2"
                                    />
                                </div>
                                <div className="w-32 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weight (0-1)</label>
                                    <input 
                                        type="number" 
                                        step="0.05"
                                        value={c.weight}
                                        onChange={e => handleRubricChange(idx, 'weight', parseFloat(e.target.value))}
                                        className="w-full font-black text-2xl bg-white border border-slate-200 rounded-xl px-4 py-2 text-center"
                                    />
                                </div>
                            </div>
                            <div className="mb-6 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
                                <textarea 
                                    value={c.description} 
                                    onChange={e => handleRubricChange(idx, 'description', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium"
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {c.guidelines.map((g, gIdx) => (
                                    <div key={gIdx} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                                        <div className="flex gap-2">
                                            <input 
                                                value={g.label} 
                                                onChange={e => handleGuidelineChange(idx, gIdx, 'label', e.target.value)}
                                                className="flex-1 text-[10px] font-black uppercase tracking-widest bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-indigo-600"
                                            />
                                            <input 
                                                value={g.range} 
                                                onChange={e => handleGuidelineChange(idx, gIdx, 'range', e.target.value)}
                                                className="w-16 text-[10px] font-black text-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                                            />
                                        </div>
                                        <textarea 
                                            value={g.text} 
                                            onChange={e => handleGuidelineChange(idx, gIdx, 'text', e.target.value)}
                                            className="w-full text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 resize-none h-16"
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))}

                    <section className="pt-8 border-t border-slate-200">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-6">Tie Breakers</h3>
                        <div className="space-y-4">
                            {tempTieBreakers.map((tb, i) => (
                                <div key={i} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col gap-3">
                                    <input 
                                        value={tb.title} 
                                        onChange={e => handleTieBreakerChange(i, 'title', e.target.value)}
                                        className="font-black text-sm uppercase bg-white border border-slate-200 rounded-lg px-3 py-2"
                                        placeholder="Question Title"
                                    />
                                    <textarea 
                                        value={tb.question}
                                        onChange={e => handleTieBreakerChange(i, 'question', e.target.value)}
                                        className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 resize-none h-16"
                                        placeholder="Question Text"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                  </>
              ) : (
                /* READ ONLY MODE */
                <>
                  {rubric.map(c => (
                    <section key={c.id}>
                      <div className="flex items-center gap-6 mb-10">
                        <div className="bg-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black text-sm tracking-widest shadow-xl shadow-indigo-600/30">
                          {Math.round(c.weight * 100)}%
                        </div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase">{c.name}</h3>
                      </div>
                      <p className="text-slate-500 font-bold mb-6 italic">{c.description}</p>
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

                  {tieBreakers && tieBreakers.length > 0 && (
                    <section className="border-t border-slate-100 pt-16">
                      <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase mb-8">⚖️ Tie-Breaker Questions</h3>
                      <div className="bg-indigo-50 rounded-[2.5rem] p-10 space-y-6 border border-indigo-100">
                          <p className="text-indigo-900 font-bold text-lg">In the event of a tie between two top teams, use these questions to decide the winner:</p>
                          <ul className="space-y-4">
                            {tieBreakers.map((tb, i) => (
                                <li key={i} className="flex items-start gap-4">
                                  <span className="w-8 h-8 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center font-black text-sm flex-shrink-0">{i + 1}</span>
                                  <div>
                                    <span className="block font-black text-indigo-900 uppercase tracking-wide text-xs mb-1">{tb.title}</span>
                                    <span className="text-indigo-800 font-medium">{tb.question}</span>
                                  </div>
                                </li>
                            ))}
                          </ul>
                      </div>
                    </section>
                  )}

                  <section>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase mb-8">🛑 Disqualification Check</h3>
                    <div className="bg-rose-50 rounded-[2.5rem] p-10 border border-rose-100 flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-500 flex items-center justify-center text-3xl">🚫</div>
                        <div>
                          <p className="text-rose-900 font-black uppercase tracking-widest text-sm mb-2">Mandatory Check</p>
                          <p className="text-rose-800 font-bold text-lg">Did the team use offensive or discriminatory content? (Yes/No)</p>
                        </div>
                    </div>
                  </section>
                </>
              )}
            </div>

            <div className="px-12 py-10 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              {isEditing ? (
                  <>
                    <button 
                        onClick={() => setIsEditing(false)}
                        className="px-8 py-5 bg-white border border-slate-200 text-slate-500 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        className="px-12 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-indigo-500"
                    >
                        Save Changes
                    </button>
                  </>
              ) : (
                  <button 
                    onClick={() => setShowRubric(false)}
                    className="px-12 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 hover:bg-indigo-600"
                  >
                    Close Rubric
                  </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
