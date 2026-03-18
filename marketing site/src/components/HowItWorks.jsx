import useReveal from '../useReveal';

const steps = [
  {
    num: '01',
    title: 'Install the Extension',
    desc: 'Add ConfuSense to Chrome. A unique ID is generated on install. No account needed.',
    color: '#667eea',
  },
  {
    num: '02',
    title: 'Join a Google Meet',
    desc: "The extension activates automatically. It detects whether you're a host (tutor) or participant (student).",
    color: '#818cf8',
  },
  {
    num: '03',
    title: 'AI Analyses in Real-Time',
    desc: 'Student webcam frames are captured at 1 FPS, batched every 5 seconds, and scored by Gemini for confusion and engagement.',
    color: '#a78bfa',
  },
  {
    num: '04',
    title: 'Tutor Sees & Acts',
    desc: "The tutor's live dashboard shows who's confused. One click to intervene, one click to stop. Session reports export as PDF or CSV.",
    color: '#764ba2',
  },
];

export default function HowItWorks() {
  const [ref, visible] = useReveal();

  return (
    <section id="how-it-works" ref={ref} style={{
      padding: '120px 0', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #0e0e24 50%, #0a0a1a 100%)',
    }}>
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.02,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
        <div style={{
          textAlign: 'center', marginBottom: 80,
          opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)',
          transition: 'all 0.7s ease',
        }}>
          <span style={badgeStyle}>How It Works</span>
          <h2 style={{ fontSize: 44, color: '#fff', marginBottom: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Four steps to{' '}
            <span style={{
              background: 'linear-gradient(135deg, #667eea, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>better engagement</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 550, margin: '0 auto' }}>
            From install to insight in under a minute. No complex setup required.
          </p>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28, position: 'relative',
        }} className="steps-grid">
          <div style={{
            position: 'absolute', top: 52, left: '12%', right: '12%', height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(102,126,234,0.3), rgba(167,139,250,0.3), transparent)',
          }} className="steps-line" />

          {steps.map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', position: 'relative', zIndex: 1,
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(30px)',
              transition: 'all 0.7s ease',
              transitionDelay: `${i * 0.15}s`,
            }}>
              <div style={{
                width: 88, height: 88, margin: '0 auto 24px',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `radial-gradient(circle, ${s.color}15, transparent)`,
                border: `2px solid ${s.color}30`,
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', inset: -4, borderRadius: '50%',
                  background: `conic-gradient(from ${i * 90}deg, ${s.color}20, transparent, ${s.color}10)`,
                  animation: 'rotate-slow 8s linear infinite',
                }} />
                <span style={{
                  fontSize: 24, fontWeight: 900,
                  background: `linear-gradient(135deg, ${s.color}, #a78bfa)`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  position: 'relative', zIndex: 1,
                }}>{s.num}</span>
              </div>
              <h3 style={{ fontSize: 17, color: '#fff', marginBottom: 10, fontWeight: 700 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .steps-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 48px !important; }
          .steps-line { display: none !important; }
        }
        @media (max-width: 600px) {
          .steps-grid { grid-template-columns: 1fr !important; }
        }
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
