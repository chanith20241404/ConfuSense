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
