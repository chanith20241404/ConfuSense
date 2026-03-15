import { useState, useEffect } from 'react';
import { fetchMeetings, type MeetingSummary } from '../lib/api';
import MeetingCard from '../components/MeetingCard';

export default function Home() {
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const data = await fetchMeetings();
        if (mounted) setMeetings(data);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load');
      }
    }

    load();
    const id = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>ConfuSense</h1>
      <p style={{ color: '#9ca3af', marginBottom: '32px' }}>Active meetings (last 2 hours)</p>

      {error && (
        <div style={{ background: '#7f1d1d', color: '#f87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {meetings.length === 0 && !error && (
        <div style={{ color: '#4b5563', textAlign: 'center', padding: '48px' }}>
          No active meetings
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {meetings.map((m) => <MeetingCard key={m.meetingId} meeting={m} />)}
      </div>
    </div>
  );
}
