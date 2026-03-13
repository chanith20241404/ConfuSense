import { Router } from 'express';
import { z } from 'zod';
import { publishFrame, publishBatchFrame } from '../../queue/publisher.js';

export const framesRouter = Router();

const frameSchema = z.object({
  uuid: z.string().uuid(),
  meetingId: z.string().min(1),
  frame: z.string().min(1), // base64 JPEG
});

const batchFrameSchema = z.object({
  uuid: z.string().uuid(),
  meetingId: z.string().min(1),
  frames: z.array(z.string().min(1)).min(1).max(20),
});

framesRouter.post('/', async (req, res) => {
  const parsed = frameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { uuid, meetingId, frame } = parsed.data;
  await publishFrame({ uuid, meetingId, frame, timestamp: Date.now() });
  res.status(202).json({ ok: true });
});

framesRouter.post('/batch', async (req, res) => {
  const parsed = batchFrameSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { uuid, meetingId, frames } = parsed.data;
  await publishBatchFrame({ uuid, meetingId, frames, timestamp: Date.now() });
  res.status(202).json({ ok: true });
});
