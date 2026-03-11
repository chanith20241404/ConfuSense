export interface Session {
  uuid: string;
  meetingId: string;
  role: 'student' | 'host';
  name?: string;
  detectionOn?: boolean;
  joinedAt: number;
}

export interface ConfusionEvent {
  id: number;
  uuid: string;
  meetingId: string;
  timestamp: number;
  durationMs: number;
  intervened: boolean;
  intervenedAt: number | null;
}

export interface Intervention {
  id: number;
  hostUuid: string;
  studentUuid: string;
  meetingId: string;
  timestamp: number;
}

export interface EngagementScore {
  id: number;
  uuid: string;
  meetingId: string;
  score: number;
  scoredAt: number;
}

export type NotificationType = 'low_engagement' | 'student_disengaged' | 'confusion_confirmed' | 'intervention' | 'intervention_stopped' | 'detection_status';

export interface LowEngagementPayload {
  score: number;
}
