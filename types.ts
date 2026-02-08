
export type UserRole = 'judge' | 'organizer' | 'admin' | 'contestant' | 'viewer';

export interface UserProfile {
  id: string; // UUID
  email: string;
  full_name: string;
  avatar_url?: string;
}

export interface SystemAdmin {
    email: string;
    role: 'master' | 'admin';
    created_at: string;
}

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

export interface Contestant {
  id: string;
  userId?: string; // Linked User ID if they joined via SSO
  name: string; // Participant/Team Name
  title: string; // Project/Submission Title
  description: string;
  thumbnail: string;
}

export interface Judge {
  id: string; // Usually the UUID now
  name: string;
  userId?: string; // Linked User ID
  isCurrentUser?: boolean;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface ScoreSet {
  [criterionId: string]: number;
}

export interface Rating {
  teamId: string; // Keeps 'teamId' as key for compatibility, but refers to Contestant.id
  judgeId: string; // Refers to Judge.id (name or UUID)
  scores: ScoreSet;
  feedback: string;
  isDisqualified: boolean;
  lastUpdated: number;
}

export interface CompetitionConfig {
  competitionId: string; // Unique slug for the event
  title: string;
  typeDescription: string;
  organizerPass: string; // Stored in cloud so organizers can login from other devices
  judgePass: string;     // Stored in cloud so judges can be verified
  
  // New Privacy & Registration Settings
  visibility: 'public' | 'private';
  viewPass?: string;     // Required if private and not a registered participant
  registration: 'open' | 'closed';

  rubric: Criterion[];
  tieBreakers?: { title: string; question: string }[];
  isSetupComplete: boolean;
  organizerId?: string; // UUID of the organizer
}

export interface CompetitionTemplate {
  id: string;
  label: string;
  icon: string;
  description: string;
  rubric: Criterion[];
  tieBreakers: { title: string; question: string }[];
}

export interface GlobalSettings {
  judgePass: string; // Deprecated in favor of per-competition settings, kept for legacy
  organizerPass: string; // Deprecated
  templates: CompetitionTemplate[];
}

export interface AppState {
  currentUser: UserProfile | null;
  currentRole: UserRole;
  currentEventId: string | null;
  ratings: Rating[];
  otherJudges: Judge[];
}