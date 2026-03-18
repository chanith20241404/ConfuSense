import type { CSSProperties } from 'react';
import type { StudentEngagement } from '../lib/api';
import EngagementBadge from './EngagementBadge';

interface Props {
  student: StudentEngagement;
  onIntervene?: (uuid: string) => void;
  onStopIntervention?: (uuid: string) => void;
}

export default function StudentRow({ student, onIntervene, onStopIntervention }: Props) {
  const displayName = student.name || student.uuid.slice(0, 8) + '…';
  const recentScores = student.scores.slice(-10);
  const isConfused = student.latestScore !== null && student.latestScore < 0.5;
  const detectionOff = student.detectionEnabled === false;
  const interventionActive = student.interventionActive;

  return (
    <tr style={interventionActive ? { background: 'rgba(99, 102, 241, 0.08)' } : isConfused ? { background: 'rgba(239, 68, 68, 0.08)' } : detectionOff ? { opacity: 0.6 } : undefined}>
      <td style={td}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: detectionOff ? '#ef4444' : interventionActive ? '#6366f1' : '#4ade80',
            boxShadow: detectionOff ? 'none' : interventionActive ? '0 0 6px rgba(99, 102, 241, 0.6)' : '0 0 6px rgba(74, 222, 128, 0.6)',
            flexShrink: 0,
          }} />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>{displayName}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              {student.uuid.slice(0, 8)}…
              {detectionOff && <span style={{ color: '#ef4444' }}> · Detection Off</span>}
              {interventionActive && <span style={{ color: '#6366f1' }}> · Intervening</span>}
            </div>
          </div>
        </div>
      </td>
      <td style={td}><EngagementBadge score={student.latestScore} /></td>
      <td style={td}>
        <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '28px' }}>
          {recentScores.map((s, i) => (
            <div
              key={i}
              title={`${Math.round(s.score * 100)}%`}
              style={{
                width: '6px',
                height: `${Math.max(4, s.score * 28)}px`,
                borderRadius: '2px',
                background:
                  s.score >= 0.7 ? '#4ade80' : s.score >= 0.5 ? '#facc15' : '#f87171',
              }}
            />
          ))}
        </div>
      </td>
      <td style={{ ...td, textAlign: 'center' }}>
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '9999px',
          fontSize: '12px',
          fontWeight: 600,
          background: student.confusionPct >= 30 ? '#7f1d1d' : student.confusionPct >= 15 ? '#713f12' : '#14532d',
          color: student.confusionPct >= 30 ? '#f87171' : student.confusionPct >= 15 ? '#facc15' : '#4ade80',
        }}>
          {student.confusionPct}%
        </span>
      </td>
      <td style={{ ...td, textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
        {student.interventionCount}
      </td>
      <td style={{ ...td, color: '#6b7280', fontSize: '13px' }}>{student.scores.length}</td>
      <td style={td}>
        {interventionActive && onStopIntervention ? (
          <button
            onClick={() => onStopIntervention(student.uuid)}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: '#ef4444',
              color: '#fff',
            }}
          >
            Stop
          </button>
        ) : onIntervene ? (
          <button
            onClick={() => onIntervene(student.uuid)}
            disabled={!isConfused}
            style={{
              padding: '4px 12px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '12px',
              fontWeight: 600,
              cursor: isConfused ? 'pointer' : 'default',
              background: isConfused ? '#6366f1' : '#374151',
              color: isConfused ? '#fff' : '#6b7280',
              opacity: isConfused ? 1 : 0.5,
            }}
          >
            Intervene
          </button>
        ) : null}
      </td>
    </tr>
  );
}

const td: CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #1f2937',
  verticalAlign: 'middle',
};
