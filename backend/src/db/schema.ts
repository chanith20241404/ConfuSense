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
