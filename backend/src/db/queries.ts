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

export async function getStudentName(uuid: string, meetingId: string): Promise<string | null> {
  const rows = await db
    .select({ name: sessions.name })
    .from(sessions)
    .where(and(eq(sessions.uuid, uuid), eq(sessions.meetingId, meetingId)))
    .limit(1);
  return rows[0]?.name ?? null;
}

// ── Engagement Scores ─────────────────────────────────────────────────────────

export async function insertEngagementScore(score: Omit<EngagementScore, 'id'>): Promise<void> {
  await db.insert(engagementScores).values({
    uuid:      score.uuid,
    meetingId: score.meetingId,
    score:     score.score,
    scoredAt:  score.scoredAt,
  });
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function hasUnreadNotification(uuid: string, type: NotificationType): Promise<boolean> {
  const rows = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.uuid, uuid), eq(notifications.type, type), isNull(notifications.readAt)))
    .limit(1);
  return rows.length > 0;
}

export async function insertNotification(
  uuid: string,
  type: NotificationType,
  payload: NotificationPayload,
): Promise<void> {
  await db.insert(notifications).values({
    uuid,
    type,
    payload:   JSON.stringify(payload),
    createdAt: Date.now(),
  });
}

const STUDENT_NOTIFICATION_TYPES: NotificationType[] = ['low_engagement', 'intervention', 'intervention_stopped'];
const TUTOR_NOTIFICATION_TYPES: NotificationType[] = ['confusion_confirmed', 'student_disengaged', 'detection_status'];

export async function getAndMarkNotificationsRead(uuid: string, role?: 'student' | 'host'): Promise<Notification[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.uuid, uuid), isNull(notifications.readAt)))
    .orderBy(notifications.createdAt);

  if (rows.length === 0) return [];

  // Filter by role so student polling doesn't consume tutor notifications and vice versa
  const allowedTypes = role === 'student'
    ? STUDENT_NOTIFICATION_TYPES
    : role === 'host'
      ? TUTOR_NOTIFICATION_TYPES
      : null;

  const matched = allowedTypes
    ? rows.filter(r => allowedTypes.includes(r.type as NotificationType))
    : rows;

  if (matched.length === 0) return [];

  const ids = matched.map((r) => r.id);
  await db
    .update(notifications)
    .set({ readAt: Date.now() })
    .where(inArray(notifications.id, ids));

  return matched.map((r) => ({
    id:        r.id,
    uuid:      r.uuid,
    type:      r.type as NotificationType,
    payload:   JSON.parse(r.payload) as NotificationPayload,
    createdAt: r.createdAt,
    readAt:    null,
  }));
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getActiveMeetings(sinceMs: number): Promise<MeetingSummary[]> {
  const rows = await db
    .select({
      meetingId:    sessions.meetingId,
      studentCount: sql<number>`COUNT(DISTINCT CASE WHEN ${sessions.role} = 'student' THEN ${sessions.uuid} END)`,
      avgScore:     sql<number | null>`AVG(${engagementScores.score})`,
      lastUpdated:  sql<number | null>`MAX(${engagementScores.scoredAt})`,
    })
    .from(sessions)
    .leftJoin(
      engagementScores,
      and(
        eq(sessions.uuid, engagementScores.uuid),
        eq(sessions.meetingId, engagementScores.meetingId),
      ),
    )
    .where(gt(sessions.joinedAt, sinceMs))
    .groupBy(sessions.meetingId);

  return rows.map((r) => ({
    meetingId:    r.meetingId,
    studentCount: r.studentCount,
