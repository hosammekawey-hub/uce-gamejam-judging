
import React, { useState } from 'react';
import { CompetitionConfig, Criterion, CompetitionTemplate } from '../types';
import { AIService } from '../services/aiService';
import { DEFAULT_RUBRIC } from '../constants';

interface CompetitionSetupProps {
  onComplete: (config: CompetitionConfig) => void;
  onCancel: () => void;
  templates: CompetitionTemplate[];
}

const CompetitionSetup: React.FC<CompetitionSetupProps> = ({ onComplete, onCancel, templates }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('My Competition 2026');
  const [description, setDescription] = useState(''); 
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [userApiKey, setUserApiKey] = useState('');
  const [mode, setMode] = useState<'template' | 'ai'>('template');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Config State
  const [rubric, setRubric] = useState<Criterion[]>(DEFAULT_RUBRIC);
  const [tieBreakers, setTieBreakers] = useState<{title: string, question: string}[]>(
      templates.length > 0 ? templates[0].tieBreakers : []
  );
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [viewPass, setViewPass] = useState('');
  const [registration, setRegistration] = useState<'open' | 'closed'>('closed');

  const handleGenerateAI = async () => {
    if (!description) {
        setError('Please enter a description of your event.');
        return;
    }
    if (!userApiKey) {
        setError('Google API Key is required for AI generation.');
        return;
    }

    setIsLoading(true);
    setError('');
    try {
      const generated = await AIService.generateRubric(description, userApiKey);
      if (generated && generated.length > 0) {
        setRubric(generated);
        setTieBreakers([]); 
        setStep(2);
      } else {
        setError('AI could not generate a valid rubric. Please try a different description.');
      }
    } catch (e) {
      setError('Error connecting to AI. Please ensure your API Key is valid and has access to Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setRubric(template.rubric);
      setTieBreakers(template.tieBreakers);
      setSelectedTemplateId(templateId);
      setStep(2);
    }
  };

  const handleFinalize = () => {
    // Validate weights
    const totalWeight = rubric.reduce((acc, c) => acc + c.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.02) {
      setError(`Total weight must equal 100%. Current: ${(totalWeight * 100).toFixed(0)}%`);
      return;
    }

    if (visibility === 'private' && !viewPass) {
        setError("Private events require an Access Key.");
        return;
    }

    const finalTypeDesc = mode === 'ai' ? description : (templates.find(t => t.id === selectedTemplateId)?.label || 'Custom Event');

    onComplete({
      competitionId: '', 
      organizerPass: '', 
      judgePass: '',     
      title,
      typeDescription: finalTypeDesc,
      rubric,
      tieBreakers,
      isSetupComplete: true,
      visibility,
      viewPass,
      registration
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative">
        <button 
            onClick={onCancel}
            className="absolute top-8 right-8 text-slate-500 hover:text-rose-500 font-black text-xs uppercase tracking-widest transition-colors"
        >
            Cancel Setup
        </button>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-white mb-2">Event Setup</h1>
          <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs">Step {step} of 3</p>
        </div>

        {step === 1 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Event Title</label>
              <input 
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Annual Science Fair, Hackathon 2026, Chili Cook-off"
              />
            </div>

            <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
              <button 
                onClick={() => setMode('template')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'template' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Choose Template
              </button>
              <button 
                onClick={() => setMode('ai')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === 'ai' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                Generate with AI
              </button>
            </div>

            {mode === 'template' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-slideUp">
                {templates.map(template => (
                  <button 
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className="bg-slate-800 border border-slate-700 p-6 rounded-3xl hover:bg-slate-700 hover:border-indigo-500 hover:scale-105 transition-all group flex flex-col items-center text-center gap-3"
                  >
                    <span className="text-4xl group-hover:scale-110 transition-transform">{template.icon}</span>
                    <div>
                      <h3 className="text-white font-black text-sm uppercase tracking-wider">{template.label}</h3>
                      <p className="text-slate-500 text-[10px] font-bold mt-1 leading-tight">{template.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {mode === 'ai' && (
              <div className="space-y-6 animate-slideUp bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                <div className="space-y-3">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Competition Type / Description</label>
                    <textarea 
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                    placeholder="e.g. A cosplay competition judging accuracy, craftsmanship, and performance..."
                    />
                </div>
                
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <label className="text-xs font-black uppercase tracking-widest text-indigo-400">Google Gemini API Key</label>
                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-slate-500 hover:text-white underline decoration-dotted">Get Key Here</a>
                    </div>
                    <input 
                    type="password"
                    value={userApiKey}
                    onChange={e => setUserApiKey(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-6 py-4 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="AIzaSy..."
                    autoComplete="off"
                    />
                </div>

                <button 
                  onClick={handleGenerateAI}
                  disabled={isLoading || !description || !userApiKey}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-xs hover:opacity-90 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                >
                  {isLoading ? 'Designing Rubric...' : 'Generate Rubric'}
                </button>
              </div>
            )}

            {error && <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-rose-400 text-xs font-bold text-center animate-shake">{error}</div>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-white">Review Rubric</h3>
              <div className="text-xs font-black uppercase tracking-widest text-slate-500">
                Total Weight: {(rubric.reduce((a,b) => a + b.weight, 0) * 100).toFixed(0)}%
              </div>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {rubric.map((crit, idx) => (
                <div key={crit.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <input 
                      value={crit.name}
                      onChange={(e) => {
                        const newRubric = [...rubric];
                        newRubric[idx].name = e.target.value;
                        setRubric(newRubric);
                      }}
                      className="bg-transparent text-white font-bold w-full focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                       <span className="text-slate-500 text-xs font-black">%</span>
                       <input 
                        type="number"
                        value={Math.round(crit.weight * 100)}
                        onChange={(e) => {
                          const newRubric = [...rubric];
                          newRubric[idx].weight = parseInt(e.target.value || '0') / 100;
                          setRubric(newRubric);
                        }}
                        className="w-12 bg-slate-900 text-white font-black text-xs p-1 rounded text-center"
                      />
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs mb-2">{crit.description}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-slate-800 rounded-2xl text-slate-400 font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-700"
              >
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                className="flex-[2] py-4 bg-indigo-600 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-500"
              >
                Next: Access
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
            <div className="space-y-8 animate-fadeIn">
                 <h3 className="text-xl font-black text-white">Access & Visibility</h3>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 space-y-4">
                         <h4 className="text-white font-black uppercase tracking-wider text-sm">👁️ Visibility</h4>
                         <div className="flex gap-2">
                            <button 
                                onClick={() => setVisibility('public')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${visibility === 'public' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-500'}`}
                            >
                                Public
                            </button>
                            <button 
                                onClick={() => setVisibility('private')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${visibility === 'private' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-500'}`}
                            >
                                Private
                            </button>
                         </div>
                         {visibility === 'public' ? (
                             <p className="text-[10px] text-slate-400">Anyone with the Event ID can view the competition standings.</p>
                         ) : (
                             <div className="space-y-2">
                                <p className="text-[10px] text-slate-400">Requires a key to view.</p>
                                <input 
                                    value={viewPass}
                                    onChange={e => setViewPass(e.target.value)}
                                    placeholder="Set Access Key"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-white font-mono text-sm"
                                />
                             </div>
                         )}
                     </div>

                     <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 space-y-4">
                         <h4 className="text-white font-black uppercase tracking-wider text-sm">📝 Registration</h4>
                         <div className="flex gap-2">
                            <button 
                                onClick={() => setRegistration('closed')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${registration === 'closed' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-500'}`}
                            >
                                Closed
                            </button>
                            <button 
                                onClick={() => setRegistration('open')}
                                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${registration === 'open' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-500'}`}
                            >
                                Open
                            </button>
                         </div>
                         <p className="text-[10px] text-slate-400">
                             {registration === 'closed' 
                                ? 'Only you (Organizer) can add contestants.' 
                                : 'Anyone with the Event ID can join as a contestant.'}
                         </p>
                     </div>
                 </div>

                 <div className="flex gap-4">
                    <button 
                        onClick={() => setStep(2)}
                        className="flex-1 py-4 bg-slate-800 rounded-2xl text-slate-400 font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-700"
                    >
                        Back
                    </button>
                    <button 
                        onClick={handleFinalize}
                        className="flex-[2] py-4 bg-indigo-600 rounded-2xl text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-500"
                    >
                        Launch Competition
                    </button>
                 </div>
                 {error && <p className="text-rose-400 text-sm font-bold text-center animate-shake">{error}</p>}
            </div>
        )}
      </div>
    </div>
  );
};

export default CompetitionSetup;
