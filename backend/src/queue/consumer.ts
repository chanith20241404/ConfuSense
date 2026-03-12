import { connect, StringCodec, AckPolicy, type NatsConnection } from 'nats';
import { config } from '../config.js';
import { scoreBatchConfusion } from '../gemini/client.js';
import {
  insertEngagementScore,
  hasUnreadNotification,
  insertNotification,
  getStudentName,
} from '../db/queries.js';
import type { BatchFrameMessage } from '../types/index.js';

const sc = StringCodec();

// ── Batch confusion detection ───────────────────────────────────────────────
// The extension captures 10 frames (1/sec) and sends them as a batch.
// Gemini analyses the full sequence in one call and returns a single score.

const CONFUSION_THRESHOLD = 0.4;   // Batch confusion score threshold to trigger
const NOTIFY_COOLDOWN_MS = 60_000;  // 1 minute between notifications per student

const lastNotifyAt = new Map<string, number>();

// ── Consumer ────────────────────────────────────────────────────────────────

export async function startConsumer(): Promise<NatsConnection> {
  const nc = await connect({ servers: config.NATS_URL });
  const js = nc.jetstream();
  const jsm = await nc.jetstreamManager();

  // Ensure stream exists with both subjects
  await jsm.streams.add({
    name: 'FRAMES',
    subjects: ['frames.process', 'frames.batch'],
  }).catch(async (err: unknown) => {
    const errMsg = String(err);
    if (errMsg.includes('stream name already in use')) {
      await jsm.streams.update('FRAMES', {
        subjects: ['frames.process', 'frames.batch'],
      });
    } else {
