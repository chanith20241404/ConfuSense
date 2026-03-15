import { useNavigate } from 'react-router-dom';
import type { MeetingSummary } from '../lib/api';
import EngagementBadge from './EngagementBadge';

interface Props {
  meeting: MeetingSummary;
}

export default function MeetingCard({ meeting }: Props) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/meeting/${meeting.meetingId}`)}
      style={{
        background: '#1a1a2e',
        border: '1px solid #2d2d44',
        borderRadius: '10px',
        padding: '20px 24px',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
      onMouseEnter={(e) => ((e.currentTarget.style.borderColor = '#6366f1'))}
      onMouseLeave={(e) => ((e.currentTarget.style.borderColor = '#2d2d44'))}
    >
      <div>
        <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
          {meeting.meetingId}
        </div>
        <div style={{ fontSize: '13px', color: '#9ca3af' }}>
          {meeting.studentCount} student{meeting.studentCount !== 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <EngagementBadge score={meeting.avgScore} />
        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
          avg engagement
        </div>
      </div>
    </div>
  );
}
