
// Unique bucket for this specific instance to prevent collision.
// Using a random-like string for the bucket name helps avoid conflicts and permission issues.
const BUCKET_ID = 'uce-jam-2026-v5-sync'; 
const BASE_URL = `https://kvdb.io/${BUCKET_ID}`;

export const SyncService = {
  /**
   * Generates a unique key based on the competition's access phrase.
   */
  getCompetitionKey(phrase: string) {
    const cleanPhrase = phrase.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    return `jam-${cleanPhrase}`;
  },

  /**
   * Fetches all competition data.
   */
  async pullData(phrase: string) {
    if (!phrase) return null;
    try {
      const key = this.getCompetitionKey(phrase);
      console.log(`[SyncService] Pulling data for key: ${key} from ${BASE_URL}/${key}`);
      
      const response = await fetch(`${BASE_URL}/${key}`);
      
      if (response.status === 404) {
        console.warn(`[SyncService] No cloud data found for key: ${key} (Expected for new sessions)`);
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[SyncService] Successfully pulled data:`, data);
      return data;
    } catch (error) {
      console.error('[SyncService] Cloud pull failed:', error);
      return null;
    }
  },

  /**
   * Pushes the current state to the cloud.
   */
  async pushData(phrase: string, data: any) {
    if (!phrase) {
      console.error('[SyncService] Cannot push data: No access phrase provided.');
      return false;
    }
    
    try {
      const key = this.getCompetitionKey(phrase);
      console.log(`[SyncService] Pushing data for key: ${key} to ${BASE_URL}/${key}`, data);
      
      const response = await fetch(`${BASE_URL}/${key}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...data,
          lastSyncedAt: Date.now()
        }),
      });

      if (!response.ok) {
        // Log details about the failure to help identify why the server rejected the PUT
        const errorText = await response.text();
        console.error(`[SyncService] Push failed! Status: ${response.status} ${response.statusText}. Server Response: ${errorText}`);
        return false;
      }

      console.log(`[SyncService] Data successfully synced to cloud.`);
      return true;
    } catch (error) {
      console.error('[SyncService] Network error during cloud push:', error);
      return false;
    }
  }
};
