
import React, { useState, useEffect, useMemo } from 'react';
import { TEAMS as INITIAL_TEAMS } from './constants';
import { Team, Rating, Judge, UserRole } from './types';
import Dashboard from './components/Dashboard';
import RatingForm from './components/RatingForm';
import Leaderboard from './components/Leaderboard';
import Login from './components/Login';
import TeamManagement from './components/TeamManagement';

const App: React.FC = () => {
  const [currentJudgeName, setCurrentJudgeName] = useState<string | null>(() => localStorage.getItem('jamJudge_name'));
  const [currentRole, setCurrentRole] = useState<UserRole>(() => (localStorage.getItem('jamJudge_role') as UserRole) || 'judge');
  const [view, setView] = useState<'dashboard' | 'rating' | 'leaderboard' | 'teams'>('dashboard');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  
  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = localStorage.getItem('jamJudge_teams');
    return saved ? JSON.parse(saved) : INITIAL_TEAMS;
  });

  const [ratings, setRatings] = useState<Rating[]>(() => {
    const saved = localStorage.getItem('jamJudge_ratings');
    return saved ? JSON.parse(saved) : [];
  });

  // Track judges who have logged in or submitted ratings
  const [knownJudges, setKnownJudges] = useState<string[]>(() => {
    const saved = localStorage.getItem('jamJudge_known_names');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (currentJudgeName) {
      localStorage.setItem('jamJudge_name', currentJudgeName);
      localStorage.setItem('jamJudge_role', currentRole);
      
      // If a judge logs in, ensure they are in the known list
      if (currentRole === 'judge' && !knownJudges.includes(currentJudgeName)) {
        setKnownJudges(prev => {
          const updated = Array.from(new Set([...prev, currentJudgeName]));
          localStorage.setItem('jamJudge_known_names', JSON.stringify(updated));
          return updated;
        });
      }
    }
    localStorage.setItem('jamJudge_ratings', JSON.stringify(ratings));
    localStorage.setItem('jamJudge_teams', JSON.stringify(teams));
  }, [currentJudgeName, currentRole, ratings, teams, knownJudges]);

  // Dynamically derive all active judges (from known list + those with ratings)
  const allActiveJudges = useMemo(() => {
    const judgesWithRatings = ratings.map(r => r.judgeId);
    // Combine known names with anyone who has actually submitted a rating
    return Array.from(new Set([...knownJudges, ...judgesWithRatings]));
  }, [knownJudges, ratings]);

  const handleLogin = (name: string, role: UserRole) => {
    setCurrentJudgeName(name);
    setCurrentRole(role);
  };

  const handleLogout = () => {
    localStorage.removeItem('jamJudge_name');
    localStorage.removeItem('jamJudge_role');
    setCurrentJudgeName(null);
    setView('dashboard');
  };

  const handleSelectTeam = (team: Team) => {
    setSelectedTeam(team);
    setView('rating');
  };

  const saveRating = (rating: Rating) => {
    if (currentRole === 'organizer') return;
    setRatings(prev => {
      const filtered = prev.filter(r => !(r.teamId === rating.teamId && r.judgeId === rating.judgeId));
      return [...filtered, rating];
    });
    setView('dashboard');
  };

  const handleAddTeam = (team: Team) => {
    if (currentRole !== 'organizer') return;
    setTeams(prev => [...prev, team]);
  };

  const handleRemoveTeam = (id: string) => {
    if (currentRole !== 'organizer') return;
    setTeams(prev => prev.filter(t => t.id !== id));
    setRatings(prev => prev.filter(r => r.teamId !== id));
  };

  const getCurrentJudgeRating = (teamId: string) => {
    return ratings.find(r => r.teamId === teamId && r.judgeId === currentJudgeName);
  };

  // Derive judge statuses for the dashboard
  const derivedOtherJudges: Judge[] = allActiveJudges
    .filter(name => {
      // Judges see everyone else. Organizers see everyone.
      if (currentRole === 'organizer') return true;
      return name !== currentJudgeName;
    })
    .map(name => {
      const judgeRatingsCount = ratings.filter(r => r.judgeId === name).length;
      let status: 'pending' | 'in-progress' | 'completed' = 'pending';
      
      if (judgeRatingsCount === 0) {
        status = 'pending';
      } else if (judgeRatingsCount >= teams.length && teams.length > 0) {
        status = 'completed';
      } else {
        status = 'in-progress';
      }

      return {
        id: name,
        name: name,
        status: status
      };
    });

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
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-100 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-violet-100 rounded-full blur-[120px]" />
      </div>

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
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md ${currentRole === 'organizer' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'text-indigo-600 bg-indigo-50'}`}>
                    {currentRole}
                  </span>
                </div>
                <span className="text-sm font-black text-slate-900">{currentJudgeName}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl transition-all active:scale-90 border border-rose-100"
                title="Logout"
              >
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
            currentJudge={currentJudgeName} 
            currentRole={currentRole}
            otherJudges={derivedOtherJudges}
            onSelectTeam={handleSelectTeam}
          />
        )}
        
        {view === 'rating' && selectedTeam && (
          <RatingForm 
            team={selectedTeam} 
            existingRating={getCurrentJudgeRating(selectedTeam.id)}
            judgeName={currentJudgeName}
            currentRole={currentRole}
            onSave={saveRating}
            onCancel={() => setView('dashboard')}
          />
        )}

        {view === 'leaderboard' && (
          <Leaderboard 
            teams={teams} 
            ratings={ratings} 
            otherJudges={derivedOtherJudges}
          />
        )}

        {view === 'teams' && currentRole === 'organizer' && (
          <TeamManagement 
            teams={teams}
            currentRole={currentRole}
            onAddTeam={handleAddTeam}
            onRemoveTeam={handleRemoveTeam}
          />
        )}
      </main>
      
      <footer className="py-12 text-center border-t border-slate-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-4">
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">
             &copy; 2026 UCE Global Game Jam • {currentRole === 'organizer' ? 'Organizer Console' : 'Judge Interface'}
           </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
