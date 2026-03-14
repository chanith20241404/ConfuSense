import { Router } from 'express';
import { z } from 'zod';
import { insertIntervention, insertNotification, stopIntervention } from '../../db/queries.js';

export const interveneRouter = Router();

const interveneSchema = z.object({
  studentUuid: z.string().uuid(),
  meetingId: z.string().min(1),
  hostName: z.string().nullable().optional(),
  studentName: z.string().nullable().optional(),
});

interveneRouter.post('/:hostUuid', async (req, res) => {
  const { hostUuid } = req.params;
  const parsed = interveneSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { studentUuid, meetingId, hostName, studentName } = parsed.data;
  const timestamp = Date.now();

  await insertIntervention(hostUuid, studentUuid, meetingId, timestamp);
  console.log(`[Intervene] ${hostName || hostUuid.slice(0, 8)} intervened on ${studentName || studentUuid.slice(0, 8)} in meeting ${meetingId}`);

  await insertNotification(studentUuid, 'intervention', {
    studentUuid,
    studentName: studentName ?? 'Unknown',
    hostName: hostName ?? 'Tutor',
    timestamp,
  });
  console.log(`[Intervene] Notification sent to student ${studentName || studentUuid.slice(0, 8)} (${studentUuid.slice(0, 8)}…) — cooldown starts`);

  res.status(200).json({ ok: true });
});

const stopSchema = z.object({
  studentUuid: z.string().uuid(),
  meetingId: z.string().min(1),
  hostName: z.string().nullable().optional(),
  studentName: z.string().nullable().optional(),
});

interveneRouter.post('/:hostUuid/stop', async (req, res) => {
  const { hostUuid } = req.params;
  const parsed = stopSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { studentUuid, meetingId, hostName, studentName } = parsed.data;
  const timestamp = Date.now();

  await stopIntervention(studentUuid, meetingId, timestamp);
  console.log(`[Intervene] ${hostName || hostUuid.slice(0, 8)} STOPPED intervention on ${studentName || studentUuid.slice(0, 8)} in meeting ${meetingId}`);

  await insertNotification(studentUuid, 'intervention_stopped', {
    studentUuid,
    studentName: studentName ?? 'Unknown',
    hostName: hostName ?? 'Tutor',
    timestamp,
  });
  console.log(`[Intervene] Stop notification sent to student ${studentName || studentUuid.slice(0, 8)} (${studentUuid.slice(0, 8)}…) — detection resumes`);

  res.status(200).json({ ok: true });
});
