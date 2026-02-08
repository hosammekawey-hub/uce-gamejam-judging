
import { createClient, RealtimeChannel, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Rating, Contestant, CompetitionConfig, GlobalSettings, Judge, UserProfile, SystemAdmin } from '../types';

// --- CONFIGURATION ---

// Safely access environment variables
const getEnv = (key: string) => {
    // Check import.meta.env (Vite standard)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key];
    }
    return undefined;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
const SUPABASE_KEY = getEnv('VITE_SUPABASE_KEY') || 'placeholder';

if (SUPABASE_URL === 'https://placeholder.supabase.co') {
    console.warn("⚠️ JudgePro: Supabase credentials missing. App running in offline/demo mode.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { 
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true 
    }
});

// CRITICAL: Explicitly select only non-sensitive columns.
const SAFE_EVENT_COLUMNS = 'id, title, description, rubric, tie_breakers, visibility, view_pass, registration, organizer_id, is_setup_complete, created_at, updated_at';

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
          console.debug("getCurrentUser check failed (expected if offline/no-credentials).");
          return null;
      }
  },

  // --- SYSTEM ADMIN MANAGEMENT (DB BACKED) ---

  async isSystemAdmin(email: string): Promise<boolean> {
      if (!email) return false;
      // RLS ensures we can only find the record if we are allowed to see it
      const { data, error } = await supabase
        .from('system_admins')
        .select('email')
        .eq('email', email)
        .single();
      
      return !!data && !error;
  },

  async getSystemAdmins(): Promise<SystemAdmin[]> {
      const { data, error } = await supabase
        .from('system_admins')
        .select('*')
        .order('role', { ascending: false }) // Master first ('master' > 'admin' alphabetically no, but close enough, usually explicit sort is better)
        .order('created_at', { ascending: true });
      
      if (error) {
          console.error("Failed to fetch admins:", error);
          return [];
      }
      return data as SystemAdmin[];
  },

  async addSystemAdmin(email: string): Promise<{ success: boolean; message?: string }> {
      const { error } = await supabase
        .from('system_admins')
        .insert({ email: email.toLowerCase(), role: 'admin' });
      
      if (error) return { success: false, message: error.message };
      return { success: true };
  },

  async removeSystemAdmin(email: string): Promise<boolean> {
      const { error } = await supabase
        .from('system_admins')
        .delete()
        .eq('email', email);
      
      return !error;
  },

  async transferMasterRole(newMasterEmail: string): Promise<{ success: boolean; message?: string }> {
      const { error } = await supabase.rpc('transfer_master_role', { new_master_email: newMasterEmail });
      
      if (error) return { success: false, message: error.message };
      return { success: true };
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

  // --- STORAGE ---

  async uploadThumbnail(file: File, eventId: string): Promise<string | null> {
      try {
          // Create unique path: eventId/timestamp_filename
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${eventId}/${fileName}`;

          const { error: uploadError } = await supabase.storage
              .from('thumbnails')
              .upload(filePath, file);

          if (uploadError) {
              console.error("Upload Error:", uploadError);
              return null;
          }

          const { data } = supabase.storage
              .from('thumbnails')
              .getPublicUrl(filePath);

          return data.publicUrl;
      } catch (err) {
          console.error("Storage Exception:", err);
          return null;
      }
  },

  // --- FETCH LISTS ---

  async getAllEventsAdmin() {
      // ADMIN ONLY: Fetch basic info for all events to display in the inspector
      const { data, error } = await supabase
        .from('events')
        .select('id, title, organizer_id, created_at, description')
        .order('created_at', { ascending: false });
      
      if (error) {
          console.error("Admin Fetch Error:", error);
          return [];
      }
      return data;
  },

  async getEventsForOrganizer(userId: string) {
      // Use SAFE_EVENT_COLUMNS instead of '*'
      const { data, error } = await supabase
        .from('events')
        .select(SAFE_EVENT_COLUMNS)
        .eq('organizer_id', userId);

      if (error) console.error("getEventsForOrganizer DB Error:", error);
      
      return (data || []).map((row: any) => ({
          ...row, 
          competitionId: row.id,
          organizerId: row.organizer_id,
          organizerPass: '', // HIDDEN
          judgePass: ''      // HIDDEN
      }));
  },

  async getEventsForJudge(userId: string) {
      const { data: judges, error: judgeError } = await supabase
        .from('judges')
        .select('event_id')
        .eq('user_id', userId);

      if (judgeError || !judges || judges.length === 0) return [];
      
      const eventIds = judges.map(j => j.event_id);

      // Use SAFE_EVENT_COLUMNS instead of '*'
      const { data: events, error: eventError } = await supabase
        .from('events')
        .select(SAFE_EVENT_COLUMNS)
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

      // Use SAFE_EVENT_COLUMNS instead of '*'
      const { data: events, error: eventError } = await supabase
        .from('events')
        .select(SAFE_EVENT_COLUMNS)
        .in('id', eventIds);
      
      return events || [];
  },

  // --- ACTIONS ---

  async checkEventExists(id: string): Promise<boolean> {
      const { count } = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('id', id);
      return (count || 0) > 0;
  },

  async verifyOrganizerPassword(eventId: string, password: string): Promise<{ success: boolean; config?: CompetitionConfig }> {
      // SECURE RPC CALL - No password leaked
      const { data, error } = await supabase.rpc('verify_organizer_password', {
          p_event_id: eventId, 
          p_password: password
      });
      
      if (error || !data || !data.success) return { success: false };
      
      const c = data.config;
      // Map the safe RPC response to the frontend config object
      const config: CompetitionConfig = {
          competitionId: c.competitionId,
          title: c.title,
          typeDescription: c.typeDescription || '',
          organizerPass: '', // HIDDEN
          judgePass: '',     // HIDDEN
          rubric: c.rubric || [],
          tieBreakers: c.tieBreakers || [],
          isSetupComplete: c.isSetupComplete, // NOW DYNAMIC FROM RPC
          organizerId: c.organizerId,
          visibility: c.visibility || 'public',
          viewPass: c.viewPass || '',
          registration: c.registration || 'closed'
      };
      
      return { success: true, config };
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
          tie_breakers: config.tieBreakers, // JSONB
          is_setup_complete: config.isSetupComplete // PERSIST THIS FIELD
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
      
      if (config.isSetupComplete !== undefined) payload.is_setup_complete = config.isSetupComplete;

      // Passwords can be updated, but are never read back by the client
      if (config.organizerPass !== undefined) payload.organizer_pass = config.organizerPass;
      if (config.judgePass !== undefined) payload.judge_pass = config.judgePass;
      
      if (config.rubric) payload.rubric = config.rubric; 
      if (config.tieBreakers) payload.tie_breakers = config.tieBreakers;
      
      const { error } = await supabase.from('events').update(payload).eq('id', id);
      return !error;
  },

  // --- DELETION ---
  
  async deleteEvent(eventId: string, secret?: string): Promise<boolean> {
      // Use the Secure RPC function for atomic deletion
      // Supports both Auth ID check AND Secret Passphrase check
      const { data, error } = await supabase.rpc('delete_competition', {
          p_event_id: eventId,
          p_secret: secret || null
      });

      if (error) {
          console.error("Delete Event RPC Failed:", error);
          return false;
      }

      // RPC returns boolean (true if successful)
      return data === true;
  },

  // --- FETCHING FULL STATE (Dashboard) ---

  async getEventMetadata(id: string): Promise<CompetitionConfig | null> {
      // Use SAFE_EVENT_COLUMNS instead of '*'
      const { data, error } = await supabase.from('events').select(SAFE_EVENT_COLUMNS).eq('id', id).single();
      if (error || !data) return null;

      return {
          competitionId: data.id,
          title: data.title,
          typeDescription: data.description || '',
          organizerPass: '', // HIDDEN
          judgePass: '',     // HIDDEN
          rubric: data.rubric || [],
          tieBreakers: data.tie_breakers || [],
          isSetupComplete: data.is_setup_complete, // NOW MAPPED FROM DB
          organizerId: data.organizer_id,
          visibility: data.visibility || 'public',
          viewPass: data.view_pass || '',
          registration: data.registration || 'closed'
      };
  },
  
  // Use the database view for fetching initial leaderboard state (Server-Side calculation)
  async getLeaderboardSnapshot(eventId: string) {
      const { data, error } = await supabase
        .from('leaderboard_view')
        .select('*')
        .eq('event_id', eventId);
      
      if (error) {
          console.error("Leaderboard fetch error:", error);
          return [];
      }
      return data;
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
     // SECURE RPC CALL
     const { data: isValid, error: rpcError } = await supabase.rpc('verify_judge_password', {
        p_event_id: eventId,
        p_password: secret
     });

     if (rpcError) return { success: false, message: 'Verification Error' };
     if (!isValid) return { success: false, message: 'Invalid Judge Password' };

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
          thumbnail: c.thumbnail // Now expects a URL from the UI, not base64
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