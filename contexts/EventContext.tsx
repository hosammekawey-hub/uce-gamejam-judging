
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CompetitionConfig, Contestant, Rating, Judge, UserRole, Criterion, GlobalSettings } from '../types';
import { SyncService } from '../services/syncService';
import { DEFAULT_CONFIG } from '../constants';
import { useAuth } from './AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';

interface EventContextType {
  competitionId: string | null;
  config: CompetitionConfig;
  contestants: Contestant[];
  ratings: Rating[];
  judges: Judge[];
  userRole: UserRole;
  isLoading: boolean;
  isOffline: boolean;
  
  // Actions
  updateConfig: (rubric: Criterion[], tieBreakers: any[]) => Promise<void>;
  updateSettings: (settings: Partial<CompetitionConfig>) => Promise<void>;
  deleteEvent: () => Promise<void>;
  
  // Data mutations
  addContestant: (c: Contestant) => Promise<void>;
  removeContestant: (id: string) => Promise<void>;
  addJudge: (j: Judge) => Promise<void>;
  removeJudge: (id: string) => Promise<void>;
  upsertRating: (r: Rating) => Promise<void>;
  
  // Helpers
  checkGatekeeper: (pass?: string) => Promise<boolean>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [config, setConfig] = useState<CompetitionConfig>(DEFAULT_CONFIG);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  // Computed Role
  const [userRole, setUserRole] = useState<UserRole>('viewer');

