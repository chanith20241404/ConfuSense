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

export interface StudentDisengagedPayload {
  studentUuid: string;
  studentName?: string;
  score: number;
}

export interface ConfusionConfirmedPayload {
  studentUuid: string;
  studentName: string;
  timestamp: number;
}

export interface InterventionPayload {
  studentUuid: string;
  studentName: string;
  hostName: string;
  timestamp: number;
}

export interface DetectionStatusPayload {
  studentUuid: string;
  studentName: string;
  enabled: boolean;
}

export type NotificationPayload = LowEngagementPayload | StudentDisengagedPayload | ConfusionConfirmedPayload | InterventionPayload | DetectionStatusPayload;

export interface Notification {
  id: number;
  uuid: string;
  type: NotificationType;
  payload: NotificationPayload;
  createdAt: number;
  readAt: number | null;
}

export interface FrameMessage {
  uuid: string;
  meetingId: string;
  frame: string; // base64 JPEG
  timestamp: number;
}

export interface BatchFrameMessage {
  uuid: string;
  meetingId: string;
  frames: string[]; // array of base64 JPEGs
  timestamp: number;
}

export interface MeetingSummary {
  meetingId: string;
  studentCount: number;
  avgScore: number | null;
  lastUpdated: number;
}

export interface StudentEngagement {
  uuid: string;
  name: string | null;
  latestScore: number | null;
  scores: Array<{ score: number; scoredAt: number }>;
  confusionEvents: Array<{ timestamp: number; durationMs: number; intervened: boolean; intervenedAt: number | null; stoppedAt: number | null }>;
  interventionCount: number;
  confusionPct: number;
  detectionEnabled: boolean;
  interventionActive: boolean;
}
