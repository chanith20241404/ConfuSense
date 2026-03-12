import { eq, and, isNull, gt, inArray, sql } from 'drizzle-orm';
import { db } from './client.js';
import { sessions, engagementScores, notifications, confusionEvents, interventions } from './schema.js';
import type {
  Session,
  EngagementScore,
  Notification,
  NotificationType,
  NotificationPayload,
  MeetingSummary,
  StudentEngagement,
} from '../types/index.js';

// ── Sessions ─────────────────────────────────────────────────────────────────

export async function upsertSession(session: Session): Promise<void> {
  await db
    .insert(sessions)
    .values({
      uuid:        session.uuid,
      meetingId:   session.meetingId,
      role:        session.role,
      name:        session.name ?? null,
      detectionOn: session.detectionOn === false ? 0 : 1,
      joinedAt:    session.joinedAt,
    })
    .onConflictDoUpdate({
      target: [sessions.uuid, sessions.meetingId, sessions.role],
      set: {
        name:        session.name ?? null,
        detectionOn: session.detectionOn === false ? 0 : 1,
        joinedAt:    session.joinedAt,
      },
    });
}

export async function updateDetectionStatus(uuid: string, meetingId: string, detectionOn: boolean): Promise<void> {
  await db
    .update(sessions)
    .set({ detectionOn: detectionOn ? 1 : 0 })
    .where(and(eq(sessions.uuid, uuid), eq(sessions.meetingId, meetingId), eq(sessions.role, 'student')));
}

export async function getHostUuidsForMeeting(meetingId: string): Promise<string[]> {
  const rows = await db
    .select({ uuid: sessions.uuid })
    .from(sessions)
    .where(and(eq(sessions.meetingId, meetingId), eq(sessions.role, 'host')));
  return rows.map((r) => r.uuid);
}
