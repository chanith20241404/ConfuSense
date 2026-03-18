import useReveal from '../useReveal';

const benefits = [
  {
    who: 'For Students',
    icon: '\uD83C\uDF93',
    gradient: 'linear-gradient(135deg, #667eea, #60a5fa)',
    items: [
      'Non-intrusive confirmation — only a small popup, never interrupts learning',
      'Get timely help when you actually need it, not after the session ends',
      'No account or sign-up required — privacy stays intact',
    ],
  },
  {
    who: 'For Tutors',
    icon: '\uD83D\uDC69\u200D\uD83C\uDFEB',
    gradient: 'linear-gradient(135deg, #764ba2, #a78bfa)',
    items: [
      'See who is confused in real time without asking the whole class',
      'One-click intervention with a built-in stop button to resume detection',
      'Export PDF and CSV reports for post-session review',
    ],
  },
  {
    who: 'For Institutions',
    icon: '\uD83C\uDFEB',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
    items: [
      'Data-driven insight into online lecture engagement',
      'Works inside Google Meet — no extra platform to manage',
      'Session history dashboard tracks trends across meetings',
    ],
  },
];

export default function Benefits() {
  const [ref, visible] = useReveal();

  return (
    <section id="benefits" ref={ref} style={{
      padding: '120px 0', background: '#0a0a1a', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -100, right: -100, width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(118,75,162,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
        <div style={{
          textAlign: 'center', marginBottom: 72,
          opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)',
          transition: 'all 0.7s ease',
        }}>
          <span style={badgeStyle}>Benefits</span>
          <h2 style={{ fontSize: 44, color: '#fff', marginBottom: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Built for{' '}
            <span style={{
              background: 'linear-gradient(135deg, #667eea, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>everyone</span> in the classroom
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 560, margin: '0 auto' }}>
            Students stay supported, tutors stay informed, and institutions get actionable data.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }} className="benefits-grid">
          {benefits.map((b, i) => (
            <div key={i} style={{
              padding: 36, borderRadius: 20,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(30px)',
              transitionDelay: `${i * 0.15}s`,
              position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(102,126,234,0.25)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: b.gradient, opacity: 0.6,
              }} />
              <div style={{
                width: 56, height: 56, borderRadius: 14, marginBottom: 20,
                background: 'rgba(102,126,234,0.08)',
                border: '1px solid rgba(102,126,234,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28,
              }}>{b.icon}</div>
              <h3 style={{ fontSize: 20, color: '#fff', marginBottom: 20, fontWeight: 700 }}>{b.who}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {b.items.map((item, j) => (
                  <li key={j} style={{
                    display: 'flex', gap: 12, marginBottom: 14,
                    fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7,
                  }}>
                    <span style={{
                      color: '#667eea', fontWeight: 700, flexShrink: 0,
                      textShadow: '0 0 8px rgba(102,126,234,0.4)',
                    }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .benefits-grid { grid-template-columns: 1fr !important; } }
        @media (min-width: 601px) and (max-width: 900px) { .benefits-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </section>
  );
}

const badgeStyle = {
  display: 'inline-block', padding: '8px 20px', marginBottom: 20,
  background: 'rgba(102,126,234,0.08)',
  border: '1px solid rgba(102,126,234,0.2)', borderRadius: 100,
  fontSize: 13, fontWeight: 600, color: '#667eea',
  letterSpacing: '0.04em', textTransform: 'uppercase',
};
