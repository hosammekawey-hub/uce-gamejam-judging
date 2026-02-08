
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CompetitionConfig, Contestant, Rating, Judge, UserRole, Criterion, GlobalSettings, UserProfile } from '../types';
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

// Helper to determine role
const calculateUserRole = (
    user: UserProfile | null, 
    config: CompetitionConfig, 
    judges: Judge[], 
    contestants: Contestant[], 
    eventId: string, 
    preferredRole?: UserRole
): UserRole => {
    const sessionKey = `role_${eventId}`;
    const storedRole = sessionStorage.getItem(sessionKey) as UserRole | null;
    
    const capabilities: UserRole[] = [];

    // 1. Determine Strict Capabilities
    
    // Is Organizer?
    const isOrgAuth = user && config.organizerId && user.id === config.organizerId;
    const isOrgGuest = !!sessionStorage.getItem(`org_${eventId}`);
    
    if (isOrgAuth || isOrgGuest) {
        capabilities.push('organizer');
    }

    // Is Judge? (Strict check: Must be in judges list)
    if (user && judges.some(j => j.userId === user.id)) {
        capabilities.push('judge');
    }

    // Is Contestant? (Strict check: Must be in contestants list)
    if (user && contestants.some(c => c.userId === user.id)) {
        capabilities.push('contestant');
    }

    capabilities.push('viewer');

    // 2. Select Role based on Priority
    let finalRole: UserRole = 'viewer';

    // Priority 1: Navigation Intent (Portal Choice)
    // We honor this if the user has the capability.
    if (preferredRole && capabilities.includes(preferredRole)) {
        finalRole = preferredRole;
    } 
    // Priority 2: Stored Session (Page Reloads / Deep Linking)
    // We honor this if the user has the capability.
    else if (storedRole && capabilities.includes(storedRole)) {
        finalRole = storedRole;
    } 
    // Priority 3: Default Hierarchy (Organizer > Judge > Contestant > Viewer)
    else {
        if (capabilities.includes('organizer')) finalRole = 'organizer';
        else if (capabilities.includes('judge')) finalRole = 'judge';
        else if (capabilities.includes('contestant')) finalRole = 'contestant';
        else finalRole = 'viewer';
    }
    
    return finalRole;
};

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, loading: authLoading } = useAuth();
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
            console.error("Event not found");
            setIsLoading(false);
            return;
        }

        // 2. Get Full State
        const data = await SyncService.getFullState(eventId);
        
        if (isMounted) {
            setConfig(meta);
            setContestants(data.teams);
            setRatings(data.ratings);
            setJudges(data.judges);
            
            // Initial Role Calculation
            const role = calculateUserRole(
                user, 
                meta, 
                data.judges, 
                data.teams, 
                eventId, 
                location.state?.preferredRole
            );
            
            setUserRole(role);
            // Only force write to storage if we have explicit intent from navigation state
            if (location.state?.preferredRole) {
                sessionStorage.setItem(`role_${eventId}`, role);
            }
            
            setIsOffline(false);
            setIsLoading(false);
        }
        
        // 3. Subscribe
        if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
        subscriptionRef.current = SyncService.subscribeToEvent(eventId, {
            onTeamsChange: (payload) => {
                if (payload.eventType === 'INSERT') {
                     const newTeam = {
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
                    setContestants(prev => prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new, userId: payload.new.user_id } : t));
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

  // Reactive Role Update
  useEffect(() => {
      // Don't recalculate if we are essentially still initializing event data
      if (isLoading || !eventId) return;
      
      const role = calculateUserRole(
        user, 
        config, 
        judges, 
        contestants, 
        eventId, 
        location.state?.preferredRole 
      );
      
      if (role !== userRole) {
          setUserRole(role);
      }
      
      // CRITICAL FIX: Only overwrite session storage if we have an explicit preference from navigation.
      // This prevents race conditions where "loading" state (viewer) overwrites a stored "contestant" role.
      if (location.state?.preferredRole) {
           sessionStorage.setItem(`role_${eventId}`, role);
      }

  }, [user, config, judges, contestants, eventId, location.state, userRole, isLoading]);

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
          sessionStorage.removeItem(`role_${eventId}`); 
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
      
      // OPTIMISTIC UPDATE: Snapshot previous state
      const previousRatings = [...ratings];
      
      setRatings(prev => {
          const others = prev.filter(old => !(old.teamId === r.teamId && old.judgeId === r.judgeId));
          return [...others, r];
      });

      try {
          // Fire request (don't block UI if not awaited, but here we await to catch error in context)
          const { error } = await SyncService.upsertRating(eventId, r);
          if (error) throw error;
      } catch (err) {
          console.error("Failed to save rating:", err);
          // ROLLBACK on error
          setRatings(previousRatings);
          alert("Failed to save rating. Changes reverted. Check connection.");
      }
  };

  // Memoized checkGatekeeper to prevent infinite loops in dependencies
  const checkGatekeeper = useCallback(async (pass?: string): Promise<boolean> => {
      if (config.visibility === 'public') return true;
      if (config.visibility === 'private') {
          if (config.viewPass === pass) return true;
          // Implicit access check: If they have a valid role (Organizer/Judge/Contestant), they pass
          // calculateUserRole guarantees that if they are authenticated as such, they get the role.
          if (userRole !== 'viewer') return true;
          return false;
      }
      return true;
  }, [config.visibility, config.viewPass, userRole]);

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
