import { Router } from 'express';
import { getActiveMeetings, getStudentEngagement } from '../../db/queries.js';

export const dashboardRouter = Router();

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

dashboardRouter.get('/', async (_req, res) => {
  try {
    const since = Date.now() - TWO_HOURS_MS;
    const meetings = await getActiveMeetings(since);
    console.log(`[Dashboard] Active meetings: ${meetings.length} (${meetings.map(m => m.meetingId).join(', ') || 'none'})`);
    res.json({ meetings });
  } catch (err) {
    console.error('[Dashboard] Failed to fetch meetings:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

dashboardRouter.get('/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const students = await getStudentEngagement(meetingId);
    console.log(`[Dashboard] Meeting ${meetingId}: ${students.length} student(s) — ${students.map(s => `${s.name || s.uuid.slice(0, 8)} (score: ${s.latestScore ?? 'N/A'}, confusion: ${s.confusionPct}%)`).join(', ') || 'none'}`);
    res.json({ students });
  } catch (err) {
    console.error('[Dashboard] Failed to fetch meeting data:', err);
    res.status(500).json({ error: 'Failed to fetch meeting data' });
  }
});
