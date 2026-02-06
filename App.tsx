
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DEFAULT_CONFIG, COMPETITION_TEMPLATES } from './constants';
import { Contestant, Rating, Judge, UserRole, ScoreSet, CompetitionConfig, Criterion, GlobalSettings, UserProfile } from './types';
import Dashboard from './components/Dashboard';
import RatingForm from './components/RatingForm';
import Leaderboard from './components/Leaderboard';
import UserPortal from './components/Login';
import EntryManagement from './components/TeamManagement';
import JudgeManagement from './components/JudgeManagement';
import CompetitionSetup from './components/CompetitionSetup';
import AdminPanel from './components/AdminPanel';
import { SyncService } from './services/syncService';
import { RealtimeChannel } from '@supabase/supabase-js';

const App: React.FC = () => {
  // State for Authentication and Context
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState<UserRole>('viewer');
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);

  // App View State
  const [view, setView] = useState<'dashboard' | 'rating' | 'leaderboard' | 'teams' | 'judges'>('dashboard');
  const [selectedContestant, setSelectedContestant] = useState<Contestant | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);

  const [config, setConfig] = useState<CompetitionConfig>(DEFAULT_CONFIG);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [knownJudges, setKnownJudges] = useState<Judge[]>([]);

  // Realtime Reference
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  // --- 1. INITIAL LOAD & SUBSCRIPTIONS ---
  useEffect(() => {
    let isMounted = true;
    
    // Check initial user immediately
    SyncService.getCurrentUser().then(u => {
        if (isMounted && u) {
            setCurrentUser(u);
        }
    });

    // Subscribe to Auth Changes globally
    const { data: { subscription } } = SyncService.onAuthStateChange((event, session) => {
        console.log("App Auth Event:", event);
        
        if (event === 'SIGNED_OUT') {
            setCurrentUser(null);
            handleExitEvent();
        } else if (session?.user) {
            // PREVENT LOOP: Only update if the ID is different
            setCurrentUser(prev => {
                if (prev?.id === session.user.id) return prev;
                
                return {
                    id: session.user.id,
                    email: session.user.email!,
                    full_name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User',
                    avatar_url: session.user.user_metadata.avatar_url
                };
            });
        }
        
        if (isMounted) setAuthLoading(false);
    });

    // Safety timeout
    const timer = setTimeout(() => {
        if (isMounted) setAuthLoading(false);
    }, 2500);

    return () => {
        isMounted = false;
        subscription.unsubscribe();
        clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!competitionId) return;
    
    let isMounted = true;
    const init = async () => {
        setIsOfflineMode(true);
        // Fetch Full State
        const data = await SyncService.getFullState(competitionId);
        
        if (isMounted) {
            if (data.teams) setContestants(data.teams);
            if (data.ratings) setRatings(data.ratings);
            if (data.judges) setKnownJudges(data.judges);
            setIsOfflineMode(false);
        }

        // Setup Subscription
        if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
        
        subscriptionRef.current = SyncService.subscribeToEvent(competitionId, {
            onTeamsChange: (payload) => {
                if (payload.eventType === 'INSERT') {
                    // Fix: Map snake_case payload to camelCase Contestant object
                    const newTeam: Contestant = {
                        id: payload.new.id,
                        userId: payload.new.user_id,
                        name: payload.new.name,
                        title: payload.new.title,
                        description: payload.new.description,
                        thumbnail: payload.new.thumbnail
                    };

                    setContestants(prev => {
                        // Prevent duplicates if optimistic update already added it (by checking ID)
                        if (prev.some(t => t.id === newTeam.id)) return prev;
                        return [...prev, newTeam];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setContestants(prev => prev.filter(t => t.id !== payload.old.id));
                } else if (payload.eventType === 'UPDATE') {
                     // Fix: Map snake_case payload to camelCase Contestant object
                    const updatedTeam: Contestant = {
                        id: payload.new.id,
                        userId: payload.new.user_id,
                        name: payload.new.name,
                        title: payload.new.title,
                        description: payload.new.description,
                        thumbnail: payload.new.thumbnail
                    };
                    setContestants(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
                }
            },
            onRatingsChange: (payload) => {
                const newRating = {
                    teamId: payload.new.team_id,
                    judgeId: payload.new.judge_id,
                    scores: payload.new.scores,
                    feedback: payload.new.feedback,
                    isDisqualified: payload.new.is_disqualified,
                    lastUpdated: new Date(payload.new.updated_at).getTime()
                } as Rating;

                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setRatings(prev => {
                        const others = prev.filter(r => !(r.teamId === newRating.teamId && r.judgeId === newRating.judgeId));
                        return [...others, newRating];
                    });
                } else if (payload.eventType === 'DELETE') {
                    setRatings(prev => prev.filter(r => !(r.teamId === payload.old.team_id && r.judgeId === payload.old.judge_id)));
                }
            },
            onJudgesChange: (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                     const newJudge = { id: payload.new.user_id || payload.new.name, name: payload.new.name, userId: payload.new.user_id, status: payload.new.status } as Judge;
                     setKnownJudges(prev => {
                         const others = prev.filter(j => j.id !== newJudge.id);
                         return [...others, newJudge];
                     });
                } else if (payload.eventType === 'DELETE') {
                     setKnownJudges(prev => prev.filter(j => j.id !== (payload.old.user_id || payload.old.name)));
                }
            },
            onConfigChange: (payload) => {
                if (payload.eventType === 'UPDATE') {
                    const rawRubric = payload.new.rubric || {};
                    const criteria = Array.isArray(rawRubric) ? rawRubric : (rawRubric.criteria || []);
                    
                    setConfig(prev => ({
                        ...prev,
                        title: payload.new.title,
                        rubric: criteria,
                        tieBreakers: payload.new.tie_breakers,
                        visibility: payload.new.visibility || 'public',
                        viewPass: payload.new.view_pass || '',
                        registration: payload.new.registration || 'closed',
                        organizerPass: payload.new.organizer_pass,
                        judgePass: payload.new.judge_pass // Ensure judgePass is updated
                    }));
                }
            }
        });
    };

    init();

    return () => {
        isMounted = false;
        if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    };
  }, [competitionId]);

  // --- ACTIONS ---

  const handleEnterEvent = async (role: UserRole, compId: string, initialConfig?: CompetitionConfig, user?: UserProfile) => {
    setCurrentUser(user || null);
    setCurrentRole(role);
    setCompetitionId(compId);
    if (initialConfig) setConfig(initialConfig);
    setView('dashboard');
  };

  const handleExitEvent = () => {
      setCompetitionId(null);
      setContestants([]);
      setRatings([]);
      setKnownJudges([]);
  };

  const handleUpdateConfig = async (newRubric: Criterion[], newTieBreakers: { title: string; question: string }[]) => {
      setConfig(prev => ({ ...prev, rubric: newRubric, tieBreakers: newTieBreakers }));
      await SyncService.updateEventConfig(competitionId!, { 
          rubric: newRubric, 
          tieBreakers: newTieBreakers
      });
  };

  const handleUpdateSettings = async (settings: Partial<CompetitionConfig>) => {
      setConfig(prev => ({ ...prev, ...settings }));
      await SyncService.updateEventConfig(competitionId!, settings);
  }

  const saveRating = async (rating: Rating) => {
    if (currentRole !== 'judge') return;
    setRatings(prev => {
      const filtered = prev.filter(r => !(r.teamId === rating.teamId && r.judgeId === rating.judgeId));
      return [...filtered, rating];
    });
    await SyncService.upsertRating(competitionId!, rating);
    setView('dashboard');
  };

  const handleOrganizerUpsertContestant = async (c: Contestant) => {
    if (currentRole !== 'organizer') return;

    // Optimistic Update: ONLY if editing an existing entry (has ID). 
    // If creating new (no ID), we wait for Realtime to insert it to avoid duplicate/ghost entries.
    if (c.id && c.id.length > 10) {
      setContestants(prev => {
        const index = prev.findIndex(t => t.id === c.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = c;
          return updated;
        }
        return [...prev, c];
      });
    }
    
    await SyncService.addContestant(competitionId!, c);
  };

  const handleContestantUpdateOwn = async (c: Contestant) => {
      if (currentRole === 'contestant' && currentUser && c.userId === currentUser.id) {
           setContestants(prev => prev.map(t => t.id === c.id ? c : t));
           await SyncService.addContestant(competitionId!, c);
      }
  };

  const handleRemoveContestant = async (id: string) => {
    if (currentRole !== 'organizer') return;
    setContestants(prev => prev.filter(t => t.id !== id));
    await SyncService.removeContestant(competitionId!, id);
  };

  const handleRemoveJudge = async (judgeId: string) => {
    if (currentRole !== 'organizer') return;
    setKnownJudges(prev => prev.filter(j => j.id !== judgeId));
    await SyncService.removeJudge(competitionId!, judgeId);
  };

  // --- DERIVED STATE ---
  
  const currentJudgeId = useMemo(() => {
      if (!currentUser) return null;
      const j = knownJudges.find(j => j.userId === currentUser.id);
      return j ? j.id : currentUser.id; 
  }, [currentUser, knownJudges]);

  const activeRating = useMemo(() => {
    if (!selectedContestant) return undefined;
    
    if (currentRole === 'judge' && currentJudgeId) {
      return ratings.find(r => r.teamId === selectedContestant.id && r.judgeId === currentJudgeId);
    } 
    
    if (currentRole === 'organizer' || currentRole === 'viewer' || currentRole === 'contestant') {
      const teamRatings = ratings.filter(r => r.teamId === selectedContestant.id);
      if (teamRatings.length === 0) return undefined;

      const avgScores: ScoreSet = {};
      config.rubric.forEach(c => avgScores[c.id] = 0);

      teamRatings.forEach(r => {
        config.rubric.forEach(c => avgScores[c.id] += (r.scores[c.id] || 0));
      });
      config.rubric.forEach(c => avgScores[c.id] = avgScores[c.id] / teamRatings.length);

      const feedbackList = teamRatings.filter(r => r.feedback?.trim()).map(r => `--- ${r.judgeId} ---\n${r.feedback}`);
      
      return {
        teamId: selectedContestant.id,
        judgeId: 'AGGREGATE',
        scores: avgScores,
        feedback: feedbackList.join('\n\n'),
        isDisqualified: teamRatings.some(r => r.isDisqualified),
        lastUpdated: Date.now()
      } as Rating;
    }
  }, [selectedContestant, ratings, currentJudgeId, currentRole, config]);


  // --- RENDER ---

  if (authLoading) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold tracking-widest uppercase text-xs animate-pulse">Initializing App...</p>
        </div>
      );
  }

  if (adminMode) {
      return <AdminPanel initialSettings={globalSettings || {judgePass:'', organizerPass:'', templates:COMPETITION_TEMPLATES}} onUpdateSettings={setGlobalSettings} onLogout={() => setAdminMode(false)} />;
  }

  if (!competitionId) {
      return (
        <UserPortal 
            initialUser={currentUser}
            onEnterEvent={handleEnterEvent} 
            onAdminLogin={() => setAdminMode(true)} 
        />
      );
  }

  if (currentRole === 'organizer' && !config.isSetupComplete) {
    return <CompetitionSetup onComplete={(c) => { 
        SyncService.updateEventConfig(c.competitionId, {...c, isSetupComplete: true});
        setConfig({...c, isSetupComplete: true});
    }} onCancel={handleExitEvent} templates={COMPETITION_TEMPLATES} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Overview', roles: ['judge', 'organizer', 'contestant', 'viewer'] },
    { id: 'teams', label: currentRole === 'contestant' ? 'My Entry' : 'Entries', roles: ['organizer', 'contestant'] },
    { id: 'judges', label: 'Judges', roles: ['organizer'] },
    { id: 'leaderboard', label: 'Standings', roles: ['judge', 'organizer', 'contestant', 'viewer'] }
  ].filter(item => item.roles.includes(currentRole));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500/20">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('dashboard')}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20"><span className="text-xl">🏆</span></div>
              <span className="text-xl font-black text-slate-900 tracking-tighter uppercase hidden sm:block">{config.title}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`hidden md:flex items-center gap-3 mr-6 px-4 py-2 rounded-xl border ${isOfflineMode ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${isOfflineMode ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {isOfflineMode ? 'Connecting...' : 'Live'}
                </span>
              </div>

              {navItems.map(nav => (
                <button key={nav.id} onClick={() => setView(nav.id as any)} className={`px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${view === nav.id ? 'text-white bg-indigo-600 shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {nav.label}
                </button>
              ))}
              
              <div className="h-6 w-px bg-slate-200 mx-4 hidden md:block" />
              
              <div className="hidden md:flex flex-col items-end mr-4">
                <span className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">{currentRole}</span>
                <span className="text-sm font-black text-slate-900">{currentUser?.full_name || 'Guest'}</span>
              </div>
              
              <button onClick={handleExitEvent} className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest ml-2">
                Exit
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {view === 'dashboard' && (
          <Dashboard 
            title={config.title}
            competitionId={config.competitionId}
            rubric={config.rubric}
            teams={contestants} 
            ratings={ratings} 
            currentJudge={currentJudgeId || 'guest'} 
            currentRole={currentRole}
            otherJudges={knownJudges}
            onSelectTeam={(team) => { setSelectedContestant(team); setView('rating'); }}
            tieBreakers={config.tieBreakers}
            onUpdateConfig={handleUpdateConfig}
            onUpdateSettings={handleUpdateSettings}
            canEditRubric={currentRole === 'organizer'}
            eventSettings={{ 
                visibility: config.visibility, 
                registration: config.registration, 
                viewPass: config.viewPass,
                organizerPass: config.organizerPass,
                judgePass: config.judgePass // Pass judgePass to Dashboard settings
            }}
          />
        )}
        {view === 'rating' && selectedContestant && (
          <RatingForm 
            key={selectedContestant.id}
            team={selectedContestant} 
            rubric={config.rubric}
            existingRating={activeRating}
            judgeName={currentJudgeId || 'guest'}
            currentRole={currentRole}
            onSave={saveRating}
            onCancel={() => setView('dashboard')}
          />
        )}
        {view === 'leaderboard' && (
          <Leaderboard teams={contestants} ratings={ratings} rubric={config.rubric} />
        )}
        {view === 'teams' && (currentRole === 'organizer' || currentRole === 'contestant') && (
          <EntryManagement 
            teams={currentRole === 'contestant' && currentUser ? contestants.filter(c => c.userId === currentUser.id) : contestants}
            currentRole={currentRole}
            onAddTeam={currentRole === 'contestant' ? handleContestantUpdateOwn : handleOrganizerUpsertContestant}
            onRemoveTeam={handleRemoveContestant}
          />
        )}
        {view === 'judges' && currentRole === 'organizer' && (
          <JudgeManagement judges={knownJudges} teams={contestants} onRemoveJudge={handleRemoveJudge} />
        )}
      </main>
    </div>
  );
};

export default App;
