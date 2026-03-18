import useReveal from '../useReveal';

const features = [
  {
    icon: '\uD83E\uDDE0',
    title: 'Gemini-Powered Detection',
    desc: 'Webcam frames are analyzed by Google Gemini 2.5 Flash Lite using FACS-based facial action coding. Batches of 20 frames provide temporal analysis for sustained confusion detection.',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
  },
  {
    icon: '\uD83D\uDCCA',
    title: 'Live Tutor Dashboard',
    desc: "A real-time overlay inside Google Meet shows each student's confusion state. The dashboard auto-updates and lets tutors intervene with a single click.",
    gradient: 'linear-gradient(135deg, #764ba2, #a78bfa)',
  },
  {
    icon: '\uD83C\uDFAF',
    title: 'One-Click Intervention',
    desc: 'When a student confirms confusion, the tutor sees an alert and can intervene immediately. Detection pauses during intervention and resumes when the tutor clicks Stop.',
    gradient: 'linear-gradient(135deg, #667eea, #60a5fa)',
  },
  {
    icon: '\uD83D\uDCC4',
    title: 'PDF & CSV Reports',
    desc: 'At any point during or after a session, tutors can export a styled PDF report and raw CSV with per-student confusion times, intervention counts, and class averages.',
    gradient: 'linear-gradient(135deg, #a78bfa, #764ba2)',
  },
  {
    icon: '\uD83D\uDD14',
    title: 'Smart Confirmation Popups',
    desc: 'When Gemini detects confusion, the student sees a non-intrusive popup asking "Are you confused?" Only confirmed confusion triggers a tutor alert, reducing false positives.',
    gradient: 'linear-gradient(135deg, #667eea, #818cf8)',
  },
  {
    icon: '\uD83D\uDD0C',
    title: 'Zero-Setup Chrome Extension',
    desc: 'Install the extension, join a Google Meet call, and it works automatically. No sign-ups, no configuration. Host detection, participant scanning, and role assignment happen in the background.',
    gradient: 'linear-gradient(135deg, #764ba2, #667eea)',
  },
];

export default function Features() {
  const [ref, visible] = useReveal();

  return (
    <section id="features" ref={ref} style={{
      padding: '120px 0', background: '#0a0a1a', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 800, height: 800, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(102,126,234,0.06) 0%, transparent 60%)',
        filter: 'blur(40px)',
      }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
        <div style={{
          textAlign: 'center', marginBottom: 72,
          opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)',
          transition: 'all 0.7s ease',
        }}>
          <span style={badgeStyle}>Core Features</span>
          <h2 style={{ fontSize: 44, color: '#fff', marginBottom: 16, fontWeight: 800, letterSpacing: '-0.02em' }}>
            Everything tutors need,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #667eea, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>built in</span>
          </h2>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', maxWidth: 600, margin: '0 auto' }}>
            From real-time AI detection to exportable analytics, ConfuSense handles the full engagement loop inside Google Meet.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }} className="features-grid">
          {features.map((f, i) => (
            <div key={i} style={{
              padding: 36, borderRadius: 20,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(30px)',
              transitionDelay: `${i * 0.1}s`,
              position: 'relative', overflow: 'hidden',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(102,126,234,0.25)';
                e.currentTarget.style.background = 'rgba(102,126,234,0.04)';
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2), 0 0 30px rgba(102,126,234,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: f.gradient, opacity: 0.6,
              }} />
              <div style={{
                width: 56, height: 56, borderRadius: 14, marginBottom: 20,
                background: 'rgba(102,126,234,0.08)',
                border: '1px solid rgba(102,126,234,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28,
              }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, color: '#fff', marginBottom: 12, fontWeight: 700 }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .features-grid { grid-template-columns: 1fr !important; } }
        @media (min-width: 601px) and (max-width: 900px) { .features-grid { grid-template-columns: repeat(2, 1fr) !important; } }
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
