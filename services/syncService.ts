
const BUCKET_ID = 'uce_gamejam_2026_v1'; // Shared bucket ID for this competition
const BASE_URL = `https://kvdb.io/${BUCKET_ID}`;

export const SyncService = {
  /**
   * Generates a unique key based on the competition's access phrase
   */
  getCompetitionKey(phrase: string) {
    // Simple obfuscation to partition data if multiple jams use the same app
    return `jam_${phrase.toLowerCase().trim()}`;
  },

  /**
   * Fetches all competition data (teams and ratings)
   */
  async pullData(phrase: string) {
    try {
      const key = this.getCompetitionKey(phrase);
      const response = await fetch(`${BASE_URL}/${key}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Cloud pull failed:', error);
      return null;
    }
  },

  /**
   * Pushes the current state to the cloud
   */
  async pushData(phrase: string, data: any) {
    try {
      const key = this.getCompetitionKey(phrase);
      await fetch(`${BASE_URL}/${key}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return true;
    } catch (error) {
      console.error('Cloud push failed:', error);
      return false;
    }
  }
};
