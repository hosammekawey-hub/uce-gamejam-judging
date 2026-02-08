
import React, { useState, useEffect } from 'react';
import { GlobalSettings, CompetitionTemplate, Criterion, SystemAdmin, CompetitionConfig } from '../types';
import { SyncService } from '../services/syncService';
import { DEFAULT_RUBRIC } from '../constants';
import { useAuth } from '../contexts/AuthContext';

interface AdminPanelProps {
  initialSettings: GlobalSettings;
  onUpdateSettings: (newSettings: GlobalSettings) => void;
  onLogout: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ initialSettings, onUpdateSettings, onLogout }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'events' | 'templates' | 'admins'>('events');
  const [settings, setSettings] = useState<GlobalSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  
  // Event Inspector State
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null); // For Event Edit Modal

  // Admin Management State
  const [adminList, setAdminList] = useState<SystemAdmin[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);

  // Derived Access State
  const currentAdmin = adminList.find(a => a.email === user?.email);
  const isMaster = currentAdmin?.role === 'master';

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
      } else if (activeTab === 'admins') {
          loadAdmins();
      }
  }, [activeTab]);

  const loadEvents = async () => {
      setIsLoadingEvents(true);
      const evts = await SyncService.getAllEventsAdmin();
      setAllEvents(evts || []);
      setIsLoadingEvents(false);
  };

  const loadAdmins = async () => {
      setIsLoadingAdmins(true);
      const admins = await SyncService.getSystemAdmins();
      setAdminList(admins);
      setIsLoadingAdmins(false);
  }

  const handleAddAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isMaster) {
          alert("Only the Master SysAdmin can add new admins.");
          return;
      }
      if (!newAdminEmail.includes('@')) return;
      
      const res = await SyncService.addSystemAdmin(newAdminEmail);
      if (res.success) {
          setNewAdminEmail('');
          loadAdmins();
          setStatusMsg('Admin added successfully.');
      } else {
          setStatusMsg(res.message || 'Failed to add admin.');
      }
      setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleRemoveAdmin = async (email: string) => {
      if (!isMaster) return;
      if (email === user?.email) {
          alert("You cannot remove your own admin access.");
          return;
      }
      if (window.confirm(`Revoke System Admin access for ${email}?`)) {
          const success = await SyncService.removeSystemAdmin(email);
          if (success) {
              loadAdmins();
          } else {
              alert("Failed to remove admin. Ensure you are the Master Admin.");
          }
      }
  };

  const handlePromoteToMaster = async (email: string) => {
      if (!isMaster) return;
      if (window.confirm(`DANGER: Are you sure you want to transfer ownership to ${email}? You will lose Master privileges and become a regular admin.`)) {
          const res = await SyncService.transferMasterRole(email);
          if (res.success) {
              alert("Ownership Transferred.");
              // Reload page to reflect permission changes (simple way to refresh UI state)
              window.location.reload();
          } else {
              alert(`Failed to transfer ownership: ${res.message}`);
          }
      }
  };

  const handleDeleteEvent = async (id: string) => {
      if (window.confirm(`DANGER: Are you sure you want to completely nuke event '${id}'? This cannot be undone.`)) {
          const success = await SyncService.deleteEvent(id); 
          if (success) {
              setAllEvents(prev => prev.filter(e => e.id !== id));
          } else {
              alert("Could not delete. You may need to use the Supabase dashboard if you don't have the event password.");
          }
      }
  }

  // --- EVENT EDITING LOGIC ---

  const openEventEditor = (event: any) => {
      setEditingEvent({ ...event }); // Clone to avoid direct mutation
  };

  const closeEventEditor = () => {
      setEditingEvent(null);
  };

  const handleSaveEventChanges = async () => {
      if (!editingEvent) return;

      const payload: Partial<CompetitionConfig> = {
          title: editingEvent.title,
          organizerPass: editingEvent.organizer_pass,
          judgePass: editingEvent.judge_pass,
          viewPass: editingEvent.view_pass,
          visibility: editingEvent.visibility,
          registration: editingEvent.registration,
          organizerId: editingEvent.organizer_id
      };

      const success = await SyncService.updateEventConfig(editingEvent.id, payload);
      if (success) {
          setAllEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...editingEvent } : e));
          setStatusMsg('Event configuration updated successfully.');
          closeEventEditor();
      } else {
          alert('Failed to update event configuration.');
      }
      setTimeout(() => setStatusMsg(''), 3000);
  };


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
          <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                  <p className="text-xs font-black text-white">{user?.email}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${isMaster ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {isMaster ? 'Master SysAdmin' : 'Admin'}
                  </p>
              </div>
              <button 
                onClick={onLogout}
                className="px-6 py-3 bg-slate-900 border border-slate-700 hover:bg-rose-900/50 hover:text-rose-200 hover:border-rose-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Logout
              </button>
          </div>
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
            <button 
                onClick={() => setActiveTab('admins')}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all border ${activeTab === 'admins' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-600'}`}
            >
                Manage Admins
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
            <div className={`p-4 rounded-xl border font-bold text-center animate-slideUp ${statusMsg.includes('Success') || statusMsg.includes('successfully') ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-400' : 'bg-rose-950/50 border-rose-500/30 text-rose-400'}`}>
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
                                        <th className="px-6 py-4">Organizer ID</th>
                                        <th className="px-6 py-4">Created At</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                    {allEvents.map(evt => (
                                        <tr key={evt.id} className="hover:bg-slate-800/50 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-indigo-400 font-bold text-sm">{evt.id}</td>
                                            <td className="px-6 py-4 font-bold text-white">{evt.title}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-500 truncate max-w-[150px]">{evt.organizer_id}</td>
                                            <td className="px-6 py-4 text-xs text-slate-400 font-mono">{new Date(evt.created_at).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button 
                                                    onClick={() => openEventEditor(evt)}
                                                    className="px-4 py-2 bg-indigo-900/50 text-indigo-400 border border-indigo-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    Edit
                                                </button>
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

        {/* ADMINS TAB */}
        {activeTab === 'admins' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slideUp">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8">
                     <div className="flex justify-between items-center mb-6 px-2">
                        <h3 className="text-xl font-black text-white">Authorized Administrators</h3>
                        <button onClick={loadAdmins} className="text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white">Refresh</button>
                    </div>
                    {isLoadingAdmins ? (
                         <div className="py-20 text-center text-slate-500 font-bold animate-pulse">Loading admins...</div>
                    ) : (
                        <div className="space-y-4">
                            {adminList.map(admin => (
                                <div key={admin.email} className={`flex justify-between items-center p-4 rounded-xl border transition-all ${admin.role === 'master' ? 'bg-amber-900/10 border-amber-500/30' : 'bg-slate-950 border-slate-800'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${admin.role === 'master' ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                                            {admin.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className={`font-bold text-sm flex items-center gap-2 ${admin.role === 'master' ? 'text-amber-400' : 'text-white'}`}>
                                                {admin.email}
                                                {admin.role === 'master' && <span className="text-[9px] bg-amber-500 text-black px-1.5 rounded font-black uppercase tracking-wider">Master</span>}
                                            </p>
                                            <p className="text-[10px] text-slate-500 font-mono">Added: {new Date(admin.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    {isMaster && admin.role !== 'master' && (
                                        <div className="flex gap-2">
                                             <button 
                                                onClick={() => handlePromoteToMaster(admin.email)}
                                                className="px-3 py-2 bg-slate-900 text-amber-500 hover:bg-amber-900/50 border border-slate-800 hover:border-amber-500/50 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                                                title="Transfer Ownership"
                                            >
                                                Make Master
                                            </button>
                                            <button 
                                                onClick={() => handleRemoveAdmin(admin.email)}
                                                className="px-3 py-2 bg-slate-900 text-rose-500 hover:bg-rose-900 hover:text-white border border-slate-800 hover:border-rose-900 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                                            >
                                                Revoke
                                            </button>
                                        </div>
                                    )}
                                    
                                    {admin.email === user?.email && !isMaster && (
                                        <span className="px-4 py-2 bg-indigo-900/20 text-indigo-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-900/50">
                                            You
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className={`bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 h-fit ${!isMaster ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <h3 className="text-xl font-black text-white mb-2">Grant Access</h3>
                    <p className="text-slate-400 text-xs mb-6">
                        {isMaster ? 'Add a new user by email. They must log in with Google to access the panel.' : 'Only the Master SysAdmin can add new administrators.'}
                    </p>
                    
                    <form onSubmit={handleAddAdmin} className="space-y-4">
                        <input 
                            type="email"
                            value={newAdminEmail}
                            onChange={e => setNewAdminEmail(e.target.value)}
                            placeholder="admin@example.com"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                            required
                            disabled={!isMaster}
                        />
                        <button type="submit" disabled={!isMaster} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg text-xs disabled:cursor-not-allowed">
                            Add Administrator
                        </button>
                    </form>
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
      
      {/* Event Edit Modal */}
      {editingEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-slate-950/90 backdrop-blur-sm animate-fadeIn">
              <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden max-h-[90vh] flex flex-col">
                  <div className="px-10 py-8 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black text-white">Edit Event Config</h2>
                        <p className="text-indigo-400 text-xs font-bold mt-1 font-mono">{editingEvent.id}</p>
                    </div>
                    <button onClick={closeEventEditor} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 shadow-md transition-colors">✕</button>
                  </div>
                  
                  <div className="p-10 space-y-8 overflow-y-auto">
                      <div className="space-y-4">
                           <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">Ownership & Keys</h3>
                           
                           <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Organizer ID (UUID)</label>
                               <input 
                                 value={editingEvent.organizer_id}
                                 onChange={e => setEditingEvent({...editingEvent, organizer_id: e.target.value})}
                                 className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs font-mono text-emerald-400 focus:border-indigo-500 outline-none"
                                 placeholder="UUID required"
                               />
                               <p className="text-[9px] text-slate-600">Warning: Changing this transfers ownership. Ensure the ID is a valid User UUID.</p>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                               <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Guest Organizer Key</label>
                                   <input 
                                     value={editingEvent.organizer_pass}
                                     onChange={e => setEditingEvent({...editingEvent, organizer_pass: e.target.value})}
                                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-indigo-500 outline-none"
                                   />
                               </div>
                               <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Judge Key</label>
                                   <input 
                                     value={editingEvent.judge_pass}
                                     onChange={e => setEditingEvent({...editingEvent, judge_pass: e.target.value})}
                                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-indigo-500 outline-none"
                                   />
                               </div>
                           </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-800">
                           <h3 className="font-black text-sm uppercase tracking-wider text-slate-500">Access Control</h3>
                           
                           <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Visibility</label>
                               <div className="flex gap-2">
                                   <button 
                                    onClick={() => setEditingEvent({...editingEvent, visibility: 'public'})}
                                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${editingEvent.visibility === 'public' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                                   >
                                       Public
                                   </button>
                                   <button 
                                    onClick={() => setEditingEvent({...editingEvent, visibility: 'private'})}
                                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${editingEvent.visibility === 'private' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                                   >
                                       Private
                                   </button>
                               </div>
                           </div>
                           
                           {editingEvent.visibility === 'private' && (
                               <div className="space-y-2 animate-slideUp">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">View Password</label>
                                   <input 
                                     value={editingEvent.view_pass || ''}
                                     onChange={e => setEditingEvent({...editingEvent, view_pass: e.target.value})}
                                     className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-indigo-500 outline-none"
                                     placeholder="Required for private events"
                                   />
                               </div>
                           )}

                           <div className="space-y-2 pt-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-slate-600">Registration</label>
                               <div className="flex gap-2">
                                   <button 
                                    onClick={() => setEditingEvent({...editingEvent, registration: 'open'})}
                                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${editingEvent.registration === 'open' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                                   >
                                       Open
                                   </button>
                                   <button 
                                    onClick={() => setEditingEvent({...editingEvent, registration: 'closed'})}
                                    className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-widest border transition-all ${editingEvent.registration === 'closed' ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-600'}`}
                                   >
                                       Closed
                                   </button>
                               </div>
                           </div>
                      </div>

                      <button 
                        onClick={handleSaveEventChanges}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-600/20 text-xs"
                      >
                          Save Configuration
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AdminPanel;
