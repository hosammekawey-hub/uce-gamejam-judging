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

export const SyncService = {
  getCompetitionKey(phrase: string) {
    const cleanPhrase = phrase.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return `jam_${cleanPhrase}`;
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
        console.warn(`[SyncService] Remote fetch issue (${response.status}). Switching to local data.`);
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
   * This prevents one judge from overwriting another judge's work.
   */
  async pushData(phrase: string, localData: CloudData, role: 'judge' | 'organizer') {
    if (!phrase || isBackendUnavailable) return false;
    
    try {
      const key = this.getCompetitionKey(phrase);
      const url = `${BASE_URL}/${key}`;
      
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (WRITE_KEY) {
        const auth = btoa(`${BUCKET_ID}:${WRITE_KEY}`);
        headers['Authorization'] = `Basic ${auth}`;
      }

      // 1. Fetch the absolute latest state from cloud before writing
      //    (We reuse pullData logic but need it inline to be safe and reduce race conditions)
      let remoteData: CloudData | null = null;
      try {
        const fetchRes = await fetch(`${url}?t=${Date.now()}`, { headers });
        if (fetchRes.ok) {
          remoteData = await fetchRes.json();
        }
      } catch (e) {
        // If fetch fails, we might be offline, so we can't safely merge. 
        // We will fail the push to protect integrity.
        return false;
      }

      // 2. MERGE LOGIC
      let mergedData: CloudData = { ...localData };

      if (remoteData) {
        // A. Merge Ratings (The critical part)
        // We assume remote has ratings from other judges. We keep those.
        // We only overwrite a specific rating if our local one is NEWER.
        const mergedRatingsMap = new Map<string, Rating>();

        // Populate with remote ratings first
        if (Array.isArray(remoteData.ratings)) {
          remoteData.ratings.forEach(r => mergedRatingsMap.set(`${r.judgeId}_${r.teamId}`, r));
        }

        // Overlay local ratings
        localData.ratings.forEach(localRating => {
          const id = `${localRating.judgeId}_${localRating.teamId}`;
          const remoteRating = mergedRatingsMap.get(id);

          if (!remoteRating) {
            // New rating from us, add it
            mergedRatingsMap.set(id, localRating);
          } else {
            // Conflict: Check timestamps. Only overwrite if local is actually newer.
            if (localRating.lastUpdated > remoteRating.lastUpdated) {
              mergedRatingsMap.set(id, localRating);
            }
          }
        });

        mergedData.ratings = Array.from(mergedRatingsMap.values());

        // B. Merge Judges List (Union)
        const allJudges = new Set([...(remoteData.judges || []), ...(localData.judges || [])]);
        mergedData.judges = Array.from(allJudges);

        // C. Merge Teams
        // If we are a JUDGE, we trust the Cloud's team list (Organizers might have updated it).
        // If we are an ORGANIZER, we trust our Local team list (we might have just added one).
        if (role === 'organizer') {
           mergedData.teams = localData.teams;
        } else {
           // As a judge, accept the remote team list if it exists
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