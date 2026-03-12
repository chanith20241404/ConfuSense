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
    avgScore:     r.avgScore ?? null,
    lastUpdated:  r.lastUpdated ?? 0,
  }));
}

export async function getStudentEngagement(meetingId: string): Promise<StudentEngagement[]> {
  const studentRows = await db
    .select({ uuid: sessions.uuid, detectionOn: sessions.detectionOn })
    .from(sessions)
    .where(and(eq(sessions.meetingId, meetingId), eq(sessions.role, 'student')));

  const studentUuids = studentRows.map((r) => r.uuid);
  if (studentUuids.length === 0) return [];

  // Build detection status map
  const detectionMap = new Map<string, boolean>();
  for (const row of studentRows) {
    detectionMap.set(row.uuid, (row.detectionOn ?? 1) === 1);
  }

  const scoreRows = await db
    .select({
      uuid:     engagementScores.uuid,
      score:    engagementScores.score,
      scoredAt: engagementScores.scoredAt,
    })
    .from(engagementScores)
    .where(eq(engagementScores.meetingId, meetingId))
    .orderBy(engagementScores.scoredAt);

  const scoresByUuid = new Map<string, Array<{ score: number; scoredAt: number }>>();
  for (const row of scoreRows) {
    if (!scoresByUuid.has(row.uuid)) scoresByUuid.set(row.uuid, []);
    scoresByUuid.get(row.uuid)!.push({ score: row.score, scoredAt: row.scoredAt });
  }

  // Get student names
  const nameMap = new Map<string, string | null>();
  for (const row of studentRows) {
    nameMap.set(row.uuid, null);
  }
  const nameRows = await db
    .select({ uuid: sessions.uuid, name: sessions.name })
    .from(sessions)
    .where(eq(sessions.meetingId, meetingId));
  for (const row of nameRows) {
    if (row.name) nameMap.set(row.uuid, row.name);
  }

  // Get confusion events
  const confRows = await db
    .select()
    .from(confusionEvents)
    .where(eq(confusionEvents.meetingId, meetingId));

  const confByUuid = new Map<string, Array<{ timestamp: number; durationMs: number; intervened: boolean; stoppedAt: number | null }>>();
  for (const row of confRows) {
    if (!confByUuid.has(row.uuid)) confByUuid.set(row.uuid, []);
    confByUuid.get(row.uuid)!.push({
      timestamp: row.timestamp,
      durationMs: row.durationMs ?? 0,
      intervened: (row.intervened ?? 0) === 1,
      stoppedAt: row.interventionStoppedAt ?? null,
    });
  }

  // Get intervention counts
  const intRows = await db
    .select({ studentUuid: interventions.studentUuid })
    .from(interventions)
    .where(eq(interventions.meetingId, meetingId));

  const intCountByUuid = new Map<string, number>();
  for (const row of intRows) {
    intCountByUuid.set(row.studentUuid, (intCountByUuid.get(row.studentUuid) ?? 0) + 1);
  }

  // Get session start time for confusion % calc
  const sessionStartRows = await db
    .select({ joinedAt: sessions.joinedAt })
    .from(sessions)
    .where(eq(sessions.meetingId, meetingId))
    .limit(1);
  const sessionStartMs = sessionStartRows[0]?.joinedAt ?? Date.now();
  const sessionDurationMs = Math.max(Date.now() - sessionStartMs, 1);

  return studentUuids.map((uuid) => {
    const scores = scoresByUuid.get(uuid) ?? [];
    const latestScore = scores.length > 0 ? scores[scores.length - 1].score : null;
    const rawEvents = confByUuid.get(uuid) ?? [];
    const confusedMs = rawEvents.reduce((a, e) => a + (e.durationMs || 30000), 0);
    const confusionPct = Math.min(100, Math.round((confusedMs / sessionDurationMs) * 100));

    // Intervention is active if last confusion event is intervened but not yet stopped
    const lastEvent = rawEvents.length > 0 ? rawEvents[rawEvents.length - 1] : null;
    const interventionActive = lastEvent !== null && lastEvent.intervened && !lastEvent.stoppedAt;

    return {
      uuid,
      name: nameMap.get(uuid) ?? null,
      latestScore,
      scores,
      confusionEvents: rawEvents.map(e => ({
        timestamp: e.timestamp,
        durationMs: e.durationMs,
        intervened: e.intervened,
        intervenedAt: e.intervened ? e.timestamp + e.durationMs : null,
        stoppedAt: e.stoppedAt,
      })),
      interventionCount: intCountByUuid.get(uuid) ?? 0,
      confusionPct,
      detectionEnabled: detectionMap.get(uuid) ?? true,
      interventionActive,
    };
  });
}

// ── Confusion Events ─────────────────────────────────────────────────────────

export async function insertConfusionEvent(
  uuid: string, meetingId: string, timestamp: number,
): Promise<number> {
  const result = await db.insert(confusionEvents).values({
    uuid, meetingId, timestamp,
  }).returning({ id: confusionEvents.id });
  return result[0].id;
}

export async function getConfusionEvents(meetingId: string, uuid?: string) {
  const conditions = [eq(confusionEvents.meetingId, meetingId)];
  if (uuid) conditions.push(eq(confusionEvents.uuid, uuid));
  return db.select().from(confusionEvents).where(and(...conditions));
}

// ── Interventions ────────────────────────────────────────────────────────────

export async function insertIntervention(
  hostUuid: string, studentUuid: string, meetingId: string, timestamp: number,
): Promise<void> {
  await db.insert(interventions).values({ hostUuid, studentUuid, meetingId, timestamp });

  // Mark last confusion event for this student as intervened
  const events = await db
    .select()
    .from(confusionEvents)
    .where(and(
      eq(confusionEvents.uuid, studentUuid),
      eq(confusionEvents.meetingId, meetingId),
      eq(confusionEvents.intervened, 0),
    ));
  if (events.length > 0) {
    const last = events[events.length - 1];
    await db.update(confusionEvents)
      .set({
        intervened: 1,
        intervenedAt: timestamp,
        durationMs: Math.max(0, timestamp - last.timestamp),
      })
      .where(eq(confusionEvents.id, last.id));
  }
}

export async function stopIntervention(
  studentUuid: string, meetingId: string, timestamp: number,
): Promise<void> {
  // Find the last intervened confusion event that hasn't been stopped yet
  const events = await db
    .select()
    .from(confusionEvents)
    .where(and(
      eq(confusionEvents.uuid, studentUuid),
      eq(confusionEvents.meetingId, meetingId),
      eq(confusionEvents.intervened, 1),
      isNull(confusionEvents.interventionStoppedAt),
    ));
  if (events.length > 0) {
    const last = events[events.length - 1];
    // Duration = from when confusion was confirmed to when intervention stopped
    const duration = Math.max(0, timestamp - last.timestamp);
    await db.update(confusionEvents)
      .set({ durationMs: duration, interventionStoppedAt: timestamp })
      .where(eq(confusionEvents.id, last.id));
  }
}

// ── Analytics ────────────────────────────────────────────────────────────────

export async function getMeetingAnalytics(meetingId: string) {
  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.meetingId, meetingId));

  const host = sessionRows.find(r => r.role === 'host');
  const studentSessions = sessionRows.filter(r => r.role === 'student');
  const startTime = Math.min(...sessionRows.map(r => r.joinedAt));

  const students = await getStudentEngagement(meetingId);

  return {
    meetingId,
    tutorName: host?.name ?? 'Unknown',
    startTime,
    durationMs: Date.now() - startTime,
    students,
  };
}
