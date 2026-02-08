
import React, { useState, useRef, useEffect } from 'react';
import { Contestant, UserRole, CompetitionConfig, Rating } from '../types';
import { SyncService } from '../services/syncService';
import { ContestantEntrySchema } from '../utils/validation';

interface EntryManagementProps {
  teams: Contestant[];
  currentRole: UserRole;
  onAddTeam: (team: Contestant) => void;
  onRemoveTeam: (id: string) => void;
  fullState?: {
      teams: Contestant[];
      config: CompetitionConfig;
      ratings: Rating[];
      judges: string[];
  };
  onImportData?: (data: any) => void;
}

const EntryManagement: React.FC<EntryManagementProps> = ({ teams, currentRole, onAddTeam, onRemoveTeam, fullState, onImportData }) => {
  const isOrganizer = currentRole === 'organizer';
  const isContestant = currentRole === 'contestant';
  
  const existingEntry = isContestant && teams.length > 0 ? teams[0] : null;

  const [newTeam, setNewTeam] = useState({ name: '', title: '', desc: '' });
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      if (existingEntry) {
          setNewTeam({
              name: existingEntry.name,
              title: existingEntry.title,
              desc: existingEntry.description
          });
          setThumbnailUrl(existingEntry.thumbnail);
      }
  }, [existingEntry]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
          alert("Image is too large. Max size is 2MB.");
          return;
      }
      setIsUploading(true);
      try {
        const eventId = teams.length > 0 ? teams[0].id.split('_')[0] : 'uploads'; 
        const uploadedUrl = await SyncService.uploadThumbnail(file, eventId);
        
        if (uploadedUrl) {
            setThumbnailUrl(uploadedUrl);
        } else {
            alert("Upload failed. Please try again.");
        }
      } catch (err) {
        alert("Error uploading image.");
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Zod Validation
    const validation = ContestantEntrySchema.safeParse({
        name: newTeam.name,
        title: newTeam.title,
        description: newTeam.desc,
        thumbnail: thumbnailUrl
    });

    if (!validation.success) {
        alert(validation.error.issues[0].message);
        return;
    }

    if (newTeam.name && newTeam.title) {
      const idToUse = isContestant 
          ? (existingEntry ? existingEntry.id : '') 
          : (editingTeamId || '');

      const userIdToUse = isContestant 
          ? (existingEntry ? existingEntry.userId : undefined) 
          : (editingTeamId ? teams.find(t => t.id === editingTeamId)?.userId : undefined);

      onAddTeam({
        id: idToUse, 
        userId: userIdToUse,
        name: newTeam.name,
        title: newTeam.title,
        description: newTeam.desc || 'No description provided.',
        thumbnail: thumbnailUrl
      });

      if (!isContestant) {
          setNewTeam({ name: '', title: '', desc: '' });
          setThumbnailUrl('');
          setEditingTeamId(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
          alert("Entry Updated Successfully");
      }
    }
  };

  const handleEditClick = (team: Contestant) => {
      setNewTeam({
          name: team.name,
          title: team.title,
          desc: team.description
      });
      setThumbnailUrl(team.thumbnail);
      setEditingTeamId(team.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setNewTeam({ name: '', title: '', desc: '' });
      setThumbnailUrl('');
      setEditingTeamId(null);
  };

  const handleAttemptDelete = (id: string) => {
    if (!isOrganizer) return;
    if (confirmingDeleteId === id) {
      onRemoveTeam(id);
      setConfirmingDeleteId(null);
      if (editingTeamId === id) handleCancelEdit();
    } else {
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId(prev => prev === id ? null : prev), 3000);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete ALL entries?')) {
      teams.forEach(t => onRemoveTeam(t.id));
    }
  }

  const handleExport = () => {
    if (!fullState) return;
    const dataStr = JSON.stringify(fullState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `jam-judge-archive-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportData) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm("Restoring this file will OVERWRITE current event data. Continue?")) {
            onImportData(json);
        }
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tight leading-none uppercase">
              {isContestant ? 'My Entry' : <>Entry <span className="text-indigo-600">Roster</span></>}
          </h2>
          <p className="text-slate-500 font-bold mt-4 text-lg">
            {isContestant ? 'Update your submission details.' : 'Manage competition participants and entries.'}
          </p>
        </div>
        {isOrganizer && (
            <div className="flex gap-4">
              <button onClick={handleExport} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg hover:bg-indigo-600 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Archive
              </button>
              <button onClick={() => restoreInputRef.current?.click()} className="bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg hover:bg-slate-50 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Load
              </button>
              <input type="file" ref={restoreInputRef} onChange={handleImport} accept=".json" className="hidden" />
              <button onClick={handleClearAll} className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg hover:bg-rose-600 hover:text-white transition-all">Reset</button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {(isOrganizer || isContestant) && (
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 sticky top-32">
              <h3 className="text-xl font-black text-slate-900 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">{isContestant || editingTeamId ? '✎' : '＋'}</div>
                    {isContestant ? 'Edit Submission' : (editingTeamId ? 'Edit Entry' : 'Register New Entry')}
                </div>
                {editingTeamId && (
                    <button onClick={handleCancelEdit} className="text-xs text-rose-500 font-black uppercase hover:underline">Cancel</button>
                )}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Participant / Team Name</label>
                  <input 
                    value={newTeam.name}
                    onChange={e => setNewTeam({...newTeam, name: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-bold text-slate-900 placeholder-slate-300"
                    placeholder="e.g. John Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Title / Project Name</label>
                  <input 
                    value={newTeam.title}
                    onChange={e => setNewTeam({...newTeam, title: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 transition-all text-sm font-bold text-slate-900 placeholder-slate-300"
                    placeholder="e.g. Project X"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Thumbnail (Max 2MB)</label>
                  <div 
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`relative h-40 w-full rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-2 ${
                      thumbnailUrl ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    } ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    {isUploading ? (
                      <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">Uploading...</span>
                    ) : thumbnailUrl ? (
                      <img src={thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">Upload banner</span>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
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
                  disabled={isUploading}
                  className={`w-full py-5 text-white font-black uppercase tracking-[0.3em] rounded-2xl transition-all shadow-xl active:scale-95 text-[10px] disabled:bg-slate-300 ${editingTeamId ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-900 hover:bg-indigo-600'}`}
                >
                  {isContestant ? 'Update Entry' : (editingTeamId ? 'Save Changes' : 'Create Entry')}
                </button>
              </form>
            </div>
          </div>
        )}

        <div className="lg:col-span-7 space-y-6">
          {teams.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center">
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-sm">No entries found</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {teams.map(team => (
                <div 
                    key={team.id} 
                    className={`bg-white border p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-6 group hover:border-indigo-600 transition-all relative ${
                        editingTeamId === team.id ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200'
                    }`}
                >
                  <div className="flex items-center gap-8 w-full">
                    <div className="h-28 w-40 rounded-[1.5rem] overflow-hidden shadow-inner bg-slate-50 flex-shrink-0 border border-slate-100">
                      {team.thumbnail ? (
                        <img src={team.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt="" />
                      ) : (
                         <div className="w-full h-full bg-slate-200 flex items-center justify-center text-3xl">🏆</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 text-3xl tracking-tight group-hover:text-indigo-600 transition-colors leading-none mb-2 truncate">{team.title}</h4>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">By <span className="text-slate-600">{team.name}</span></p>
                      {team.description && <p className="text-slate-400 text-sm mt-3 line-clamp-1">{team.description}</p>}
                    </div>
                  </div>
                  
                  {isOrganizer && (
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <button 
                        type="button"
                        onClick={() => handleEditClick(team)}
                        className="p-4 rounded-[1.2rem] bg-slate-50 text-slate-400 hover:bg-amber-100 hover:text-amber-600 border border-slate-100 transition-all shadow-sm"
                        title="Edit"
                      >
                        <span className="text-lg">✎</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleAttemptDelete(team.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-[1.2rem] transition-all duration-300 min-w-[60px] border ${
                          confirmingDeleteId === team.id 
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xl shadow-rose-600/30' 
                          : 'bg-white text-slate-300 hover:text-rose-600 hover:border-rose-200 border-slate-100 shadow-sm'
                        }`}
                        title="Delete"
                      >
                        {confirmingDeleteId === team.id ? (
                          <span className="text-[9px] font-black uppercase tracking-tighter">Sure?</span>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

export default EntryManagement;
