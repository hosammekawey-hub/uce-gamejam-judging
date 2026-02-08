
import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEvent } from '../contexts/EventContext';
import { useAuth } from '../contexts/AuthContext';

const EventShell: React.FC = () => {
  const { config, userRole, isOffline, isLoading, checkGatekeeper } = useEvent();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [gatePass, setGatePass] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Check visibility reactively
  React.useEffect(() => {
    if (isLoading) return;

    if (config.visibility === 'private') {
        // We re-check gatekeeper whenever dependencies (like userRole) change
        checkGatekeeper().then(allowed => {
            setIsLocked(!allowed);
            setIsCheckingAccess(false);
        });
    } else {
        setIsLocked(false);
        setIsCheckingAccess(false);
    }
  }, [isLoading, config, checkGatekeeper, userRole]);

  const handleGateUnlock = async (e: React.FormEvent) => {
      e.preventDefault();
      const allowed = await checkGatekeeper(gatePass);
      if (allowed) {
          setIsLocked(false);
      } else {
          alert("Invalid Access Key");
      }
  };

  if (isLoading || isCheckingAccess) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold tracking-widest uppercase text-xs animate-pulse">
                {isLoading ? 'Loading Event...' : 'Verifying Access...'}
            </p>
        </div>
      );
  }

  if (isLocked) {
      return (
          <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
              <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 max-w-md w-full text-center space-y-6 animate-fadeIn">
                  <span className="text-4xl">🔒</span>
                  <h2 className="text-2xl font-black text-white">Private Event</h2>
                  <p className="text-slate-400">This competition requires an access key.</p>
                  
                  {user && (
                      <div className="bg-slate-800/50 p-4 rounded-xl text-xs text-slate-400 mb-4">
                          Logged in as <span className="text-white font-bold">{user.email}</span>
                          <br/>
                          (Role: {userRole})
                      </div>
                  )}

                  <form onSubmit={handleGateUnlock} className="space-y-4">
                      <input 
                        type="password"
                        value={gatePass}
                        onChange={e => setGatePass(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none text-center"
                        placeholder="Enter Access Key"
                      />
                      <button type="submit" className="w-full py-3 bg-indigo-600 rounded-xl text-white font-black uppercase tracking-widest text-xs hover:bg-indigo-500 shadow-lg">
                          Unlock
                      </button>
                      <button type="button" onClick={() => navigate('/')} className="text-slate-500 text-xs font-bold hover:text-white">
                          Return Home
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  const navItems = [
    { id: '', label: 'Overview', roles: ['judge', 'organizer', 'contestant', 'viewer'] },
    { id: 'entries', label: userRole === 'contestant' ? 'My Entry' : 'Entries', roles: ['organizer', 'contestant'] },
    { id: 'judges', label: 'Judges', roles: ['organizer'] },
    { id: 'leaderboard', label: 'Standings', roles: ['judge', 'organizer', 'contestant', 'viewer'] }
  ].filter(item => item.roles.includes(userRole));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500/20">
      <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('')}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20"><span className="text-xl">🏆</span></div>
              <span className="text-xl font-black text-slate-900 tracking-tighter uppercase hidden sm:block">{config.title}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`hidden md:flex items-center gap-3 mr-6 px-4 py-2 rounded-xl border ${isOffline ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-100'}`}>
                <div className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${isOffline ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {isOffline ? 'Connecting...' : 'Live'}
                </span>
              </div>

              {navItems.map(nav => (
                <NavLink 
                    key={nav.id} 
                    to={nav.id} 
                    end={nav.id === ''}
                    className={({ isActive }) => `px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all ${isActive ? 'text-white bg-indigo-600 shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {nav.label}
                </NavLink>
              ))}
              
              <div className="h-6 w-px bg-slate-200 mx-4 hidden md:block" />
              
              <div className="hidden md:flex flex-col items-end mr-4">
                <span className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600">{userRole}</span>
                <span className="text-sm font-black text-slate-900">{user?.full_name || 'Guest'}</span>
              </div>
              
              <button onClick={() => navigate('/')} className="px-4 py-2 bg-slate-100 text-slate-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all text-xs font-black uppercase tracking-widest ml-2">
                Exit
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 relative z-10">
         <Outlet />
      </main>
    </div>
  );
};

export default EventShell;
