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

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchMeetings(): Promise<MeetingSummary[]> {
  const data = await fetchJson<{ meetings: MeetingSummary[] }>('/api/dashboard');
  return data.meetings;
}

export async function fetchMeeting(meetingId: string): Promise<StudentEngagement[]> {
  const data = await fetchJson<{ students: StudentEngagement[] }>(`/api/dashboard/${meetingId}`);
  return data.students;
}

export async function fetchAnalytics(meetingId: string): Promise<MeetingAnalytics> {
  return fetchJson<MeetingAnalytics>(`/api/analytics/${meetingId}`);
}

export async function interveneStudent(hostUuid: string, studentUuid: string, meetingId: string): Promise<void> {
  await fetch(`${API_BASE}/api/intervene/${hostUuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentUuid, meetingId }),
  });
}

export async function stopIntervention(hostUuid: string, studentUuid: string, meetingId: string): Promise<void> {
  await fetch(`${API_BASE}/api/intervene/${hostUuid}/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentUuid, meetingId }),
  });
}
