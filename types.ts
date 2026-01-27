
export type UserRole = 'judge' | 'organizer';

export interface Criterion {
  id: string;
  name: string;
  weight: number;
  description: string;
  guidelines: {
    range: string;
    label: string;
    text: string;
  }[];
}

export interface Team {
  id: string;
  name: string;
  gameTitle: string;
  description: string;
  thumbnail: string;
}

export interface Judge {
  id: string;
  name: string;
  isCurrentUser?: boolean;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface ScoreSet {
  [criterionId: string]: number;
}

export interface Rating {
  teamId: string;
  judgeId: string;
  scores: ScoreSet;
  feedback: string;
  isDisqualified: boolean;
  lastUpdated: number;
}

export interface AppState {
  currentJudge: string | null;
  currentRole: UserRole;
  ratings: Rating[];
  otherJudges: Judge[];
}
