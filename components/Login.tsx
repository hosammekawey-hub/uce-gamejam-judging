
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, CompetitionConfig, UserProfile } from '../types';
import { SyncService } from '../services/syncService';
import { COMPETITION_TEMPLATES } from '../constants';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PortalProps {
  initialUser: UserProfile | null;
  onEnterEvent: (role: UserRole, competitionId: string, config?: CompetitionConfig, user?: UserProfile) => void;
  onAdminLogin: () => void;
}

const UserPortal: React.FC<PortalProps> = ({ initialUser, onEnterEvent, onAdminLogin }) => {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Lists for authenticated user
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [judgingEvents, setJudgingEvents] = useState<any[]>([]);
  const [participatingEvents, setParticipatingEvents] = useState<any[]>([]);

  // Form States
  const [viewEventId, setViewEventId] = useState('');
  const [viewPass, setViewPass] = useState('');
  
  const [joinJudgeId, setJoinJudgeId] = useState('');
  const [joinJudgeSecret, setJoinJudgeSecret] = useState('');
  
  const [createEventId, setCreateEventId] = useState('');
  const [createEventPass, setCreateEventPass] = useState(''); // This is Judge Password
  const [createOrgPass, setCreateOrgPass] = useState(''); // New: Organizer Password
  const [idSuggestions, setIdSuggestions] = useState<string[]>([]);
  
  const [joinContestantId, setJoinContestantId] = useState('');
  const [joinTeamName, setJoinTeamName] = useState(''); 
  const [joinTeamDesc, setJoinTeamDesc] = useState('');

  // Guest Organizer State
  const [guestOrgId, setGuestOrgId] = useState('');
  const [guestOrgPass, setGuestOrgPass] = useState('');

  // Realtime subscription ref
  const dashboardSubRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (initialUser?.id) {
        refreshUserEvents(initialUser.id);
        setupRealtimeSubscription(initialUser.id);
    } else {
        setMyEvents([]);
        setJudgingEvents([]);
        setParticipatingEvents([]);
        if (dashboardSubRef.current) {
            dashboardSubRef.current.unsubscribe();
            dashboardSubRef.current = null;
        }
    }

    return () => {
        if (dashboardSubRef.current) {
            dashboardSubRef.current.unsubscribe();
        }
    };
  }, [initialUser?.id]);

  const setupRealtimeSubscription = (userId: string) => {
      if (dashboardSubRef.current) dashboardSubRef.current.unsubscribe();
      dashboardSubRef.current = SyncService.subscribeToUserDashboard(userId, () => {
          refreshUserEvents(userId);
      });
  };

  const refreshUserEvents = async (userId: string) => {
      if (myEvents.length === 0 && judgingEvents.length === 0) setLoading(true);
      try {
          const [org, jud, con] = await Promise.all([
              SyncService.getEventsForOrganizer(userId),
              SyncService.getEventsForJudge(userId),
              SyncService.getEventsForContestant(userId)
          ]);
          setMyEvents(org);
          setJudgingEvents(jud);
          setParticipatingEvents(con);
      } catch (err) {
          console.error("Failed to refresh events", err);
      } finally {
          setLoading(false);
      }
  };

  const handleGoogleLogin = async () => {
      await SyncService.signInWithGoogle();
  };

  const handleLogout = async () => {
      await SyncService.signOut();
  };

  const applySuggestion = (id: string) => {
      setCreateEventId(id);
      setIdSuggestions([]);
      setError('');
  };

  const handleGuestOrganizerLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setActionLoading(true);
      setError('');
      try {
          const res = await SyncService.verifyOrganizerPassword(guestOrgId.trim().toLowerCase(), guestOrgPass);
          if (res.success && res.config) {
              setSuccessMsg('Guest login successful!');
              // We create a dummy "Guest" user profile for the session context
              const guestUser: UserProfile = {
                  id: 'guest_organizer', 
                  email: 'guest@judgepro.app', 
                  full_name: 'Guest Organizer',
                  avatar_url: '' 
              };
              onEnterEvent('organizer', guestOrgId.trim(), res.config, guestUser);
          } else {
              setError('Invalid Event ID or Organizer Password.');
          }
      } catch (err) {
          setError('Login failed. Please check connection.');
      }
      setActionLoading(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!initialUser) return;
      setActionLoading(true);
      setError('');
      setIdSuggestions([]);

      const cleanId = createEventId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
      
      if (cleanId.length < 3) {
          setError('Event ID must be at least 3 characters.');
          setActionLoading(false);
          return;
      }

      if (!createOrgPass || createOrgPass.length < 4) {
          setError('Organizer Password must be at least 4 characters.');
          setActionLoading(false);
          return;
      }

      try {
          const exists = await SyncService.checkEventExists(cleanId);
          if (exists) {
              setError(`Event ID '${cleanId}' is unavailable.`);
              const year = new Date().getFullYear();
              const candidates = new Set([
                  `${cleanId}-${year}`,
                  `${cleanId}${Math.floor(Math.random() * 900) + 100}`,
                  `${cleanId}-event`
              ]);

              const checks = await Promise.all(
                  Array.from(candidates).map(async (id) => {
                      const isTaken = await SyncService.checkEventExists(id);
                      return { id, available: !isTaken };
                  })
              );

              const validSuggestions = checks
                  .filter(c => c.available)
                  .map(c => c.id)
                  .slice(0, 3);

              if (validSuggestions.length > 0) {
                setIdSuggestions(validSuggestions);
              } else {
                 setIdSuggestions([`${cleanId}-${Date.now().toString().slice(-6)}`]);
              }
              setActionLoading(false);
              return;
          }

          const newConfig: CompetitionConfig = {
              competitionId: cleanId,
              title: cleanId.toUpperCase(),
              typeDescription: 'Custom Event',
              organizerPass: createOrgPass, // Set explicitly by user
              judgePass: createEventPass,
              rubric: COMPETITION_TEMPLATES[0].rubric,
              tieBreakers: [],
              isSetupComplete: false,
              organizerId: initialUser.id,
              visibility: 'public', 
              registration: 'closed'
          };

          const res = await SyncService.createEvent(newConfig, initialUser.id);
          
          if (res.success) {
              await refreshUserEvents(initialUser.id);
              setCreateEventId('');
              setCreateEventPass('');
              setCreateOrgPass('');
              setSuccessMsg(`Event '${cleanId}' created successfully!`);
              setTimeout(() => setSuccessMsg(''), 5000);
              onEnterEvent('organizer', cleanId, newConfig, initialUser);
          } else {
              setError(`Failed to create event: ${res.message}`);
          }
      } catch (err: any) {
          setError(`An unexpected error occurred: ${err.message || 'Unknown error'}`);
      }
      setActionLoading(false);
  };

  const handleJoinAsJudge = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!initialUser) return;
      setActionLoading(true);
      setError('');
      try {
          const res = await SyncService.joinEventAsJudge(joinJudgeId.trim(), initialUser, joinJudgeSecret);
          if (res.success) {
              await refreshUserEvents(initialUser.id);
              setJoinJudgeId('');
              setJoinJudgeSecret('');
              setSuccessMsg('Joined successfully as a Judge!');
              setTimeout(() => setSuccessMsg(''), 3000);
          } else {
              setError(res.message);
          }
      } catch (err) {
          setError('Connection failed.');
      }
      setActionLoading(false);
  };

  const handleJoinAsContestant = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!initialUser) return;
      setActionLoading(true);
      setError('');
      try {
          const res = await SyncService.joinEventAsContestant(joinContestantId.trim(), initialUser, {
              title: joinTeamName,
              description: joinTeamDesc,
              thumbnail: ''
          });

          if (res.success) {
              await refreshUserEvents(initialUser.id);
              setJoinContestantId('');
              setJoinTeamName('');
              setJoinTeamDesc('');
              setSuccessMsg('Entry registered successfully!');
              setTimeout(() => setSuccessMsg(''), 3000);
          } else {
              setError(res.message);
          }
      } catch (err) {
          setError('Connection failed.');
      }
      setActionLoading(false);
  };

  const handleViewPublic = async (e: React.FormEvent) => {
      e.preventDefault();
      const id = viewEventId.trim().toLowerCase();
      try {
          const meta = await SyncService.getEventMetadata(id);
          if (!meta) {
              setError('Event not found.');
              return;
          }
          if (meta.visibility === 'private' && meta.viewPass !== viewPass) {
              setError('Private Event: Invalid View Key.');
              return;
          }
          onEnterEvent('viewer', id, meta, initialUser || undefined);
      } catch (err) {
          setError('Could not fetch event.');
      }
  };

  const handleEnterContext = async (role: UserRole, eventId: string) => {
      try {
          const meta = await SyncService.getEventMetadata(eventId);
          if (meta) {
              onEnterEvent(role, eventId, meta, initialUser || undefined);
          }
      } catch (err) {
          console.error(err);
      }
  };

  const handleWithdraw = async (eventId: string) => {
      if (!initialUser) return;
      if (window.confirm("Are you sure you want to withdraw from this event?")) {
          await SyncService.withdrawAsContestant(eventId, initialUser.id);
          await refreshUserEvents(initialUser.id);
      }
  };
  
  const handleLeaveJudge = async (eventId: string) => {
      if (!initialUser) return;
      if (window.confirm("Leave judging panel? Your ratings will be removed.")) {
          await SyncService.leaveEventAsJudge(eventId, initialUser.id);
          await refreshUserEvents(initialUser.id);
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-100 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center pb-8 border-b border-white/10 gap-6">
            <div>
                <h1 className="text-4xl font-black tracking-tight text-white mb-2">JudgePro <span className="text-indigo-500">Portal</span></h1>
                <p className="text-slate-400 font-medium">Universal Competition Management System</p>
            </div>
            {initialUser ? (
                <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                        <p className="font-bold text-white">{initialUser.full_name}</p>
                        <p className="text-xs text-slate-500">{initialUser.email}</p>
                    </div>
                    {initialUser.avatar_url ? (
                        <img src={initialUser.avatar_url} className="w-12 h-12 rounded-full border-2 border-indigo-500" alt="Avatar" />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-black text-xl">{initialUser.full_name[0]}</div>
                    )}
                    <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-white transition-all text-xs font-black uppercase tracking-widest">Logout</button>
                </div>
            ) : (
                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-4">
                        <button onClick={onAdminLogin} className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest">SysAdmin</button>
                        <button 
                            onClick={handleGoogleLogin} 
                            className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            Sign in with Google
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Public / Guest Section */}
        {!initialUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-slideUp">
                {/* 1. Public Viewer */}
                <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-white/10 rounded-[2.5rem] p-10 space-y-6">
                    <div>
                        <h2 className="text-2xl font-black text-white">Public Viewer</h2>
                        <p className="text-indigo-200 text-sm">Watch competitions live.</p>
                    </div>
                    <form onSubmit={handleViewPublic} className="flex flex-col gap-3">
                        <input 
                            value={viewEventId} 
                            onChange={e => setViewEventId(e.target.value)} 
                            placeholder="Enter Event ID" 
                            className="w-full bg-slate-950/50 border border-white/20 rounded-xl px-5 py-3 text-white focus:border-indigo-500 outline-none" 
                        />
                        <div className="flex gap-3">
                            <input 
                                value={viewPass} 
                                onChange={e => setViewPass(e.target.value)} 
                                placeholder="Access Key (Optional)" 
                                className="flex-1 bg-slate-950/50 border border-white/20 rounded-xl px-5 py-3 text-white focus:border-indigo-500 outline-none" 
                            />
                            <button type="submit" className="px-6 py-3 bg-indigo-600 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-500">View</button>
                        </div>
                    </form>
                </div>

                {/* 2. Guest Organizer Login */}
                <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 space-y-6">
                    <div>
                        <h2 className="text-2xl font-black text-white">Guest Organizer</h2>
                        <p className="text-slate-400 text-sm">Login with Event ID & Password.</p>
                    </div>
                    <form onSubmit={handleGuestOrganizerLogin} className="flex flex-col gap-3">
                        <input 
                            value={guestOrgId} 
                            onChange={e => setGuestOrgId(e.target.value)} 
                            placeholder="Event ID" 
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-5 py-3 text-white focus:border-slate-500 outline-none" 
                        />
                        <input 
                            type="password"
                            value={guestOrgPass} 
                            onChange={e => setGuestOrgPass(e.target.value)} 
                            placeholder="Organizer Password" 
                            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl px-5 py-3 text-white focus:border-slate-500 outline-none" 
                        />
                        <button disabled={actionLoading} type="submit" className="w-full py-3 bg-slate-800 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-700 disabled:opacity-50">
                            Access Dashboard
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Authenticated Dashboard */}
        {initialUser && (
            <div className="space-y-16 animate-fadeIn">
                {/* 1. ORGANIZER SECTION */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <span className="text-2xl">🎩</span>
                        <h2 className="text-2xl font-black uppercase tracking-widest">Events I Organize</h2>
                        <button onClick={() => refreshUserEvents(initialUser.id)} className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">Refresh</button>
                    </div>
                    {loading && myEvents.length === 0 ? (
                         <div className="h-40 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-[2rem]">
                             <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                         </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-slate-900 border-2 border-dashed border-slate-700 p-8 rounded-[2rem] flex flex-col justify-center space-y-4 hover:border-indigo-500 transition-colors">
                            <h3 className="text-lg font-black text-white">Create New Event</h3>
                            <form onSubmit={handleCreateEvent} className="space-y-3">
                                <div>
                                    <input 
                                        value={createEventId} 
                                        onChange={e => {
                                            setCreateEventId(e.target.value);
                                            if (idSuggestions.length > 0) setIdSuggestions([]);
                                            if (error) setError('');
                                        }} 
                                        placeholder="Unique Event ID" 
                                        className={`w-full bg-slate-950 border rounded-xl px-4 py-2 text-sm text-white outline-none transition-colors ${error && idSuggestions.length > 0 ? 'border-rose-500 focus:border-rose-500' : 'border-slate-700 focus:border-indigo-500'}`} 
                                        required 
                                    />
                                    {idSuggestions.length > 0 && (
                                        <div className="mt-3 animate-fadeIn">
                                            <p className="text-[10px] text-rose-400 font-bold mb-2">ID Unavailable. Try these:</p>
                                            <div className="flex flex-wrap gap-2">
                                                {idSuggestions.map(s => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => applySuggestion(s)}
                                                        className="px-2 py-1 bg-slate-800 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg text-[10px] font-mono transition-colors border border-slate-700"
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input type="password" value={createEventPass} onChange={e => setCreateEventPass(e.target.value)} placeholder="Judge Key" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-indigo-500 outline-none" required />
                                    <input type="password" value={createOrgPass} onChange={e => setCreateOrgPass(e.target.value)} placeholder="Org Key" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-indigo-500 outline-none" required />
                                </div>
                                <p className="text-[9px] text-slate-500 font-bold">Org Key is required for guest access later.</p>
                                <button disabled={actionLoading} type="submit" className="w-full py-3 bg-indigo-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-indigo-500 disabled:opacity-50">Create & Launch</button>
                            </form>
                        </div>
                        {myEvents.map(evt => (
                            <div key={evt.id} onClick={() => handleEnterContext('organizer', evt.id)} className="bg-indigo-900/20 border border-indigo-500/30 p-8 rounded-[2rem] cursor-pointer hover:bg-indigo-900/40 transition-all group">
                                <h3 className="text-2xl font-black text-white mb-2">{evt.title}</h3>
                                <p className="text-indigo-300 font-mono text-xs mb-6">ID: {evt.id}</p>
                                <span className="inline-block px-4 py-2 bg-indigo-600 rounded-lg text-xs font-black uppercase tracking-widest group-hover:bg-white group-hover:text-indigo-900 transition-colors">Manage Event</span>
                            </div>
                        ))}
                    </div>
                    )}
                </section>

                {/* 2. JUDGE SECTION */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <span className="text-2xl">⚖️</span>
                        <h2 className="text-2xl font-black uppercase tracking-widest">Events I Judge</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-slate-900 border-2 border-dashed border-slate-700 p-8 rounded-[2rem] flex flex-col justify-center space-y-4 hover:border-amber-500 transition-colors">
                            <h3 className="text-lg font-black text-white">Join as Judge</h3>
                            <form onSubmit={handleJoinAsJudge} className="space-y-3">
                                <input value={joinJudgeId} onChange={e => setJoinJudgeId(e.target.value)} placeholder="Event ID" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-amber-500 outline-none" required />
                                <input type="password" value={joinJudgeSecret} onChange={e => setJoinJudgeSecret(e.target.value)} placeholder="Secret Phrase" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-amber-500 outline-none" required />
                                <button disabled={actionLoading} type="submit" className="w-full py-3 bg-amber-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-amber-500 disabled:opacity-50">Verify & Join</button>
                            </form>
                        </div>
                        {judgingEvents.map(evt => (
                            <div key={evt.id} className="bg-amber-900/10 border border-amber-500/30 p-8 rounded-[2rem] relative group">
                                <h3 className="text-2xl font-black text-white mb-2">{evt.title}</h3>
                                <p className="text-amber-500/60 font-mono text-xs mb-6">ID: {evt.id}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEnterContext('judge', evt.id)} className="flex-1 px-4 py-3 bg-amber-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-white hover:text-amber-900 transition-colors">Enter</button>
                                    <button onClick={() => handleLeaveJudge(evt.id)} className="px-4 py-3 bg-slate-800 rounded-lg text-rose-500 hover:bg-rose-600 hover:text-white transition-colors">✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 3. CONTESTANT SECTION */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <span className="text-2xl">🚀</span>
                        <h2 className="text-2xl font-black uppercase tracking-widest">My Submissions</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-slate-900 border-2 border-dashed border-slate-700 p-8 rounded-[2rem] flex flex-col justify-center space-y-4 hover:border-emerald-500 transition-colors">
                            <h3 className="text-lg font-black text-white">Enter Competition</h3>
                            <form onSubmit={handleJoinAsContestant} className="space-y-3">
                                <input value={joinContestantId} onChange={e => setJoinContestantId(e.target.value)} placeholder="Event ID" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none" required />
                                <input value={joinTeamName} onChange={e => setJoinTeamName(e.target.value)} placeholder="Project/Team Name" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none" required />
                                <input value={joinTeamDesc} onChange={e => setJoinTeamDesc(e.target.value)} placeholder="Short Description" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500 outline-none" />
                                <button disabled={actionLoading} type="submit" className="w-full py-3 bg-emerald-600 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-emerald-500 disabled:opacity-50">Register Entry</button>
                            </form>
                            <p className="text-[10px] text-slate-500 text-center">Note: Only events with "Open Registration" accept new entries here.</p>
                        </div>
                        {participatingEvents.map(evt => (
                            <div key={evt.id} className="bg-emerald-900/10 border border-emerald-500/30 p-8 rounded-[2rem] relative group">
                                <h3 className="text-2xl font-black text-white mb-2">{evt.title}</h3>
                                <p className="text-emerald-500/60 font-mono text-xs mb-6">ID: {evt.id}</p>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEnterContext('contestant', evt.id)} className="flex-1 px-4 py-3 bg-emerald-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-white hover:text-emerald-900 transition-colors">Manage Entry</button>
                                    <button onClick={() => handleWithdraw(evt.id)} className="px-4 py-3 bg-slate-800 rounded-lg text-rose-500 hover:bg-rose-600 hover:text-white transition-colors">✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                
                {/* Global Toasts */}
                {error && <div className="fixed bottom-6 right-6 bg-rose-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-slideUp font-bold z-50">{error}</div>}
                {successMsg && <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl animate-slideUp font-bold z-50">{successMsg}</div>}
            </div>
        )}
      </div>
    </div>
  );
};

export default UserPortal;
