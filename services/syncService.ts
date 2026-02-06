
import { createClient, RealtimeChannel, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Rating, Contestant, CompetitionConfig, GlobalSettings, Judge, UserProfile } from '../types';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://aefegdmffmwrukeoqjbm.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlZmVnZG1mZm13cnVrZW9xamJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4OTY0OTEsImV4cCI6MjA4NTQ3MjQ5MX0.ejK09pWZJimLzpWb8OtDKh7Nc-18rDUy6aRivE_ZLwg';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { 
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true 
    }
});

export const SyncService = {
  
  // --- AUTHENTICATION ---
  
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
      return supabase.auth.onAuthStateChange(callback);
  },

  async signInWithGoogle() {
      try {
          const redirectUrl = window.location.origin;
          const { data, error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                  redirectTo: redirectUrl,
                  queryParams: { access_type: 'online', prompt: 'select_account' }
              }
          });
          if (error) console.error("Supabase Auth Error:", error.message);
          return { data, error };
      } catch (err) {
          return { data: null, error: err as any };
      }
  },

  async signOut() {
      return await supabase.auth.signOut();
  },

  async getCurrentUser(): Promise<UserProfile | null> {
      try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          
          let user = session?.user;
          if (!user) {
              const { data, error } = await supabase.auth.getUser();
              if (error && !error.message.includes('AbortError')) console.warn("User check warning:", error.message);
              user = data.user;
          }
          
          if (!user) return null;
          
          return {
              id: user.id,
              email: user.email!,
              full_name: user.user_metadata.full_name || user.email?.split('@')[0] || 'User',
              avatar_url: user.user_metadata.avatar_url
          };
      } catch (err) {
          console.error("getCurrentUser failed:", err);
          return null;
      }
  },

  // --- GLOBAL SETTINGS ---
  async getGlobalSettings(): Promise<GlobalSettings | null> {
    const { data } = await supabase.from('events').select('rubric').eq('id', 'sys_settings').single();
    return data?.rubric ? (data.rubric as any) : null; 
  },

  async saveGlobalSettings(settings: GlobalSettings): Promise<boolean> {
    const { error } = await supabase.from('events').upsert({ 
        id: 'sys_settings', 
        title: 'System Settings',
        organizer_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        rubric: settings as any 
    });
    return !error;
  },

  // --- FETCH LISTS ---

  async getEventsForOrganizer(userId: string) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', userId);

      if (error) console.error("getEventsForOrganizer DB Error:", error);
      
      return (data || []).map((row: any) => ({
          ...row, 
          competitionId: row.id,
          organizerId: row.organizer_id
      }));
  },

  async getEventsForJudge(userId: string) {
      const { data: judges, error: judgeError } = await supabase
        .from('judges')
        .select('event_id')
        .eq('user_id', userId);

      if (judgeError || !judges || judges.length === 0) return [];
      
      const eventIds = judges.map(j => j.event_id);

      const { data: events, error: eventError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds);
      
      if (eventError) console.error("getEventsForJudge error:", eventError);
      return events || [];
  },

  async getEventsForContestant(userId: string) {
      const { data: contestants, error: conError } = await supabase
        .from('contestants')
        .select('event_id')
        .eq('user_id', userId);
      
      if (conError || !contestants || contestants.length === 0) return [];

      const eventIds = contestants.map(c => c.event_id);

      const { data: events, error: eventError } = await supabase
        .from('events')
        .select('*')
        .in('id', eventIds);
      
      return events || [];
  },

  // --- ACTIONS ---

  async checkEventExists(id: string): Promise<boolean> {
      const { count } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('id', id);
      return (count || 0) > 0;
  },

  async verifyOrganizerPassword(eventId: string, password: string): Promise<{ success: boolean; config?: CompetitionConfig }> {
      const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
      
      if (error || !data) return { success: false };
      
      if (data.organizer_pass === password) {
           const config: CompetitionConfig = {
              competitionId: data.id,
              title: data.title,
              typeDescription: data.description || '',
              organizerPass: data.organizer_pass,
              judgePass: data.judge_pass,
              rubric: data.rubric || [],
              tieBreakers: data.tie_breakers || [],
              isSetupComplete: true,
              organizerId: data.organizer_id,
              visibility: data.visibility || 'public',
              viewPass: data.view_pass || '',
              registration: data.registration || 'closed'
           };
           return { success: true, config };
      }
      
      return { success: false };
  },

  async createEvent(config: CompetitionConfig, userId?: string): Promise<{ success: boolean, message: string }> {
      const { error } = await supabase.from('events').insert({
          id: config.competitionId,
          title: config.title,
          description: config.typeDescription,
          organizer_id: userId,
          organizer_pass: config.organizerPass,
          judge_pass: config.judgePass,
          visibility: config.visibility,
          view_pass: config.viewPass,
          registration: config.registration,
          rubric: config.rubric,      // JSONB
          tie_breakers: config.tieBreakers // JSONB
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
      if (config.typeDescription) payload.description = config.typeDescription;
      if (config.visibility) payload.visibility = config.visibility;
      if (config.registration) payload.registration = config.registration;
      if (config.viewPass !== undefined) payload.view_pass = config.viewPass;
      if (config.organizerPass !== undefined) payload.organizer_pass = config.organizerPass;
      if (config.judgePass !== undefined) payload.judge_pass = config.judgePass; // Added Judge Pass
      
      if (config.rubric) payload.rubric = config.rubric; 
      if (config.tieBreakers) payload.tie_breakers = config.tieBreakers;
      
      const { error } = await supabase.from('events').update(payload).eq('id', id);
      return !error;
  },

  // --- FETCHING FULL STATE (Dashboard) ---

  async getEventMetadata(id: string): Promise<CompetitionConfig | null> {
      const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
      if (error || !data) return null;

      return {
          competitionId: data.id,
          title: data.title,
          typeDescription: data.description || '',
          organizerPass: data.organizer_pass,
          judgePass: data.judge_pass,
          rubric: data.rubric || [],
          tieBreakers: data.tie_breakers || [],
          isSetupComplete: true,
          organizerId: data.organizer_id,
          visibility: data.visibility || 'public',
          viewPass: data.view_pass || '',
          registration: data.registration || 'closed'
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
              id: t.id, // UUID
              userId: t.user_id, // UUID
              name: t.name,
              title: t.title,
              description: t.description,
              thumbnail: t.thumbnail
          })) as Contestant[],
          ratings: (ratingsRes.data || []).map((r: any) => ({
              teamId: r.team_id, // UUID
              judgeId: r.judge_id, // ID string
              scores: r.scores, // JSONB
              feedback: r.feedback,
              isDisqualified: r.is_disqualified,
              lastUpdated: new Date(r.updated_at).getTime()
          })) as Rating[],
          judges: (judgesRes.data || []).map((j: any) => ({
              id: j.user_id || j.name, // Use UUID if available
              name: j.name,
              userId: j.user_id,
              status: j.status
          })) as Judge[]
      };
  },

  // --- JOINING / LEAVING ---

  async joinEventAsJudge(eventId: string, user: UserProfile, secret: string): Promise<{success: boolean, message: string}> {
     const meta = await this.getEventMetadata(eventId);
     if (!meta) return { success: false, message: 'Event not found' };
     if (meta.judgePass !== secret) return { success: false, message: 'Invalid Judge Password' };

     const { error } = await supabase.from('judges').upsert({
         event_id: eventId,
         user_id: user.id, // Now we have this column!
         name: user.full_name,
         status: 'joined',
         updated_at: new Date().toISOString()
     }, { onConflict: 'event_id, user_id' }); 

     if (error) return { success: false, message: error.message };
     return { success: true, message: 'Joined successfully' };
  },

  async leaveEventAsJudge(eventId: string, userId: string) {
      await supabase.from('judges').delete().eq('event_id', eventId).eq('user_id', userId);
  },

  async joinEventAsContestant(eventId: string, user: UserProfile, entryDetails: {title: string, description: string, thumbnail: string}) {
      const meta = await this.getEventMetadata(eventId);
      if (!meta) return { success: false, message: 'Event not found' };
      if (meta.registration !== 'open') return { success: false, message: 'Registration is closed.' };

      const { data: existing } = await supabase.from('contestants').select('id').eq('event_id', eventId).eq('user_id', user.id).single();

      const payload = {
          event_id: eventId,
          user_id: user.id,
          name: user.full_name,
          title: entryDetails.title,
          description: entryDetails.description,
          thumbnail: entryDetails.thumbnail
      };

      let error;
      if (existing) {
          const res = await supabase.from('contestants').update(payload).eq('id', existing.id);
          error = res.error;
      } else {
          const res = await supabase.from('contestants').insert(payload);
          error = res.error;
      }
      
      return { success: !error, message: error ? error.message : 'Joined' };
  },

  async withdrawAsContestant(eventId: string, userId: string) {
      return supabase.from('contestants').delete().eq('event_id', eventId).eq('user_id', userId);
  },

  // --- REALTIME MUTATIONS ---

  async addContestant(eventId: string, c: Contestant) {
      const payload: any = {
          event_id: eventId,
          name: c.name,
          title: c.title,
          description: c.description,
          thumbnail: c.thumbnail
      };
      
      if (c.id && c.id.length > 10) payload.id = c.id; 
      if (c.userId) payload.user_id = c.userId;

      return supabase.from('contestants').upsert(payload);
  },

  async removeContestant(eventId: string, id: string) {
      return supabase.from('contestants').delete().eq('id', id);
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
      const isUUID = judgeId.length > 20; 
      const query = supabase.from('judges').delete().eq('event_id', eventId);
      if (isUUID) query.eq('user_id', judgeId);
      else query.eq('name', judgeId);

      const { error } = await query;
      if (!error) {
          await supabase.from('ratings').delete().eq('event_id', eventId).eq('judge_id', judgeId);
      }
  },

  // --- REALTIME SUBSCRIPTIONS ---

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
  },

  subscribeToUserDashboard(userId: string, onUpdate: () => void): RealtimeChannel {
      return supabase
        .channel(`dashboard-${userId}`)
        // Watch for events I organize
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `organizer_id=eq.${userId}` }, onUpdate)
        // Watch for events I judge
        .on('postgres_changes', { event: '*', schema: 'public', table: 'judges', filter: `user_id=eq.${userId}` }, onUpdate)
        // Watch for events I am contesting in
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contestants', filter: `user_id=eq.${userId}` }, onUpdate)
        .subscribe();
  }
};