  // Load Event Data
  useEffect(() => {
    if (!eventId) return;
    
    let isMounted = true;
    setIsLoading(true);

    const loadData = async () => {
        setIsOffline(true);
        // 1. Get Metadata first
        const meta = await SyncService.getEventMetadata(eventId);
        if (!meta) {
            // Handle 404
            console.error("Event not found");
            setIsLoading(false);
            return;
        }

        if (isMounted) {
            setConfig(meta);
        }

        // 2. Get Full State
        const data = await SyncService.getFullState(eventId);
        if (isMounted) {
            setContestants(data.teams);
            setRatings(data.ratings);
            setJudges(data.judges);
            setIsOffline(false);
            setIsLoading(false);
        }
        
        // 3. Subscribe
        if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
        subscriptionRef.current = SyncService.subscribeToEvent(eventId, {
            onTeamsChange: (payload) => {
                if (payload.eventType === 'INSERT') {
                    const newTeam: Contestant = {
                        id: payload.new.id,
                        userId: payload.new.user_id,
                        name: payload.new.name,
                        title: payload.new.title,
                        description: payload.new.description,
                        thumbnail: payload.new.thumbnail
                    };
                    setContestants(prev => prev.some(t => t.id === newTeam.id) ? prev : [...prev, newTeam]);
                } else if (payload.eventType === 'DELETE') {
                    setContestants(prev => prev.filter(t => t.id !== payload.old.id));
                } else if (payload.eventType === 'UPDATE') {
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
                     setJudges(prev => {
                         const others = prev.filter(j => j.id !== newJudge.id);
                         return [...others, newJudge];
                     });
                } else if (payload.eventType === 'DELETE') {
                     setJudges(prev => prev.filter(j => j.id !== (payload.old.user_id || payload.old.name)));
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
                    }));
                }
            }
        });
    };

    loadData();

    return () => {
        isMounted = false;
        if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
    };
  }, [eventId]);

  // Determine Role Logic - Robust Implementation
  useEffect(() => {
    // Wait for data to load so we know who is a judge/contestant
    if (isLoading) return;

    const navStateRole = location.state?.preferredRole as UserRole | undefined;
    const sessionKey = `role_${eventId}`;
    const storedRole = sessionStorage.getItem(sessionKey) as UserRole | null;

    // 1. Determine all valid capabilities for this user
    const capabilities: UserRole[] = [];

    // Is Organizer? (Auth ID check or Guest Pass check)
    const isOrgAuth = user && config.organizerId && user.id === config.organizerId;
    const isOrgGuest = !!sessionStorage.getItem(`org_${eventId}`);
    if (isOrgAuth || isOrgGuest) capabilities.push('organizer');

    // Is Judge?
    // User must be in judges list. 
    // Edge Case: Guest Organizer can also act as Judge if they added themselves to the judge list (linking by name/id)
    // For now, strict check on userId for authenticated users.
    const isJudge = user && judges.some(j => j.userId === user.id);
    if (isJudge) capabilities.push('judge');

    // Is Contestant?
    const isContestant = user && contestants.some(c => c.userId === user.id);
    if (isContestant) capabilities.push('contestant');

    capabilities.push('viewer'); // Everyone is at least a viewer

    // 2. Select Role based on Priority
    let finalRole: UserRole = 'viewer';

    // Priority A: Navigation State (Explicit User Intent from Portal)
    if (navStateRole && capabilities.includes(navStateRole)) {
        finalRole = navStateRole;
    } 
    // Priority B: Session Storage (Persisted Intent across reloads/nav)
    else if (storedRole && capabilities.includes(storedRole)) {
        finalRole = storedRole;
    }
    // Priority C: Default Hierarchy
    else {
        if (capabilities.includes('organizer')) finalRole = 'organizer';
        else if (capabilities.includes('judge')) finalRole = 'judge';
        else if (capabilities.includes('contestant')) finalRole = 'contestant';
        else finalRole = 'viewer';
    }

    // 3. Update State & Persistence
    setUserRole(finalRole);
    if (finalRole !== storedRole) {
        sessionStorage.setItem(sessionKey, finalRole);
    }

  }, [user, config.organizerId, judges, contestants, eventId, location.state, isLoading]);


  // Actions
  const updateConfig = async (rubric: Criterion[], tieBreakers: any[]) => {
      if (!eventId) return;
      setConfig(prev => ({ ...prev, rubric, tieBreakers }));
      await SyncService.updateEventConfig(eventId, { rubric, tieBreakers });
  };

  const updateSettings = async (settings: Partial<CompetitionConfig>) => {
      if (!eventId) return;
      setConfig(prev => ({ ...prev, ...settings }));
      await SyncService.updateEventConfig(eventId, settings);
  };

  const deleteEvent = async () => {
      if (!eventId) return;
      const storedOrgPass = sessionStorage.getItem(`org_${eventId}`);
      const success = await SyncService.deleteEvent(eventId, storedOrgPass || undefined);
      if (success) {
          sessionStorage.removeItem(`role_${eventId}`); // Cleanup
          navigate('/');
      }
  };

  // Mutations
  const addContestant = async (c: Contestant) => {
    if (!eventId) return;
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
    await SyncService.addContestant(eventId, c);
  };

  const removeContestant = async (id: string) => {
      if (!eventId) return;
      setContestants(prev => prev.filter(t => t.id !== id));
      await SyncService.removeContestant(eventId, id);
  };

  const addJudge = async (j: Judge) => {};

  const removeJudge = async (id: string) => {
      if (!eventId) return;
      setJudges(prev => prev.filter(j => j.id !== id));
      await SyncService.removeJudge(eventId, id);
  };

  const upsertRating = async (r: Rating) => {
      if (!eventId) return;
      setRatings(prev => {
          const others = prev.filter(old => !(old.teamId === r.teamId && old.judgeId === r.judgeId));
          return [...others, r];
      });
      await SyncService.upsertRating(eventId, r);
  };

  const checkGatekeeper = async (pass?: string): Promise<boolean> => {
      if (config.visibility === 'public') return true;
      if (config.visibility === 'private') {
          if (config.viewPass === pass) return true;
          if (userRole !== 'viewer') return true;
          return false;
      }
      return true;
  };

  return (
    <EventContext.Provider value={{
        competitionId: eventId || null,
        config,
        contestants,
        ratings,
        judges,
        userRole,
        isLoading,
        isOffline,
        updateConfig,
        updateSettings,
        deleteEvent,
        addContestant,
        removeContestant,
        addJudge,
        removeJudge,
        upsertRating,
        checkGatekeeper
    }}>
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
    const context = useContext(EventContext);
    if (context === undefined) {
        throw new Error('useEvent must be used within an EventProvider');
    }
    return context;
};
