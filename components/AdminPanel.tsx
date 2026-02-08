
import React, { useState, useEffect } from 'react';
import { GlobalSettings, CompetitionTemplate, Criterion } from '../types';
import { SyncService } from '../services/syncService';
import { DEFAULT_RUBRIC } from '../constants';

interface AdminPanelProps {
  initialSettings: GlobalSettings;
  onUpdateSettings: (newSettings: GlobalSettings) => void;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ initialSettings, onUpdateSettings, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'events' | 'templates'>('events');
  const [settings, setSettings] = useState<GlobalSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  
  // Event Inspector State
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  // Template Builder State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CompetitionTemplate>({
    id: '',
    label: '',
    icon: '🏆',
    description: '',
    rubric: JSON.parse(JSON.stringify(DEFAULT_RUBRIC)),
    tieBreakers: []
  });

  useEffect(() => {
      if (activeTab === 'events') {
          loadEvents();
      }
  }, [activeTab]);

  const loadEvents = async () => {
      setIsLoadingEvents(true);
      const evts = await SyncService.getAllEventsAdmin();
      setAllEvents(evts || []);
      setIsLoadingEvents(false);
  };

  const handleDeleteEvent = async (id: string) => {
      if (window.confirm(`DANGER: Are you sure you want to completely nuke event '${id}'? This cannot be undone.`)) {
          // Admin can delete without password by passing a special flag or just using RLS if configured (here we use the RPC which usually requires a pass, but let's assume admin has DB access or we update RPC later. For now, we simulate success or use SyncService's existing delete which might fail if we don't have the organizer pass.
          // Note: Real admin panel should use a specific admin RPC. For this prototype, we'll try the standard delete.
          const success = await SyncService.deleteEvent(id); 
          if (success) {
              setAllEvents(prev => prev.filter(e => e.id !== id));
          } else {
              alert("Could not delete. You may need to use the Supabase dashboard if you don't have the event password.");
          }
      }
  }

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setStatusMsg('');
    const success = await SyncService.saveGlobalSettings(settings);
    if (success) {
      setStatusMsg('Templates saved successfully.');
      onUpdateSettings(settings);
    } else {
      setStatusMsg('Failed to save settings.');
    }
    setIsSaving(false);
  };

  const openEditor = (template?: CompetitionTemplate) => {
    if (template) {
        setEditingTemplate(JSON.parse(JSON.stringify(template)));
    } else {
        setEditingTemplate({
            id: '',
            label: '',
            icon: '🏆',
            description: '',
            rubric: JSON.parse(JSON.stringify(DEFAULT_RUBRIC)),
            tieBreakers: []
        });
    }
    setIsEditorOpen(true);
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate.label || !editingTemplate.description) {
        alert("Please provide a name and description.");
        return;
    }

    const updatedTemplates = [...settings.templates];
    if (editingTemplate.id) {
        // Edit existing
        const idx = updatedTemplates.findIndex(t => t.id === editingTemplate.id);
        if (idx >= 0) {
            updatedTemplates[idx] = editingTemplate;
        } else {
            updatedTemplates.push(editingTemplate);
        }
    } else {
        // Create new
        editingTemplate.id = editingTemplate.label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
        updatedTemplates.push(editingTemplate);
    }
    
    setSettings(prev => ({
        ...prev,
        templates: updatedTemplates
    }));
    setIsEditorOpen(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm("Are you sure you want to delete this template?")) {
        setSettings(prev => ({
            ...prev,
            templates: prev.templates.filter(t => t.id !== id)
        }));
    }
  };

  const handleRubricChange = (idx: number, field: keyof Criterion, value: any) => {
      const updated = [...editingTemplate.rubric];
      updated[idx] = { ...updated[idx], [field]: value };
      setEditingTemplate(prev => ({ ...prev, rubric: updated }));
  };

  const handleGuidelineChange = (cIdx: number, gIdx: number, field: 'text', value: string) => {
      const updated = [...editingTemplate.rubric];
      updated[cIdx].guidelines[gIdx] = { ...updated[cIdx].guidelines[gIdx], text: value };
      setEditingTemplate(prev => ({ ...prev, rubric: updated }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 animate-fadeIn selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-8 border-b border-slate-800 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-2">System Admin</h1>
            <p className="text-slate-500 font-bold">Global control panel & oversight.</p>
          </div>
          <button 
            onClick={onLogout}
            className="px-6 py-3 bg-slate-900 border border-slate-700 hover:bg-rose-900/50 hover:text-rose-200 hover:border-rose-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
          >
            Logout
          </button>
        </div>

        {/* Navigation */}
        <div className="flex flex-wrap gap-4">
            <button 
                onClick={() => setActiveTab('events')}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${activeTab === 'events' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}
            >
                Event Inspector
            </button>
            <button 
                onClick={() => setActiveTab('templates')}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${activeTab === 'templates' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}
            >
                Templates
            </button>
            
            {activeTab === 'templates' && (
                <button 
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className={`ml-auto px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg border ${isSaving ? 'bg-slate-700 border-slate-600 cursor-wait' : 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500'}`}
                >
                    {isSaving ? 'Saving...' : 'Save Global Changes'}
                </button>
            )}
        </div>
        
        {statusMsg && (
            <div className={`p-4 rounded-xl border font-bold text-center animate-slideUp ${statusMsg.includes('Success') ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400' : 'bg-rose-950/50 border-rose-500/30 text-rose-400'}`}>
                {statusMsg}
            </div>
        )}

        {/* EVENTS TAB (INSPECTOR) */}
        {activeTab === 'events' && (
            <div className="space-y-6 animate-slideUp">
                <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 overflow-hidden">
                    <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="text-xl font-black text-white">Active Competitions</h3>
                        <button onClick={loadEvents} className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white">Refresh List</button>
                    </div>

                    {isLoadingEvents ? (
                        <div className="py-20 text-center text-slate-500 font-bold animate-pulse">Scanning database...</div>
                    ) : allEvents.length === 0 ? (
                        <div className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-sm">No active events found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        <th className="px-6 py-4">Event ID</th>
                                        <th className="px-6 py-4">Title</th>
                                        <th className="px-6 py-4">Created At</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {allEvents.map(evt => (
                                        <tr key={evt.id} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-indigo-400 font-bold text-sm">{evt.id}</td>
                                            <td className="px-6 py-4 font-bold text-white">{evt.title}</td>
                                            <td className="px-6 py-4 text-xs text-slate-400 font-mono">{new Date(evt.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => handleDeleteEvent(evt.id)}
                                                    className="px-4 py-2 bg-rose-950 text-rose-500 border border-rose-900/50 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    Nuke
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
            <div className="space-y-8 animate-slideUp">
                {!isEditorOpen ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <button 
                            onClick={() => openEditor()}
                            className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 hover:border-indigo-500 hover:bg-slate-800 transition-all group min-h-[250px]"
                        >
                            <span className="text-4xl group-hover:scale-110 transition-transform text-slate-700 group-hover:text-indigo-500">＋</span>
                            <span className="font-black uppercase tracking-widest text-sm text-slate-500 group-hover:text-white">New Template</span>
                        </button>
                        {settings.templates.map(t => (
                            <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 relative group hover:border-indigo-500/50 transition-colors">
                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openEditor(t)}
                                        className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-indigo-600 hover:text-white transition-all border border-slate-700"
                                        title="Edit Template"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteTemplate(t.id)}
                                        className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-rose-600 hover:text-white transition-all border border-slate-700"
                                        title="Delete Template"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div className="text-4xl mb-4">{t.icon}</div>
                                <h3 className="text-xl font-black mb-2 text-white">{t.label}</h3>
                                <p className="text-sm text-slate-400 font-bold mb-4 line-clamp-2">{t.description}</p>
                                <div className="text-xs text-slate-600 font-mono bg-slate-950 p-2 rounded-lg border border-slate-800 inline-block">
                                    {t.rubric.length} Criteria • {t.tieBreakers.length} Tie-Breakers
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-[2.5rem] space-y-8 animate-fadeIn">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                            <h3 className="text-2xl font-black text-white">{editingTemplate.id ? 'Edit Template' : 'Design Template'}</h3>
                            <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm uppercase tracking-wider">Cancel</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Name</label>
                                <input 
                                    value={editingTemplate.label}
                                    onChange={e => setEditingTemplate({...editingTemplate, label: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                                    placeholder="e.g. Cosplay Contest"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Icon (Emoji)</label>
                                <input 
                                    value={editingTemplate.icon}
                                    onChange={e => setEditingTemplate({...editingTemplate, icon: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-white focus:border-indigo-500 outline-none"
                                    placeholder="🎭"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Description</label>
                                <input 
                                    value={editingTemplate.description}
                                    onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                                    placeholder="Short description..."
                                />
                            </div>
                        </div>

                        <div className="space-y-6 pt-6">
                             <div className="flex justify-between items-center">
                                <h4 className="text-lg font-black text-indigo-400">Rubric Criteria</h4>
                                <div className="text-xs text-slate-500 font-bold">Ensure weights sum to 1.0</div>
                             </div>
                             {editingTemplate.rubric.map((c, i) => (
                                 <div key={i} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                                     <div className="flex gap-4 items-center">
                                        <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center text-xs font-bold shrink-0 text-indigo-300">{i+1}</div>
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] text-slate-600 uppercase font-black">Criterion Name</label>
                                            <input 
                                                value={c.name}
                                                onChange={e => handleRubricChange(i, 'name', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div className="w-24 space-y-1">
                                            <label className="text-[10px] text-slate-600 uppercase font-black">Weight</label>
                                            <input 
                                                type="number"
                                                step="0.05"
                                                value={c.weight}
                                                onChange={e => handleRubricChange(i, 'weight', parseFloat(e.target.value))}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center text-white focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                                     </div>
                                     
                                     <div className="space-y-1">
                                         <label className="text-[10px] text-slate-600 uppercase font-black">Description</label>
                                         <textarea 
                                             value={c.description}
                                             onChange={e => handleRubricChange(i, 'description', e.target.value)}
                                             className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs h-16 resize-none text-slate-300 focus:border-indigo-500 outline-none"
                                             placeholder="Explain this criterion..."
                                         />
                                     </div>

                                     <details className="group/details">
                                         <summary className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer hover:text-indigo-400 list-none flex items-center gap-2">
                                             <span className="group-open/details:rotate-90 transition-transform">▶</span> Edit Guidelines
                                         </summary>
                                         <div className="mt-4 grid grid-cols-1 gap-2 pl-4 border-l border-slate-800">
                                            {c.guidelines.map((g, gi) => (
                                                <div key={gi} className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                                    <span className="text-[10px] text-indigo-400 font-bold text-right">{g.label} ({g.range})</span>
                                                    <input 
                                                        value={g.text}
                                                        onChange={e => handleGuidelineChange(i, gi, 'text', e.target.value)}
                                                        className="bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1 text-[10px] w-full text-slate-300 focus:border-indigo-500 outline-none"
                                                    />
                                                </div>
                                            ))}
                                         </div>
                                     </details>
                                 </div>
                             ))}
                        </div>

                        <button 
                            onClick={handleSaveTemplate}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-600/20"
                        >
                            Save Template
                        </button>
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;
