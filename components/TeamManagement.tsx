
import React, { useState, useRef } from 'react';
import { Team, UserRole } from '../types';

interface TeamManagementProps {
  teams: Team[];
  currentRole: UserRole;
  onAddTeam: (team: Team) => void;
  onRemoveTeam: (id: string) => void;
  // We'll use a hack to clear all by passing a special call, 
  // but cleanly we should probably expose a clear prop. 
  // For now, we'll iterate remove or assuming parent handles state if we empty it.
}

const TeamManagement: React.FC<TeamManagementProps> = ({ teams, currentRole, onAddTeam, onRemoveTeam }) => {
  // Only Organizers can modify teams. Judges are strictly read-only for roster.
  const isManagementDisabled = currentRole !== 'organizer';
  
  const [newTeam, setNewTeam] = useState({ name: '', title: '', desc: '' });
  const [thumbnailBase64, setThumbnailBase64] = useState<string>('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isManagementDisabled) return;
    if (newTeam.name && newTeam.title) {
      onAddTeam({
        id: 't' + Date.now(),
        name: newTeam.name,
        gameTitle: newTeam.title,
        description: newTeam.desc || 'No description provided.',
        thumbnail: thumbnailBase64 || `https://picsum.photos/seed/${newTeam.title}/800/450`
      });
      setNewTeam({ name: '', title: '', desc: '' });
      setThumbnailBase64('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAttemptDelete = (id: string) => {
    if (isManagementDisabled) return;
    if (confirmingDeleteId === id) {
      onRemoveTeam(id);
      setConfirmingDeleteId(null);
    } else {
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId(prev => prev === id ? null : prev), 3000);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete ALL teams and ratings? This cannot be undone.')) {
      teams.forEach(t => onRemoveTeam(t.id));
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-16 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tight leading-none uppercase">Team <span className="text-indigo-600">Roster</span></h2>
          <p className="text-slate-500 font-bold mt-4 text-lg">
            {isManagementDisabled ? 'Official competition team list for 2026.' : 'Full management control: Register and manage jam participants.'}
          </p>
        </div>
        <div className="flex gap-4">
          {!isManagementDisabled && teams.length > 0 && (
             <button 
               onClick={handleClearAll}
               className="bg-rose-50 border border-rose-200 text-rose-600 px-6 py-3 rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg hover:bg-rose-600 hover:text-white transition-all"
             >
               Reset Event Data
             </button>
          )}
          <div className="inline-flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl font-black text-xs tracking-widest uppercase shadow-xl shadow-slate-200/50">
            <span className="w-2 h-2 bg-indigo-600 rounded-full" />
            {teams.length} Registered Teams
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Registration Form - Only for Organizers */}
        {!isManagementDisabled && (
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 sticky top-32">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">＋</div>
                Register New Entry
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Team Name</label>
                  <input 
                    value={newTeam.name}
                    onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-bold text-slate-900 placeholder-slate-300"
                    placeholder="e.g. Gravity Goblins"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Game Title</label>
                  <input 
                    value={newTeam.title}
                    onChange={e => setNewTeam({...newTeam, title: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-bold text-slate-900 placeholder-slate-300"
                    placeholder="e.g. Orbital Strike"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Team Banner</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative h-40 w-full rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-2 ${
                      thumbnailBase64 ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {thumbnailBase64 ? (
                      <>
                        <img src={thumbnailBase64} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="text-white font-black text-[10px] uppercase tracking-widest bg-slate-900/60 px-4 py-2 rounded-xl">Change Image</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-600">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-xs font-bold text-slate-400">Upload banner</span>
                      </>
                    )}
                    <input 
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                  <textarea 
                    value={newTeam.desc}
                    onChange={e => setNewTeam({...newTeam, desc: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-medium text-slate-900 h-24 resize-none placeholder-slate-300"
                    placeholder="Brief description..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-slate-900 text-white font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-indigo-600 transition-all shadow-xl active:scale-95 text-[10px]"
                >
                  Create Submission
                </button>
              </form>
            </div>
          </div>
        )}

        {/* List of Teams */}
        <div className={isManagementDisabled ? 'lg:col-span-12 space-y-6' : 'lg:col-span-7 space-y-6'}>
          {teams.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center">
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-sm">No submissions in system</p>
            </div>
          ) : (
            <div className={`grid gap-6 ${isManagementDisabled ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
              {teams.map(team => (
                <div key={team.id} className="bg-white border border-slate-200 p-6 pr-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex items-center justify-between group hover:border-indigo-600 transition-all">
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-32 rounded-[1.2rem] overflow-hidden shadow-inner bg-slate-50 flex-shrink-0 border border-slate-100">
                      <img src={team.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-xl tracking-tight group-hover:text-indigo-600 transition-colors leading-tight">{team.gameTitle}</h4>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">By {team.name}</p>
                    </div>
                  </div>
                  
                  {!isManagementDisabled && (
                    <div className="flex items-center">
                      <button 
                        type="button"
                        onClick={() => handleAttemptDelete(team.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-[1.2rem] transition-all duration-300 min-w-[70px] border ${
                          confirmingDeleteId === team.id 
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xl shadow-rose-600/30' 
                          : 'bg-white text-slate-300 hover:text-rose-600 hover:border-rose-200 border-slate-100 shadow-sm'
                        }`}
                      >
                        {confirmingDeleteId === team.id ? (
                          <span className="text-[9px] font-black uppercase tracking-tighter">Confirm?</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
