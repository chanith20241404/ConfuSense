import type { CSSProperties } from 'react';

interface Props {
  score: number | null;
}

export default function EngagementBadge({ score }: Props) {
  if (score === null) {
    return <span style={styles({ bg: '#374151', color: '#9ca3af' })}>No data</span>;
  }

  const pct = Math.round(score * 100);
  const config =
    score >= 0.7
      ? { bg: '#14532d', color: '#4ade80', label: `${pct}%` }
      : score >= 0.5
        ? { bg: '#713f12', color: '#facc15', label: `${pct}%` }
        : { bg: '#7f1d1d', color: '#f87171', label: `${pct}%` };

  return <span style={styles(config)}>{config.label}</span>;
}

function styles({ bg, color }: { bg: string; color: string }) {
  return {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 600,
    background: bg,
    color,
  } as CSSProperties;
}
