
// We use a specific bucket ID for this event.
// In a real production scenario, you would create a private bucket on kvdb.io and use the secret key.
const BUCKET_ID = 'EsoeNYZt9bNthRpMz2jCTU'; 
const BASE_URL = `https://kvdb.io/${BUCKET_ID}`;

// Circuit breaker to stop flooding the console with 404s if the bucket doesn't exist
let isBackendUnavailable = false;

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
    if (!phrase || isBackendUnavailable) return null;
    try {
      const key = this.getCompetitionKey(phrase);
      // Adding a timestamp to prevent aggressive browser caching of the fetch request
      const url = `${BASE_URL}/${key}?t=${Date.now()}`;
      
      const response = await fetch(url);
      
      if (response.status === 404) {
        // Bucket or Key not found. This is expected for new events.
        // We don't disable the backend here because it might just be an empty key, 
        // but if the bucket itself is missing, POST will fail later.
        return null;
      }
      
      if (!response.ok) {
        console.warn(`[SyncService] Remote fetch issue (${response.status}). Switching to local data.`);
        isBackendUnavailable = true; // Stop trying if server errors
        return null;
      }
      
      return await response.json();
    } catch (error) {
      // Network error (offline)
      return null;
    }
  },

  /**
   * Pushes the current state to the cloud.
   */
  async pushData(phrase: string, data: any) {
    if (!phrase || isBackendUnavailable) return false;
    
    try {
      const key = this.getCompetitionKey(phrase);
      const url = `${BASE_URL}/${key}`;
      
      const response = await fetch(url, {
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          lastSynced: Date.now()
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // The bucket itself likely doesn't exist. 
          // Stop trying to sync to prevent console red spam.
          console.log('[SyncService] Cloud storage not configured. Running in Offline Mode.');
          isBackendUnavailable = true;
        }
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
};
