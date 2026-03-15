const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface MeetingSummary {
  meetingId: string;
  studentCount: number;
  avgScore: number | null;
  lastUpdated: number;
}

export interface ScorePoint {
  score: number;
  scoredAt: number;
}

export interface ConfusionEvent {
  timestamp: number;
  durationMs: number;
  intervened: boolean;
}

export interface StudentEngagement {
  uuid: string;
  name: string | null;
  latestScore: number | null;
  scores: ScorePoint[];
  confusionEvents: ConfusionEvent[];
  interventionCount: number;
  confusionPct: number;
  detectionEnabled: boolean;
  interventionActive: boolean;
}

export interface MeetingAnalytics {
  meetingId: string;
  tutorName: string;
  startTime: number;
  durationMs: number;
  students: StudentEngagement[];
}

