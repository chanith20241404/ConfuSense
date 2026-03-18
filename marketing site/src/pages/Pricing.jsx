import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const Check = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="#667eea" style={{ flexShrink: 0 }}>
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const freePlan = [
  'Up to 25 students per session',
  'Real-time confusion detection',
  'Basic analytics dashboard',
  'Privacy-first local processing',
  'Google Meet integration',
];

const proPlan = [
  'Unlimited students per session',
  'Advanced analytics & reports',
  'Historical data & trends',
  'Export session data',
  'Priority support',
  'Custom confusion thresholds',
];

export default function Pricing() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -200, right: -100, width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(102,126,234,0.1) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', bottom: -200, left: -100, width: 400, height: 400,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(118,75,162,0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
      }} />
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.02,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <nav style={{
        padding: '20px 0',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <Link to="/" style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>
            Confu<span style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Sense</span>
          </Link>
        </div>
      </nav>

      <main style={{
        maxWidth: 900, margin: '0 auto', padding: '80px 24px', position: 'relative', zIndex: 1,
        opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '10px 20px', marginBottom: 24,
            background: 'rgba(102,126,234,0.08)',
            border: '1px solid rgba(102,126,234,0.2)', borderRadius: 100,
            fontSize: 14, fontWeight: 500, color: '#667eea',
          }}>
            <span style={{
              width: 8, height: 8, background: '#667eea', borderRadius: '50%',
              boxShadow: '0 0 12px rgba(102,126,234,0.6)',
              animation: 'pulse-glow 2s infinite',
            }} />
            Free version coming to Chrome Web Store soon
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 900, color: '#fff', marginBottom: 12, letterSpacing: '-0.03em' }}>
            Choose your plan
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }}>
            Start for free and upgrade when you need more powerful features
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="plans-grid">
          <div style={cardStyle}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}
          >
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Free</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
              Perfect for individual educators getting started
            </p>
            <div style={{ marginBottom: 32 }}>
              <span style={{ fontSize: 52, fontWeight: 900, color: '#fff' }}>$0</span>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>/month</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {freePlan.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
                  <Check /> {f}
                </div>
              ))}
            </div>
          </div>

          <div style={{
            ...cardStyle,
            border: '1px solid rgba(102,126,234,0.3)',
            background: 'linear-gradient(180deg, rgba(102,126,234,0.06) 0%, rgba(255,255,255,0.02) 40%)',
            boxShadow: '0 0 40px rgba(102,126,234,0.08)',
            position: 'relative', overflow: 'hidden',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(102,126,234,0.5)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(102,126,234,0.3)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, #667eea, #764ba2)',
            }} />
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Pro</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
              For educators and institutions who need advanced insights and larger classes
            </p>
            <div style={{ marginBottom: 32 }}>
              <span style={{
                fontSize: 52, fontWeight: 900,
                background: 'linear-gradient(135deg, #667eea, #a78bfa)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>$20</span>
              <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>/month</span>
            </div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#667eea', marginBottom: 16 }}>
              Everything in Free, plus:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {proPlan.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>
                  <Check /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 48, fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
          All plans include our core privacy-first technology. Your data stays on your device.
        </p>
      </main>

      <style>{`
        @keyframes pulse-glow { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @media (max-width: 700px) { .plans-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

const cardStyle = {
  padding: 40, borderRadius: 24,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)',
  backdropFilter: 'blur(10px)',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
};
