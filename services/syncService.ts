
// Using a generic bucket ID. 
// Note: In a real production environment, this bucket must be created via the KVDB API first.
// If the bucket does not exist, the service will gracefully degrade to offline mode.
const BUCKET_ID = 'ucegj2026syncv1'; 
const BASE_URL = `https://kvdb.io/${BUCKET_ID}`;

export const SyncService = {
  /**
   * Generates a unique key based on the competition's access phrase.
   */
  getCompetitionKey(phrase: string) {
    const cleanPhrase = phrase.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return `jam_${cleanPhrase}`;
  },

  /**
   * Fetches all competition data.
   */
  async pullData(phrase: string) {
    if (!phrase) return null;
    try {
      const key = this.getCompetitionKey(phrase);
      const url = `${BASE_URL}/${key}`;
      
      const response = await fetch(url);
      
      if (response.status === 404) {
        // Data doesn't exist yet, or bucket missing.
        return null;
      }
      
      if (!response.ok) {
        // If bucket is missing or other server error, strict fail here to trigger offline mode handling in App
        if (response.status === 400 || response.status === 403) {
           console.warn('[SyncService] Cloud access denied or invalid. Switching to local.');
           return null;
        }
        throw new Error(`Cloud Pull failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      // Suppress network errors to avoid console spam, just return null to fallback to local
      return null;
    }
  },

  /**
   * Pushes the current state to the cloud.
   */
  async pushData(phrase: string, data: any) {
    if (!phrase) return false;
    
    try {
      const key = this.getCompetitionKey(phrase);
      const url = `${BASE_URL}/${key}`;
      
      const response = await fetch(url, {
        method: 'POST', // POST is often safer for upserts in some KV stores, though PUT is standard
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          lastSynced: Date.now()
        }),
      });

      if (!response.ok) {
        // If we get a 404 on push, the bucket likely doesn't exist.
        if (response.status === 404) {
          console.warn('[SyncService] Cloud bucket not found. Operating in Offline Mode.');
        }
        return false;
      }

      return true;
    } catch (error) {
      // Silent fail for network issues to keep UX smooth
      return false;
    }
  }
};
