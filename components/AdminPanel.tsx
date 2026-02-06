
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
  const [activeTab, setActiveTab] = useState<'security' | 'templates'>('security');
  const [settings, setSettings] = useState<GlobalSettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

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

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setStatusMsg('');
    const success = await SyncService.saveGlobalSettings(settings);
    if (success) {
      setStatusMsg('System settings saved successfully.');
      onUpdateSettings(settings);
    } else {
      setStatusMsg('Failed to save settings to cloud.');
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
    <div className="min-h-screen bg-slate-950 text-white p-8 animate-fadeIn">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex justify-between items-center pb-8 border-b border-slate-800">
          <div>
            <h1 className="text-4xl font-black tracking-tight">System Administration</h1>
            <p className="text-slate-500 font-bold mt-2">Global control panel.</p>
          </div>
          <button 
            onClick={onLogout}
            className="px-6 py-3 bg-slate-800 hover:bg-rose-900 hover:text-rose-100 rounded-xl font-black text-xs uppercase tracking-widest transition-colors"
          >
            Logout
          </button>
        </div>

        <div className="flex gap-4">
            <button 
                onClick={() => setActiveTab('security')}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'security' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}
            >
                Security Keys
            </button>
            <button 
                onClick={() => setActiveTab('templates')}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'templates' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}
            >
                Templates
            </button>
            <button 
                 onClick={handleSaveSettings}
                 disabled={isSaving}
                 className={`ml-auto px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${isSaving ? 'bg-slate-700 cursor-wait' : 'bg-green-600 hover:bg-green-500'}`}
            >
                {isSaving ? 'Saving...' : 'Save All Changes'}
            </button>
        </div>
        
        {statusMsg && (
            <div className={`p-4 rounded-xl border font-bold text-center ${statusMsg.includes('Success') ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                {statusMsg}
            </div>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slideUp">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem]">
                    <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                        <span className="text-indigo-500">🛡️</span> Organizer Access
                    </h3>
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Secret Phrase</label>
                        <input 
                            value={settings.organizerPass}
                            onChange={(e) => setSettings(prev => ({ ...prev, organizerPass: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-6 py-4 font-mono text-lg focus:border-indigo-500 focus:outline-none"
                        />
                        <p className="text-xs text-slate-500">Used by event organizers to manage competitions.</p>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem]">
                    <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
                        <span className="text-amber-500">⚖️</span> Judge Access
                    </h3>
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500">Secret Phrase</label>
                        <input 
                            value={settings.judgePass}
                            onChange={(e) => setSettings(prev => ({ ...prev, judgePass: e.target.value }))}
                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-6 py-4 font-mono text-lg focus:border-amber-500 focus:outline-none"
                        />
                        <p className="text-xs text-slate-500">Used by judges to enter competitions and score entries.</p>
                    </div>
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
                            <span className="text-4xl group-hover:scale-110 transition-transform">＋</span>
                            <span className="font-black uppercase tracking-widest text-sm">Create New Template</span>
                        </button>
                        {settings.templates.map(t => (
                            <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 relative group hover:border-indigo-500/50 transition-colors">
                                <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openEditor(t)}
                                        className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-indigo-600 hover:text-white transition-all"
                                        title="Edit Template"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteTemplate(t.id)}
                                        className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:bg-rose-600 hover:text-white transition-all"
                                        title="Delete Template"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                                <div className="text-4xl mb-4">{t.icon}</div>
                                <h3 className="text-xl font-black mb-2">{t.label}</h3>
                                <p className="text-sm text-slate-400 font-bold mb-4 line-clamp-2">{t.description}</p>
                                <div className="text-xs text-slate-600 font-mono bg-slate-950 p-2 rounded-lg">
                                    {t.rubric.length} Criteria • {t.tieBreakers.length} Tie-Breakers
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-slate-800 p-8 md:p-12 rounded-[2.5rem] space-y-8 animate-fadeIn">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black">{editingTemplate.id ? 'Edit Template' : 'Design Template'}</h3>
                            <button onClick={() => setIsEditorOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">Cancel</button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Name</label>
                                <input 
                                    value={editingTemplate.label}
                                    onChange={e => setEditingTemplate({...editingTemplate, label: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"
                                    placeholder="e.g. Cosplay Contest"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Icon (Emoji)</label>
                                <input 
                                    value={editingTemplate.icon}
                                    onChange={e => setEditingTemplate({...editingTemplate, icon: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center"
                                    placeholder="🎭"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-500">Description</label>
                                <input 
                                    value={editingTemplate.description}
                                    onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3"
                                    placeholder="Short description..."
                                />
                            </div>
                        </div>

                        <div className="space-y-6 pt-6 border-t border-slate-800">
                             <div className="flex justify-between items-center">
                                <h4 className="text-lg font-black text-indigo-400">Rubric Criteria</h4>
                                <div className="text-xs text-slate-500">Ensure weights sum to 1.0</div>
                             </div>
                             {editingTemplate.rubric.map((c, i) => (
                                 <div key={i} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
                                     <div className="flex gap-4 items-center">
                                        <div className="w-8 h-8 rounded-full bg-indigo-900/50 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] text-slate-500 uppercase font-black">Name</label>
                                            <input 
                                                value={c.name}
                                                onChange={e => handleRubricChange(i, 'name', e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold"
                                            />
                                        </div>
                                        <div className="w-24 space-y-1">
                                            <label className="text-[10px] text-slate-500 uppercase font-black">Weight</label>
                                            <input 
                                                type="number"
                                                step="0.05"
                                                value={c.weight}
                                                onChange={e => handleRubricChange(i, 'weight', parseFloat(e.target.value))}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-center"
                                            />
                                        </div>
                                     </div>
                                     
                                     <div className="space-y-1">
                                         <label className="text-[10px] text-slate-500 uppercase font-black">Description</label>
                                         <textarea 
                                             value={c.description}
                                             onChange={e => handleRubricChange(i, 'description', e.target.value)}
                                             className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs h-16 resize-none"
                                             placeholder="Explain this criterion..."
                                         />
                                     </div>

                                     <details className="group/details">
                                         <summary className="text-[10px] font-black uppercase tracking-widest text-slate-600 cursor-pointer hover:text-indigo-400 list-none flex items-center gap-2">
                                             <span className="group-open/details:rotate-90 transition-transform">▶</span> Edit Guidelines
                                         </summary>
                                         <div className="mt-4 grid grid-cols-1 gap-2 pl-4 border-l border-slate-800">
                                            {c.guidelines.map((g, gi) => (
                                                <div key={gi} className="grid grid-cols-[80px_1fr] gap-2 items-center">
                                                    <span className="text-[10px] text-indigo-400 font-bold">{g.label} ({g.range})</span>
                                                    <input 
                                                        value={g.text}
                                                        onChange={e => handleGuidelineChange(i, gi, 'text', e.target.value)}
                                                        className="bg-slate-900/50 border border-slate-700/50 rounded px-2 py-1 text-[10px] w-full"
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
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest rounded-2xl transition-all"
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
