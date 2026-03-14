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
      throw err;
    }
  });

  // Create durable consumer for batch messages
  await jsm.consumers.add('FRAMES', {
    durable_name: 'frames-batch-processor',
    ack_policy: AckPolicy.Explicit,
    max_deliver: 3,
    ack_wait: 60 * 1_000_000_000, // 60s — batch Gemini calls take longer
    filter_subject: 'frames.batch',
  }).catch((err: unknown) => {
    const errMsg = String(err);
    if (!errMsg.includes('consumer name already in use')) throw err;
  });

  const consumer = await js.consumers.get('FRAMES', 'frames-batch-processor');
  const messages = await consumer.consume();

  console.log('[Consumer] Listening for batch frames...');

  (async () => {
    for await (const msg of messages) {
      try {
        const data = JSON.parse(sc.decode(msg.data)) as BatchFrameMessage;
        const { uuid, meetingId, frames, timestamp } = data;

        console.log(
          `[Consumer] ${uuid.slice(0, 8)}… — received batch of ${frames.length} frames`,
        );

        let result;
        try {
          result = await scoreBatchConfusion(frames);
        } catch (err) {
          console.error('[Consumer] Gemini batch scoring failed after retries, NACKing:', err);
          msg.nak();
          continue;
        }

        const { confusionScore, engagementScore } = result;

        // Store the engagement score
        await insertEngagementScore({ uuid, meetingId, score: engagementScore, scoredAt: timestamp });

        const lastNotify = lastNotifyAt.get(uuid) ?? 0;
        const cooldownElapsed = Date.now() - lastNotify > NOTIFY_COOLDOWN_MS;

        console.log(
          `[Consumer] ${uuid.slice(0, 8)}… → batch confusion: ${confusionScore.toFixed(2)}, engagement: ${engagementScore.toFixed(2)} | threshold: ${CONFUSION_THRESHOLD} | cooldown: ${cooldownElapsed ? 'ready' : 'waiting'}`,
        );

        if (confusionScore >= CONFUSION_THRESHOLD && cooldownElapsed) {
          lastNotifyAt.set(uuid, Date.now());

          const studentName = await getStudentName(uuid, meetingId);

          // Only notify the student — tutor is notified later when the student
          // confirms confusion via POST /api/confusion/:uuid
          const studentHasUnread = await hasUnreadNotification(uuid, 'low_engagement');
          if (!studentHasUnread) {
            await insertNotification(uuid, 'low_engagement', { score: confusionScore });
            console.log(
              `[Consumer] BATCH confusion ${confusionScore.toFixed(2)} → popup sent to ${studentName || uuid.slice(0, 8)}`,
            );
          }
        }

        msg.ack();
      } catch (err) {
        console.error('[Consumer] Error processing batch message:', err);
        msg.nak();
      }
    }
  })().catch((err: unknown) => {
    console.error('[Consumer] Fatal error:', err);
  });

  return nc;
}
