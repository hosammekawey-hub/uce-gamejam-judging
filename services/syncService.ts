
// We use a specific bucket ID for this event.
// In a real production scenario, you would create a private bucket on kvdb.io and use the secret key.
// For this jam, we use a public-access bucket pattern.
const BUCKET_ID = 'ucegj2026syncv2'; 
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
      // Adding a timestamp to prevent aggressive browser caching of the fetch request
      const url = `${BASE_URL}/${key}?t=${Date.now()}`;
      
      const response = await fetch(url);
      
      if (response.status === 404) {
        // This is normal for a fresh session that hasn't synced yet.
        return null;
      }
      
      if (!response.ok) {
        // If the service is down or bucket is invalid, return null to trigger offline mode
        console.warn(`[SyncService] Remote fetch issue (${response.status}). Using local data.`);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      console.warn('[SyncService] Network offline or unreachable.');
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
      
      // We use POST to create/update.
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
          console.warn('[SyncService] Cloud bucket not initialized. App will work offline.');
        }
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }
};
