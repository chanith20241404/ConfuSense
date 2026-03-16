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
