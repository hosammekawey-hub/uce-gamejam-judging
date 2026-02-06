
import { createClient, RealtimeChannel, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Rating, Contestant, CompetitionConfig, GlobalSettings, Judge, UserProfile } from '../types';

// --- CONFIGURATION ---
// 1. Your specific Project URL
const SUPABASE_URL = 'https://aefegdmffmwrukeoqjbm.supabase.co'; 

// 2. Paste your "Publishable API Key" (also known as 'anon' public key) here.
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZmVnZG1mZm13cnVrZW9xamJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4OTY0OTEsImV4cCI6MjA4NTQ3MjQ5MX0.ejK09pWZJimLzpWb8OtDKh7Nc-18rDUy6aRivE_ZLwg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true }
});

export const SyncService = {
  
  // --- AUTHENTICATION ---
  
  // CRITICAL: Subscribe to auth changes (SIGN_IN, SIGN_OUT, TOKEN_REFRESH)
  // This handles the OAuth redirect hash automatically.
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
      return supabase.auth.onAuthStateChange(callback);
  },

  async signInWithGoogle() {
      try {
          // Determine the redirect URL (e.g., https://myapp.vercel.app)
          const redirectUrl = window.location.origin;
          console.log("Attempting Google Sign-In with redirect to:", redirectUrl);

          const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                  redirectTo: redirectUrl,
                  // Standard flow to prevent 403s on unverified apps
                  queryParams: {
                      access_type: 'online', 
                      prompt: 'select_account'
                  }
              }
          });
          
          if (error) {
              console.error("Supabase Auth Error:", error.message);
              // Provide visual feedback if console is missed
              alert(`Auth Error: ${error.message}. Ensure ${redirectUrl} is in your Supabase Redirect URLs.`);
          }
          return { data, error };
      } catch (err) {
          console.error("Auth Exception:", err);
          return { data: null, error: err as any };
      }
  },

  async signOut() {
      return await supabase.auth.signOut();
  },

  async getCurrentUser(): Promise<UserProfile | null> {
      // 1. Check local session first (faster)
      const { data: { session } } = await supabase.auth.getSession();
      let user = session?.user;

      // 2. If no session, try fetching from server
      if (!user) {
          const { data, error } = await supabase.auth.getUser();
          if (error && !error.message.includes("Auth session missing")) {
              console.warn("User check warning:", error.message);
          }
          user = data.user;
      }
      
      if (!user) return null;
      
      return {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata.avatar_url
      };
  },

  // --- GLOBAL SETTINGS ---
  async getGlobalSettings(): Promise<GlobalSettings | null> {
    const { data } = await supabase.from('events').select('*').eq('id', 'sys_settings').single();
    return data?.rubric ? (data.rubric as any) : null; 
  },

  async saveGlobalSettings(settings: GlobalSettings): Promise<boolean> {
    const { error } = await supabase.from('events').upsert({ 
        id: 'sys_settings', 
        rubric: settings as any 
    });
    return !error;
  },

  // --- USER SPECIFIC EVENTS ---
  async getEventsForOrganizer(userId: string) {
      const { data } = await supabase.from('events').select('*').eq('organizer_id', userId);
      return data || [];
  },

  async getEventsForJudge(userId: string) {
      const { data: judges } = await supabase.from('judges').select('event_id').eq('user_id', userId);
      if (!judges || judges.length === 0) return [];
      
      const eventIds = judges.map(j => j.event_id);
      const { data: events } = await supabase.from('events').select('*').in('id', eventIds);
      return events || [];
  },

  async getEventsForContestant(userId: string) {
      const { data: contestants } = await supabase.from('contestants').select('event_id').eq('user_id', userId);
      if (!contestants || contestants.length === 0) return [];

      const eventIds = contestants.map(c => c.event_id);
      const { data: events } = await supabase.from('events').select('*').in('id', eventIds);
      return events || [];
  },

  // --- EVENT ACTIONS ---

  async joinEventAsJudge(eventId: string, user: UserProfile, secret: string): Promise<{success: boolean, message: string}> {
     const meta = await this.getEventMetadata(eventId);
     if (!meta) return { success: false, message: 'Event not found' };
     if (meta.judgePass !== secret) return { success: false, message: 'Invalid Judge Password' };

     const { error } = await supabase.from('judges').upsert({
         event_id: eventId,
         user_id: user.id,
         name: user.full_name,
         status: 'joined',
         updated_at: new Date().toISOString()
     }, { onConflict: 'event_id, user_id' });

     if (error) return { success: false, message: error.message };
     return { success: true, message: 'Joined successfully' };
  },

  async leaveEventAsJudge(eventId: string, userId: string) {
      await supabase.from('judges').delete().eq('event_id', eventId).eq('user_id', userId);
      await supabase.from('ratings').delete().eq('event_id', eventId).eq('judge_id', userId); 
  },

  async joinEventAsContestant(eventId: string, user: UserProfile, entryDetails: {title: string, description: string, thumbnail: string}) {
      const meta = await this.getEventMetadata(eventId);
      if (!meta) return { success: false, message: 'Event not found' };
      if (meta.registration !== 'open') return { success: false, message: 'Registration is closed for this event.' };

      const { error } = await supabase.from('contestants').upsert({
          id: user.id, 
          event_id: eventId,
          user_id: user.id,
          name: user.full_name,
          title: entryDetails.title,
          description: entryDetails.description,
          thumbnail: entryDetails.thumbnail
      });
      
      return { success: !error, message: error ? error.message : 'Joined' };
  },

  async withdrawAsContestant(eventId: string, userId: string) {
      return supabase.from('contestants').delete().eq('event_id', eventId).eq('user_id', userId);
  },

  // --- EVENT MANAGEMENT ---

  async checkEventExists(id: string): Promise<boolean> {
      const { count, error } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('id', id);
      if (error) {
          console.error("Check exists error:", error);
      }
      return (count || 0) > 0;
  },

  async createEvent(config: CompetitionConfig, userId?: string): Promise<{ success: boolean, message: string }> {
      const { error } = await supabase.from('events').insert({
          id: config.competitionId,
          title: config.title,
          type_description: config.typeDescription,
          organizer_pass: config.organizerPass,
          judge_pass: config.judgePass,
          rubric: { 
              criteria: config.rubric, 
              visibility: config.visibility, 
              viewPass: config.viewPass, 
              registration: config.registration 
          }, 
          tie_breakers: config.tieBreakers,
          organizer_id: userId || null
      });
      
      if (error) {
          console.error("Create event error:", error);
          return { success: false, message: error.message };
      }
      return { success: true, message: 'Event created' };
  },

  async updateEventConfig(id: string, config: Partial<CompetitionConfig>): Promise<boolean> {
      const payload: any = { updated_at: new Date().toISOString() };
      if (config.title) payload.title = config.title;
      if (config.rubric) {
           payload.rubric = {
               criteria: config.rubric,
               visibility: config.visibility || 'public',
               viewPass: config.viewPass,
               registration: config.registration || 'closed'
           };
      }
      if (config.tieBreakers) payload.tie_breakers = config.tieBreakers;
      
      const { error } = await supabase.from('events').update(payload).eq('id', id);
      return !error;
  },

  // --- FETCHING FULL STATE ---

  async getEventMetadata(id: string): Promise<CompetitionConfig | null> {
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
      if (error || !data) return null;
      
      const rawRubric = data.rubric as any;
      const criteria = Array.isArray(rawRubric) ? rawRubric : (rawRubric?.criteria || []);
      const visibility = rawRubric?.visibility || 'public';
      const viewPass = rawRubric?.viewPass || '';
      const registration = rawRubric?.registration || 'closed';

      return {
          competitionId: data.id,
          title: data.title,
          typeDescription: data.type_description,
          organizerPass: data.organizer_pass,
          judgePass: data.judge_pass,
          rubric: criteria,
          tieBreakers: data.tie_breakers,
          isSetupComplete: true,
          organizerId: data.organizer_id,
          visibility,
          viewPass,
          registration
      };
  },

  async getFullState(id: string) {
      const [teamsRes, ratingsRes, judgesRes] = await Promise.all([
          supabase.from('contestants').select('*').eq('event_id', id),
          supabase.from('ratings').select('*').eq('event_id', id),
          supabase.from('judges').select('*').eq('event_id', id)
      ]);

      return {
          teams: (teamsRes.data || []).map((t: any) => ({
              id: t.id,
              userId: t.user_id,
              name: t.name,
              title: t.title,
              description: t.description,
              thumbnail: t.thumbnail
          })) as Contestant[],
          ratings: (ratingsRes.data || []).map((r: any) => ({
              teamId: r.team_id,
              judgeId: r.judge_id,
              scores: r.scores,
              feedback: r.feedback,
              isDisqualified: r.is_disqualified,
              lastUpdated: new Date(r.updated_at).getTime()
          })) as Rating[],
          judges: (judgesRes.data || []).map((j: any) => ({
              id: j.user_id || j.name, 
              name: j.name,
              userId: j.user_id,
              status: j.status
          })) as Judge[]
      };
  },

  // --- REALTIME MUTATIONS ---

  async addContestant(eventId: string, c: Contestant) {
      return supabase.from('contestants').upsert({
          id: c.id,
          event_id: eventId,
          user_id: c.userId,
          name: c.name,
          title: c.title,
          description: c.description,
          thumbnail: c.thumbnail
      });
  },

  async removeContestant(eventId: string, id: string) {
      return supabase.from('contestants').delete().eq('id', id).eq('event_id', eventId);
  },

  async upsertRating(eventId: string, r: Rating) {
      return supabase.from('ratings').upsert({
          event_id: eventId,
          team_id: r.teamId,
          judge_id: r.judgeId,
          scores: r.scores,
          feedback: r.feedback,
          is_disqualified: r.isDisqualified,
          updated_at: new Date().toISOString()
      }, { onConflict: 'event_id, team_id, judge_id' });
  },

  async removeJudge(eventId: string, judgeId: string) {
      const { error } = await supabase.from('judges').delete().eq('event_id', eventId).or(`user_id.eq.${judgeId},name.eq.${judgeId}`);
      if (!error) {
          await supabase.from('ratings').delete().eq('event_id', eventId).eq('judge_id', judgeId);
      }
  },

  // --- REALTIME SUBSCRIPTION ---

  subscribeToEvent(eventId: string, callbacks: {
      onTeamsChange: (payload: any) => void,
      onRatingsChange: (payload: any) => void,
      onJudgesChange: (payload: any) => void,
      onConfigChange: (payload: any) => void
  }): RealtimeChannel {
      return supabase
        .channel(`event-${eventId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contestants', filter: `event_id=eq.${eventId}` }, callbacks.onTeamsChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ratings', filter: `event_id=eq.${eventId}` }, callbacks.onRatingsChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'judges', filter: `event_id=eq.${eventId}` }, callbacks.onJudgesChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, callbacks.onConfigChange)
        .subscribe();
  }
};
