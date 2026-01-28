
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TEAMS as INITIAL_TEAMS } from './constants';
import { Team, Rating, Judge, UserRole } from './types';
import Dashboard from './components/Dashboard';
import RatingForm from './components/RatingForm';
import Leaderboard from './components/Leaderboard';
import Login from './components/Login';
import TeamManagement from './components/TeamManagement';
import { SyncService } from './services/syncService';

const App: React.FC = () => {
  const [currentJudgeName, setCurrentJudgeName] = useState<string | null>(() => localStorage.getItem('jamJudge_name'));
  const [currentRole, setCurrentRole] = useState<UserRole>(() => (localStorage.getItem('jamJudge_role') as UserRole) || 'judge');
  const [accessPhrase, setAccessPhrase] = useState<string | null>(() => localStorage.getItem('jamJudge_phrase'));
  
  const [view, setView] = useState<'dashboard' | 'rating' | 'leaderboard' | 'teams'>('dashboard');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Initialize teams from local storage, or fall back to constants if storage is empty/invalid
  const [teams, setTeams] = useState<Team[]>(() => {
    try {
      const saved = localStorage.getItem('jamJudge_teams');
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_TEAMS;
    } catch (e) {
      return INITIAL_TEAMS;
    }
  });

  const [ratings, setRatings] = useState<Rating[]>(() => {
    try {
      const saved = localStorage.getItem('jamJudge_ratings');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [knownJudges, setKnownJudges] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('jamJudge_known_names');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // --- CLOUD SYNC LOGIC ---

  const syncToCloud = useCallback(async (currentTeams: Team[], currentRatings: Rating[], currentJudges: string[]) => {
    if (!accessPhrase) return;
    setIsSyncing(true);
    try {
      const success = await SyncService.pushData(accessPhrase, {
        teams: currentTeams,
        ratings: currentRatings,
        judges: currentJudges,
        updatedAt: Date.now()
      });
      setIsOfflineMode(!success);
    } catch (e) {
      setIsOfflineMode(true);
    } finally {
      setIsSyncing(false);
    }
  }, [accessPhrase]);

  // Initial Load and Polling from Cloud
  useEffect(() => {
    let isMounted = true;

    const loadCloudData = async () => {
      if (!accessPhrase) return;
      
      setIsSyncing(true);
      const cloudData = await SyncService.pullData(accessPhrase);
      
      if (isMounted) {
        if (cloudData) {
          setIsOfflineMode(false);
          // Only overwrite local if cloud has meaningful data
          if (cloudData.teams && Array.isArray(cloudData.teams) && cloudData.teams.length > 0) {
             setTeams(cloudData.teams);
          }
          if (cloudData.ratings && Array.isArray(cloudData.ratings)) {
             setRatings(cloudData.ratings);
          }
          if (cloudData.judges && Array.isArray(cloudData.judges)) {
             setKnownJudges(cloudData.judges);
          }
        } else {
          // Cloud is empty or 404. 
          // If we have local teams (which we usually do from INITIAL_TEAMS), push them to init the cloud.
          if (teams.length > 0) {
            syncToCloud(teams, ratings, knownJudges);
          }
        }
        setIsSyncing(false);
      }
    };

    loadCloudData();
    
    const interval = setInterval(loadCloudData, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [accessPhrase]);

  // Persistence for smooth refresh experience
  useEffect(() => {
    if (currentJudgeName) {
      localStorage.setItem('jamJudge_name', currentJudgeName);
      localStorage.setItem('jamJudge_role', currentRole);
      localStorage.setItem('jamJudge_phrase', accessPhrase || '');
    }
    localStorage.setItem('jamJudge_ratings', JSON.stringify(ratings));
    localStorage.setItem('jamJudge_teams', JSON.stringify(teams));
    localStorage.setItem('jamJudge_known_names', JSON.stringify(knownJudges));
  }, [currentJudgeName, currentRole, accessPhrase, ratings, teams, knownJudges]);

  const handleLogin = (name: string, role: UserRole, phrase: string) => {
    setCurrentJudgeName(name);
    setCurrentRole(role);
    setAccessPhrase(phrase);
    
    if (role === 'judge') {
      const updatedJudges = Array.from(new Set([...knownJudges, name]));
      setKnownJudges(updatedJudges);
      syncToCloud(teams, ratings, updatedJudges);
    } else {
      syncToCloud(teams, ratings, knownJudges);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setCurrentJudgeName(null);
    setAccessPhrase(null);
    setTeams(INITIAL_TEAMS);
    setRatings([]);
    setKnownJudges([]);
    setView('dashboard');
  };

  const saveRating = (rating: Rating) => {
    if (currentRole === 'organizer') return;
    setRatings(prev => {
      const filtered = prev.filter(r => !(r.teamId === rating.teamId && r.judgeId === rating.judgeId));
      const updated = [...filtered, rating];
      syncToCloud(teams, updated, knownJudges);
      return updated;
    });
    setView('dashboard');
  };

  const handleAddTeam = (team: Team) => {
    if (currentRole !== 'organizer') return;
    const updated = [...teams, team];
    setTeams(updated);
    syncToCloud(updated, ratings, knownJudges);
  };

  const handleRemoveTeam = (id: string) => {
    if (currentRole !== 'organizer') return;
    const updatedTeams = teams.filter(t => t.id !== id);
    const updatedRatings = ratings.filter(r => r.teamId !== id);
    setTeams(updatedTeams);
    setRatings(updatedRatings);
    syncToCloud(updatedTeams, updatedRatings, knownJudges);
  };

  const derivedOtherJudges: Judge[] = useMemo(() => {
    const allNames = Array.from(new Set([...knownJudges, ...ratings.map(r => r.judgeId)]));
    return allNames
      .filter(name => (currentRole === 'organizer' ? true : name !== currentJudgeName))
      .map(name => {
        const judgeRatingsCount = ratings.filter(r => r.judgeId === name).length;
        let status: 'pending' | 'in-progress' | 'completed' = 'pending';
        if (judgeRatingsCount === 0) status = 'pending';
        else if (judgeRatingsCount >= teams.length && teams.length > 0) status = 'completed';
        else status = 'in-progress';
        return { id: name, name: name, status: status };
      });
  }, [knownJudges, ratings, teams.length, currentJudgeName, currentRole]);

  if (!currentJudgeName) {
    return <Login onLogin={handleLogin} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', roles: ['judge', 'organizer'] },
    { id: 'teams', label: 'Team Roster', roles: ['organizer'] },
    { id: 'leaderboard', label: 'Standings', roles: ['judge', 'organizer'] }
  ].filter(item => item.roles.includes(currentRole));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500/20">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setView('dashboard')}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 transform group-hover:scale-105 transition-transform">
                <span className="text-xl">🏆</span>
              </div>
              <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">UCE Global <span className="text-indigo-600">Game Jam</span></span>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <div className={`flex items-center gap-3 mr-6 px-4 py-2 rounded-xl border ${isOfflineMode ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                <div className={`w-2 h-2 rounded-full ${isOfflineMode ? 'bg-amber-500' : isSyncing ? 'bg-indigo-500 animate-pulse' : 'bg-green-500'}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${isOfflineMode ? 'text-amber-600' : 'text-slate-400'}`}>
                  {isOfflineMode ? 'Offline Mode' : isSyncing ? 'Syncing...' : 'Cloud Synced'}
                </span>
              </div>

              {navItems.map(nav => (
                <button 
                  key={nav.id}
                  onClick={() => setView(nav.id as any)}
                  className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${
                    view === nav.id 
                    ? 'text-white bg-indigo-600 shadow-lg shadow-indigo-600/20' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {nav.label}
                </button>
              ))}
              <div className="h-6 w-px bg-slate-200 mx-4" />
              <div className="flex flex-col items-end mr-4">
                <span className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md ${currentRole === 'organizer' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'text-indigo-600 bg-indigo-50'}`}>
                  {currentRole}
                </span>
                <span className="text-sm font-black text-slate-900">{currentJudgeName}</span>
              </div>
              <button onClick={handleLogout} className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all border border-rose-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        {view === 'dashboard' && (
          <Dashboard 
            teams={teams} 
            ratings={ratings} 
            currentJudge={currentJudgeName!} 
            currentRole={currentRole}
            otherJudges={derivedOtherJudges}
            onSelectTeam={(team) => { setSelectedTeam(team); setView('rating'); }}
          />
        )}
        {view === 'rating' && selectedTeam && (
          <RatingForm 
            team={selectedTeam} 
            existingRating={ratings.find(r => r.teamId === selectedTeam.id && r.judgeId === currentJudgeName)}
            judgeName={currentJudgeName!}
            currentRole={currentRole}
            onSave={saveRating}
            onCancel={() => setView('dashboard')}
          />
        )}
        {view === 'leaderboard' && <Leaderboard teams={teams} ratings={ratings} otherJudges={derivedOtherJudges} />}
        {view === 'teams' && currentRole === 'organizer' && (
          <TeamManagement 
            teams={teams}
            currentRole={currentRole}
            onAddTeam={handleAddTeam}
            onRemoveTeam={handleRemoveTeam}
          />
        )}
      </main>
    </div>
  );
};

export default App;
