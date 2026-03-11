import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { createClient } from '@libsql/client';
import { config } from '../config.js';

// ── Table Definitions (used by Drizzle query builder) ─────────────────────────

export const sessions = sqliteTable(
  'sessions',
  {
    uuid:      text('uuid').notNull(),
    meetingId: text('meeting_id').notNull(),
    role:      text('role', { enum: ['student', 'host'] }).notNull(),
    name:        text('name'),
    detectionOn: integer('detection_on').default(1),
    joinedAt:    integer('joined_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.uuid, t.meetingId, t.role] })],
);

export const confusionEvents = sqliteTable('confusion_events', {
  id:                  integer('id').primaryKey({ autoIncrement: true }),
  uuid:                text('uuid').notNull(),
  meetingId:           text('meeting_id').notNull(),
  timestamp:           integer('timestamp').notNull(),
  durationMs:          integer('duration_ms').default(0),
  intervened:          integer('intervened').default(0),
  intervenedAt:        integer('intervened_at'),
  interventionStoppedAt: integer('intervention_stopped_at'),
});

export const interventions = sqliteTable('interventions', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  hostUuid:     text('host_uuid').notNull(),
  studentUuid:  text('student_uuid').notNull(),
  meetingId:    text('meeting_id').notNull(),
  timestamp:    integer('timestamp').notNull(),
});

export const engagementScores = sqliteTable('engagement_scores', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  uuid:      text('uuid').notNull(),
  meetingId: text('meeting_id').notNull(),
  score:     real('score').notNull(),
  scoredAt:  integer('scored_at').notNull(),
});

export const notifications = sqliteTable('notifications', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  uuid:      text('uuid').notNull(),
  type:      text('type').notNull(),
  payload:   text('payload').notNull(),
  createdAt: integer('created_at').notNull(),
  readAt:    integer('read_at'),
});

// ── Migration Runner ──────────────────────────────────────────────────────────

export async function runMigrations(): Promise<void> {
  // Use raw libsql client for DDL — drizzle-kit push requires interactive CLI.
  // CREATE TABLE IF NOT EXISTS is idempotent so this is safe to run on every boot.
  const client = createClient({ url: config.LIBSQL_URL });

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS sessions (
      uuid         TEXT    NOT NULL,
      meeting_id   TEXT    NOT NULL,
      role         TEXT    NOT NULL CHECK(role IN ('student', 'host')),
      name         TEXT,
      detection_on INTEGER DEFAULT 1,
      joined_at    INTEGER NOT NULL,
      PRIMARY KEY (uuid, meeting_id, role)
    );

    CREATE TABLE IF NOT EXISTS engagement_scores (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid       TEXT    NOT NULL,
      meeting_id TEXT    NOT NULL,
      score      REAL    NOT NULL,
      scored_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid       TEXT    NOT NULL,
      type       TEXT    NOT NULL,
      payload    TEXT    NOT NULL,
      created_at INTEGER NOT NULL,
      read_at    INTEGER
    );

    CREATE TABLE IF NOT EXISTS confusion_events (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid                    TEXT    NOT NULL,
      meeting_id              TEXT    NOT NULL,
      timestamp               INTEGER NOT NULL,
      duration_ms             INTEGER DEFAULT 0,
      intervened              INTEGER DEFAULT 0,
      intervened_at           INTEGER,
      intervention_stopped_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS interventions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      host_uuid    TEXT    NOT NULL,
      student_uuid TEXT    NOT NULL,
      meeting_id   TEXT    NOT NULL,
      timestamp    INTEGER NOT NULL
    );
  `);

  // Add columns if upgrading from older schema
  try {
    await client.execute('ALTER TABLE sessions ADD COLUMN name TEXT');
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await client.execute('ALTER TABLE sessions ADD COLUMN detection_on INTEGER DEFAULT 1');
  } catch {
    // Column already exists — safe to ignore
  }
  try {
    await client.execute('ALTER TABLE confusion_events ADD COLUMN intervention_stopped_at INTEGER');
  } catch {
    // Column already exists — safe to ignore
  }

  await client.close();
}
