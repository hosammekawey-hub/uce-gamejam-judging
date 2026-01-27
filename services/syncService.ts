
// Unique bucket for this specific instance to prevent collision
const BUCKET_ID = 'uce_gj_2026_prod_v2'; 
const BASE_URL = `https://kvdb.io/${BUCKET_ID}`;

export const SyncService = {
  /**
   * Generates a unique key based on the competition's access phrase.
   * Uses a hyphen instead of an underscore to avoid potential URL misinterpretations.
   */
  getCompetitionKey(phrase: string) {
    const cleanPhrase = phrase.toLowerCase().replace(/\s+/g, '').trim();
    return `jam-${cleanPhrase}`;
  },

  /**
   * Fetches all competition data.
   */
  async pullData(phrase: string) {
    try {
      const key = this.getCompetitionKey(phrase);
      const response = await fetch(`${BASE_URL}/${key}`);
      
      if (response.status === 404) {
        // This is a new competition phrase, return null to signify "no data yet"
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      // Log error but don't break the app flow
      console.warn('SyncService: Cloud data not available yet or network error.');
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
      const response = await fetch(`${BASE_URL}/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          lastUpdated: Date.now()
        }),
      });
      return response.ok;
    } catch (error) {
      console.error('SyncService: Cloud push failed:', error);
      return false;
    }
  }
};
