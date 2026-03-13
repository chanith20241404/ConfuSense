import { Router } from 'express';
import { z } from 'zod';
import { insertConfusionEvent, getHostUuidsForMeeting, insertNotification, hasUnreadNotification } from '../../db/queries.js';

export const confusionRouter = Router();

const confirmSchema = z.object({
  meetingId: z.string().min(1),
  studentName: z.string().nullable().optional(),
  timestamp: z.number().optional(),
});

confusionRouter.post('/:uuid', async (req, res) => {
  const { uuid } = req.params;
  const parsed = confirmSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { meetingId, studentName, timestamp } = parsed.data;
  const ts = timestamp ?? Date.now();

  await insertConfusionEvent(uuid, meetingId, ts);
  console.log(`[Confusion] CONFIRMED by ${studentName || uuid.slice(0, 8)} (${uuid.slice(0, 8)}…) in meeting ${meetingId}`);

  const hostUuids = await getHostUuidsForMeeting(meetingId);
  for (const hostUuid of hostUuids) {
    const hasUnread = await hasUnreadNotification(hostUuid, 'confusion_confirmed');
    if (!hasUnread) {
      await insertNotification(hostUuid, 'confusion_confirmed', {
        studentUuid: uuid,
        studentName: studentName ?? 'Unknown',
        timestamp: ts,
      });
      console.log(`[Confusion] Notification sent to host ${hostUuid.slice(0, 8)}…`);
    }
  }

  res.status(200).json({ ok: true });
});
