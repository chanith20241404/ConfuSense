import { Router } from 'express';
import { getMeetingAnalytics } from '../../db/queries.js';

export const analyticsRouter = Router();

analyticsRouter.get('/:meetingId', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const analytics = await getMeetingAnalytics(meetingId);
    console.log(`[Analytics] Fetched for meeting ${meetingId}: tutor=${analytics.tutorName}, ${analytics.students.length} student(s), duration=${Math.round(analytics.durationMs / 60000)}min`);
    res.json(analytics);
  } catch (err) {
    console.error('[Analytics] Failed to fetch analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

analyticsRouter.get('/:meetingId/csv', async (req, res) => {
  try {
    const { meetingId } = req.params;
    const data = await getMeetingAnalytics(meetingId);
    console.log(`[Analytics] CSV export for meeting ${meetingId}: ${data.students.length} student(s)`);

    const lines: string[] = [];
    lines.push('ConfuSense Session Analytics');
    lines.push(`Meeting ID,${data.meetingId}`);
    lines.push(`Tutor,${data.tutorName}`);
    lines.push(`Duration (min),${Math.round(data.durationMs / 60000)}`);
    lines.push('');

    for (const student of data.students) {
      lines.push(`Student: ${student.name ?? student.uuid}`);
      lines.push(`Overall Confusion: ${student.confusionPct}%`);
      lines.push(`Interventions: ${student.interventionCount}`);
      lines.push('Confusion Detected,Duration(s),Intervened,Intervention Started,Intervention Stopped');
      for (const e of student.confusionEvents) {
        const detected = new Date(e.timestamp).toISOString();
        const dur = Math.round(e.durationMs / 1000);
        const intervened = e.intervened ? 'Yes' : 'No';
        const interventionStarted = e.intervenedAt
          ? new Date(e.intervenedAt).toISOString()
          : '';
        const interventionStopped = e.stoppedAt
          ? new Date(e.stoppedAt).toISOString()
          : '';
        lines.push(`${detected},${dur},${intervened},${interventionStarted},${interventionStopped}`);
      }
      lines.push('');
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=confusense_${meetingId}.csv`);
    res.send(lines.join('\n'));
  } catch (err) {
    console.error('[Analytics] CSV export failed:', err);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});
