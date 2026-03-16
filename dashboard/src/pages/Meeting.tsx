import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchMeeting, fetchAnalytics, interveneStudent, stopIntervention, type StudentEngagement } from '../lib/api';
import StudentRow from '../components/StudentRow';

export default function Meeting() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [students, setStudents] = useState<StudentEngagement[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) return;
    let mounted = true;

    async function load() {
      try {
        const data = await fetchMeeting(meetingId!);
        if (mounted) setStudents(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load');
      }
    }

    load();
    const id = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(id); };
  }, [meetingId]);

  const handleIntervene = useCallback(async (studentUuid: string) => {
    if (!meetingId) return;
    const hostUuid = '00000000-0000-0000-0000-000000000000';
    try {
      await interveneStudent(hostUuid, studentUuid, meetingId);
    } catch (err) {
      console.error('Intervene failed:', err);
    }
  }, [meetingId]);

  const handleStopIntervention = useCallback(async (studentUuid: string) => {
    if (!meetingId) return;
    const hostUuid = '00000000-0000-0000-0000-000000000000';
    try {
      await stopIntervention(hostUuid, studentUuid, meetingId);
    } catch (err) {
      console.error('Stop intervention failed:', err);
    }
  }, [meetingId]);

  const handleDownloadPdf = useCallback(async () => {
    if (!meetingId) return;
    try {
      const analytics = await fetchAnalytics(meetingId);

      // Build CSV content for download
      const lines: string[] = [];
      lines.push('ConfuSense Session Analytics');
      lines.push(`Meeting ID,${analytics.meetingId}`);
      lines.push(`Tutor,${analytics.tutorName}`);
      lines.push(`Duration (min),${Math.round(analytics.durationMs / 60000)}`);
      lines.push(`Start Time,${new Date(analytics.startTime).toLocaleString()}`);
      lines.push('');
      lines.push('Student,Confusion %,Interventions,Avg Engagement,Frames Scored,Detection');

      for (const s of analytics.students) {
        const name = s.name || s.uuid.slice(0, 8);
        const avgScore = s.scores.length > 0
          ? Math.round((s.scores.reduce((a, sc) => a + sc.score, 0) / s.scores.length) * 100)
          : 0;
        const detection = s.detectionEnabled !== false ? 'On' : 'Off';
        lines.push(`${name},${s.confusionPct}%,${s.interventionCount},${avgScore}%,${s.scores.length},${detection}`);
      }

      lines.push('');
      lines.push('--- Confusion Events ---');
      lines.push('Student,Timestamp,Duration (s),Intervened');
      for (const s of analytics.students) {
        const name = s.name || s.uuid.slice(0, 8);
        for (const e of s.confusionEvents) {
          const ts = new Date(e.timestamp).toLocaleString();
          const dur = Math.round(e.durationMs / 1000);
          lines.push(`${name},${ts},${dur},${e.intervened ? 'Yes' : 'No'}`);
        }
      }

      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `confusense_${meetingId}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Download failed:', err);
    }
  }, [meetingId]);

  const handleDownloadPdfReport = useCallback(async () => {
    if (!meetingId) return;
    try {
      const analytics = await fetchAnalytics(meetingId);

      // Generate a printable HTML report and trigger print-to-PDF
      const durationMins = Math.round(analytics.durationMs / 60000);
      const startTime = new Date(analytics.startTime).toLocaleString();

      let studentRows = '';
      for (const s of analytics.students) {
        const name = s.name || s.uuid.slice(0, 8);
        const avgScore = s.scores.length > 0
          ? Math.round((s.scores.reduce((a, sc) => a + sc.score, 0) / s.scores.length) * 100)
          : 0;
        const confColor = s.confusionPct >= 30 ? '#f87171' : s.confusionPct >= 15 ? '#facc15' : '#4ade80';
        const engColor = avgScore >= 70 ? '#4ade80' : avgScore >= 50 ? '#facc15' : '#f87171';

        let eventsHtml = '';
        for (const e of s.confusionEvents) {
          const ts = new Date(e.timestamp).toLocaleString();
          const dur = Math.round(e.durationMs / 1000);
          eventsHtml += `<tr><td style="padding:4px 8px;border:1px solid #333">${ts}</td><td style="padding:4px 8px;border:1px solid #333">${dur}s</td><td style="padding:4px 8px;border:1px solid #333">${e.intervened ? 'Yes' : 'No'}</td></tr>`;
        }

        studentRows += `
          <div style="margin-bottom:24px;page-break-inside:avoid">
            <h3 style="margin:0 0 8px;font-size:16px">${name}</h3>
            <div style="display:flex;gap:16px;margin-bottom:8px">
              <span>Confusion: <b style="color:${confColor}">${s.confusionPct}%</b></span>
              <span>Avg Engagement: <b style="color:${engColor}">${avgScore}%</b></span>
              <span>Interventions: <b>${s.interventionCount}</b></span>
              <span>Frames: <b>${s.scores.length}</b></span>
            </div>
            ${s.confusionEvents.length > 0 ? `
              <table style="width:100%;border-collapse:collapse;font-size:12px">
                <thead><tr style="background:#1a1a2e"><th style="padding:4px 8px;border:1px solid #333;text-align:left">Time</th><th style="padding:4px 8px;border:1px solid #333;text-align:left">Duration</th><th style="padding:4px 8px;border:1px solid #333;text-align:left">Intervened</th></tr></thead>
                <tbody>${eventsHtml}</tbody>
              </table>
            ` : '<p style="color:#6b7280;font-size:12px">No confusion events</p>'}
          </div>
        `;
      }

      const html = `<!DOCTYPE html><html><head><title>ConfuSense Report - ${analytics.meetingId}</title>
        <style>body{font-family:system-ui,-apple-system,sans-serif;background:#0d0d1a;color:#e5e7eb;padding:40px;max-width:800px;margin:0 auto}h1{color:#fff}h2{color:#a78bfa;border-bottom:1px solid #2d2d44;padding-bottom:8px}table{font-size:13px}@media print{body{background:#fff;color:#111}h2{color:#6366f1}}</style>
      </head><body>
        <h1>ConfuSense Session Report</h1>
        <div style="margin-bottom:24px">
          <p><b>Meeting ID:</b> ${analytics.meetingId}</p>
          <p><b>Tutor:</b> ${analytics.tutorName}</p>
          <p><b>Start Time:</b> ${startTime}</p>
          <p><b>Duration:</b> ${durationMins} minutes</p>
          <p><b>Students:</b> ${analytics.students.length}</p>
        </div>
        <h2>Student Details</h2>
        ${studentRows}
        <script>window.onload=()=>window.print()</script>
      </body></html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  }, [meetingId]);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '48px 24px' }}>
      <Link to="/" style={{ color: '#6366f1', fontSize: '14px', display: 'inline-block', marginBottom: '24px' }}>
        ← Back to meetings
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px', fontFamily: 'monospace' }}>
            {meetingId}
          </h1>
          <p style={{ color: '#9ca3af', margin: 0 }}>
            {students.length} student{students.length !== 1 ? 's' : ''} · auto-refreshes every 5s
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleDownloadPdf} style={btnStyle}>
            📊 CSV
          </button>
          <button onClick={handleDownloadPdfReport} style={{ ...btnStyle, background: '#6366f1' }}>
            📄 PDF Report
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#7f1d1d', color: '#f87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {students.length === 0 && !error ? (
        <div style={{ color: '#4b5563', textAlign: 'center', padding: '48px' }}>
          No students in this meeting
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1a1a2e', borderRadius: '10px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #2d2d44' }}>
              <th style={th}>Student</th>
              <th style={th}>Engagement</th>
              <th style={th}>History</th>
              <th style={{ ...th, textAlign: 'center' }}>Confusion %</th>
              <th style={{ ...th, textAlign: 'center' }}>Interventions</th>
              <th style={th}>Frames</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <StudentRow key={s.uuid} student={s} onIntervene={handleIntervene} onStopIntervention={handleStopIntervention} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid #2d2d44',
  background: '#1a1a2e',
  color: '#e5e7eb',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};
