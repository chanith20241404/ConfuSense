import { Router } from 'express';
import { z } from 'zod';
import { upsertSession, updateDetectionStatus, getHostUuidsForMeeting, insertNotification, getStudentName } from '../../db/queries.js';

export const sessionsRouter = Router();

const joinSchema = z.object({
  uuid: z.string().uuid(),
  role: z.enum(['student', 'host']),
  meetingId: z.string().min(1),
  name: z.string().optional(),
  detectionOn: z.boolean().optional(),
});

sessionsRouter.post('/join', async (req, res) => {
  const parsed = joinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { uuid, role, meetingId, name, detectionOn } = parsed.data;
  await upsertSession({ uuid, meetingId, role, name, detectionOn, joinedAt: Date.now() });
  console.log(`[Session] ${role.toUpperCase()} joined: ${name || 'unnamed'} (${uuid.slice(0, 8)}…) → meeting ${meetingId}`);
  res.status(200).json({ ok: true });
});

const detectionSchema = z.object({
  uuid: z.string().min(1),
  meetingId: z.string().min(1),
  detectionOn: z.boolean(),
});

sessionsRouter.post('/detection', async (req, res) => {
  const parsed = detectionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { uuid, meetingId, detectionOn } = parsed.data;
  await updateDetectionStatus(uuid, meetingId, detectionOn);

  const studentName = await getStudentName(uuid, meetingId);
  const hostUuids = await getHostUuidsForMeeting(meetingId);
  for (const hostUuid of hostUuids) {
    await insertNotification(hostUuid, 'detection_status', {
      studentUuid: uuid,
      studentName: studentName || uuid.slice(0, 8),
      enabled: detectionOn,
    });
  }

  console.log(`[Session] Detection ${detectionOn ? 'ON' : 'OFF'} for ${uuid.slice(0, 8)}… in meeting ${meetingId} — ${hostUuids.length} host(s) notified`);
  res.status(200).json({ ok: true });
});
