import { Router } from 'express';
import { z } from 'zod';
import { scoreBatchConfusion } from '../../gemini/client.js';
import {
  insertEngagementScore,
  hasUnreadNotification,
  insertNotification,
  getStudentName,
} from '../../db/queries.js';

export const framesRouter = Router();

const CONFUSION_THRESHOLD = 0.4;
const NOTIFY_COOLDOWN_MS = 60_000;
const lastNotifyAt = new Map<string, number>();

const batchFrameSchema = z.object({
  uuid: z.string().uuid(),
  meetingId: z.string().min(1),
  frames: z.array(z.string().min(1)).min(1).max(20),
});

framesRouter.post('/batch', async (req, res) => {
  const parsed = batchFrameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { uuid, meetingId, frames } = parsed.data;
  res.status(202).json({ ok: true });

  // Process asynchronously after responding
  (async () => {
    try {
      const result = await scoreBatchConfusion(frames);
      const { confusionScore, engagementScore } = result;

      await insertEngagementScore({ uuid, meetingId, score: engagementScore, scoredAt: Date.now() });

      const lastNotify = lastNotifyAt.get(uuid) ?? 0;
      const cooldownElapsed = Date.now() - lastNotify > NOTIFY_COOLDOWN_MS;

      console.log(
        `[Frames] ${uuid.slice(0, 8)}… → confusion: ${confusionScore.toFixed(2)}, engagement: ${engagementScore.toFixed(2)}`,
      );

      if (confusionScore >= CONFUSION_THRESHOLD && cooldownElapsed) {
        lastNotifyAt.set(uuid, Date.now());
        const studentName = await getStudentName(uuid, meetingId);
        const studentHasUnread = await hasUnreadNotification(uuid, 'low_engagement');
        if (!studentHasUnread) {
          await insertNotification(uuid, 'low_engagement', { score: confusionScore });
          console.log(`[Frames] Confusion ${confusionScore.toFixed(2)} → popup sent to ${studentName || uuid.slice(0, 8)}`);
        }
      }
    } catch (err) {
      console.error('[Frames] Error processing batch:', err);
    }
  })();
});
