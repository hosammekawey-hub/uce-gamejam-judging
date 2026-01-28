import { Rating, Team } from '../types';

// We use a specific bucket ID for this event.
const BUCKET_ID = 'EsoeNYZt9bNthRpMz2jCTU'; 
const WRITE_KEY = ''; // Optional secret key if bucket is protected

const BASE_URL = `https://kvdb.io/${BUCKET_ID}`;

let isBackendUnavailable = false;

interface CloudData {
  teams: Team[];
  ratings: Rating[];
  judges: string[];
  updatedAt: number;
}

interface BannedLists {
  teams: string[];
  judges: string[];
}

export const SyncService = {
  getCompetitionKey(phrase: string) {
    const normalized = phrase.toLowerCase().trim();
    if (normalized === 'mask' || normalized === 'admin') {
      return 'jam_admin';
    }
    return `jam_${normalized.replace(/[^a-z0-9]/g, '')}`;
  },

  async pullData(phrase: string): Promise<CloudData | null> {
    if (!phrase || isBackendUnavailable) return null;
    try {
      const key = this.getCompetitionKey(phrase);
      const url = `${BASE_URL}/${key}?t=${Date.now()}`;
      
      const headers: HeadersInit = {};
      if (WRITE_KEY) {
         const auth = btoa(`${BUCKET_ID}:${WRITE_KEY}`);
         headers['Authorization'] = `Basic ${auth}`;
      }

      const response = await fetch(url, { headers });
      
      if (response.status === 404) return null;

      if (response.status === 403) {
        console.warn('[SyncService] Read permission denied. Switching to offline mode.');
        isBackendUnavailable = true;
        return null;
      }
      
      if (!response.ok) {
        isBackendUnavailable = true; 
        return null;
      }
      
      return await response.json();
    } catch (error) {
      return null;
    }
  },

  /**
   * Smart Sync: Fetches latest cloud data, merges with local changes, then pushes.
   * Handles Banned IDs (Tombstones) to prevent reviving deleted items.
   */
  async pushData(
    phrase: string, 
    localData: CloudData, 
    role: 'judge' | 'organizer',
    banned?: BannedLists
  ) {
    if (!phrase || isBackendUnavailable) return false;
    
    try {
      const key = this.getCompetitionKey(phrase);
      const url = `${BASE_URL}/${key}`;
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (WRITE_KEY) {
        const auth = btoa(`${BUCKET_ID}:${WRITE_KEY}`);
        headers['Authorization'] = `Basic ${auth}`;
      }

      // 1. Fetch latest cloud data
      let remoteData: CloudData | null = null;
      try {
        const fetchRes = await fetch(`${url}?t=${Date.now()}`, { headers });
        if (fetchRes.ok) {
          remoteData = await fetchRes.json();
        }
      } catch (e) {
        return false;
      }

      // 2. MERGE LOGIC
      let mergedData: CloudData = { ...localData };
      const bannedJudges = new Set(banned?.judges || []);
      const bannedTeams = new Set(banned?.teams || []);

      if (remoteData) {
        // A. Merge Ratings 
        const mergedRatingsMap = new Map<string, Rating>();

        if (Array.isArray(remoteData.ratings)) {
          // Add remote ratings ONLY if they aren't from banned judges/teams
          remoteData.ratings.forEach(r => {
            if (!bannedJudges.has(r.judgeId) && !bannedTeams.has(r.teamId)) {
              mergedRatingsMap.set(`${r.judgeId}_${r.teamId}`, r);
            }
          });
        }

        // Overlay local ratings
        localData.ratings.forEach(localRating => {
          if (!bannedJudges.has(localRating.judgeId) && !bannedTeams.has(localRating.teamId)) {
            const id = `${localRating.judgeId}_${localRating.teamId}`;
            const remoteRating = mergedRatingsMap.get(id);

            if (!remoteRating) {
              mergedRatingsMap.set(id, localRating);
            } else {
              if (localRating.lastUpdated > remoteRating.lastUpdated) {
                mergedRatingsMap.set(id, localRating);
              }
            }
          }
        });

        mergedData.ratings = Array.from(mergedRatingsMap.values());

        // B. Merge Judges & Teams
        if (role === 'organizer') {
           // ORGANIZER LOGIC (Garbage Collection + New Addition Acceptance):
           
           // 1. Start with Local List (The authority on what the Organizer wants)
           const finalTeams = [...localData.teams];
           const finalJudges = new Set(localData.judges);

           // 2. Look at Remote Data. 
           // If Remote has a team/judge that is NOT in Local, AND NOT in Banned list, 
           // it means it's a NEW entry (e.g. a judge who just logged in). We add them.
           if (remoteData.judges) {
             remoteData.judges.forEach(j => {
               if (!bannedJudges.has(j)) {
                 finalJudges.add(j);
               }
             });
           }

           // (Teams are usually only added by Organizer, but if we supported multi-admin...)
           if (remoteData.teams) {
             const localTeamIds = new Set(finalTeams.map(t => t.id));
             remoteData.teams.forEach(t => {
               if (!localTeamIds.has(t.id) && !bannedTeams.has(t.id)) {
                 finalTeams.push(t);
               }
             });
           }

           mergedData.judges = Array.from(finalJudges);
           mergedData.teams = finalTeams;

        } else {
           // JUDGE LOGIC (Simple Union):
           const allJudges = new Set([...(remoteData.judges || []), ...(localData.judges || [])]);
           mergedData.judges = Array.from(allJudges);
           mergedData.teams = remoteData.teams && remoteData.teams.length > 0 ? remoteData.teams : localData.teams;
        }
      }

      mergedData.updatedAt = Date.now();

      // 3. Push Merged Data
      const response = await fetch(url, {
        method: 'POST', 
        headers: headers,
        body: JSON.stringify(mergedData),
      });

      if (response.status === 413) {
        alert("CRITICAL WARNING: Data size too large for Cloud Storage! \n\nThe sync failed because the teams have too many large images. \n\nPlease ask the organizer to delete some teams or re-upload images with lower quality.");
        return false;
      }

      if (response.status === 403) {
        isBackendUnavailable = true;
        return false;
      }

      if (!response.ok) return false;

      return true;
    } catch (error) {
      return false;
    }
  }
};