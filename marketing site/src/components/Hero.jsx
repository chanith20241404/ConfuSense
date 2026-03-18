import { useEffect, useState } from 'react';

export default function Hero() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);

  return (
    <section style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      background: '#0a0a1a', position: 'relative', overflow: 'hidden', paddingTop: 100,
    }}>
      {/* Animated gradient orbs */}
      <div style={{
        position: 'absolute', top: -200, right: -200, width: 600, height: 600,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
        filter: 'blur(60px)', animation: 'float 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: -150, left: -150, width: 500, height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(118,75,162,0.12) 0%, transparent 70%)',
        filter: 'blur(60px)', animation: 'float 10s ease-in-out infinite reverse',
      }} />
      <div style={{
        position: 'absolute', top: '30%', left: '50%', width: 300, height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(102,126,234,0.08) 0%, transparent 70%)',
        filter: 'blur(40px)', animation: 'float 12s ease-in-out infinite',
      }} />

      {/* Grid pattern overlay */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '60px 24px', position: 'relative', zIndex: 1,
        opacity: loaded ? 1 : 0, transform: loaded ? 'none' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }} className="hero-grid">
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              padding: '10px 20px', marginBottom: 28,
              background: 'rgba(102,126,234,0.08)',
              border: '1px solid rgba(102,126,234,0.2)', borderRadius: 100,
              fontSize: 14, fontWeight: 500, color: '#667eea',
              backdropFilter: 'blur(10px)',
            }}>
              <span style={{
                width: 8, height: 8, background: '#667eea', borderRadius: '50%',
                boxShadow: '0 0 12px rgba(102,126,234,0.6)',
                animation: 'pulse-glow 2s infinite',
              }} />
              Powered by Gemini AI
            </div>

            <h1 style={{
              fontSize: 60, fontWeight: 900, color: '#fff', marginBottom: 28,
              lineHeight: 1.05, letterSpacing: '-0.03em',
            }}>
              Know When Your<br />Students Are{' '}
              <span style={{
                background: 'linear-gradient(135deg, #667eea, #a78bfa, #764ba2, #667eea)',
                backgroundSize: '300% 300%',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                animation: 'gradient-shift 4s ease infinite',
              }}>
                Confused
              </span>
            </h1>

            <p style={{
              fontSize: 18, color: 'rgba(255,255,255,0.6)', marginBottom: 44,
              maxWidth: 520, lineHeight: 1.8,
            }}>
              ConfuSense is a Chrome extension for Google Meet that detects student confusion
              in real-time using Gemini AI. Tutors get a live dashboard, one-click intervention,
              and exportable session reports.
            </p>

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <a href="#features" style={{
                padding: '16px 36px', borderRadius: 12,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: '#fff', fontWeight: 700, fontSize: 16,
                boxShadow: '0 0 30px rgba(102,126,234,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                transition: 'all 0.3s ease',
              }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 50px rgba(102,126,234,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(102,126,234,0.35)'; e.currentTarget.style.transform = 'none'; }}
              >
                Explore Features
              </a>
              <a href="#how-it-works" style={{
                padding: '16px 36px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)',
                fontWeight: 600, fontSize: 16,
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(102,126,234,0.5)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              >
                How It Works
              </a>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              width: '80%', height: '80%', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(102,126,234,0.2) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }} />
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 24, padding: 3,
              border: '1px solid rgba(102,126,234,0.15)',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              animation: 'float 6s ease-in-out infinite',
            }}>
              <DashboardMockup />
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 100,
        }} className="stats-grid">
          {[
            { value: 'Gemini 2.5', label: 'Flash Lite AI Model', icon: '\u26A1' },
            { value: '< 5s', label: 'Detection Cycle', icon: '\uD83C\uDFAF' },
            { value: 'PDF + CSV', label: 'Session Reports', icon: '\uD83D\uDCCA' },
          ].map((s, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '32px 24px', borderRadius: 20,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(102,126,234,0.3)'; e.currentTarget.style.background = 'rgba(102,126,234,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{
                fontSize: 26, fontWeight: 800, marginBottom: 4,
                background: 'linear-gradient(135deg, #667eea, #a78bfa)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{s.value}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow { 0%,100%{opacity:1;box-shadow:0 0 12px rgba(102,126,234,0.6)} 50%{opacity:0.6;box-shadow:0 0 4px rgba(102,126,234,0.3)} }
        @media (max-width: 900px) {
          .hero-grid { grid-template-columns: 1fr !important; text-align: center; }
          .hero-grid h1 { font-size: 40px !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function DashboardMockup() {
  return (
    <div style={{
      background: 'linear-gradient(180deg, #0d0d1a, #111128)',
      borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(102,126,234,0.08)',
    }}>
      <div style={{
        padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
        display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80' }} />
        <span style={{
          marginLeft: 16, fontSize: 12, color: 'rgba(255,255,255,0.35)',
          fontFamily: "'SF Mono', 'Fira Code', monospace", letterSpacing: '0.02em',
        }}>ConfuSense Dashboard</span>
      </div>
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Students Confused
          </span>
          <span style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px rgba(74,222,128,0.5)', animation: 'pulse-glow 2s infinite' }} />
            Live &middot; 04:32
          </span>
        </div>
        <div style={{
          fontSize: 40, fontWeight: 900, marginBottom: 24,
          background: 'linear-gradient(135deg, #ef4444, #f87171)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>1 / 3</div>
        {[
          { name: 'Alex', confused: true },
          { name: 'Sarah', confused: false },
          { name: 'Mike', confused: false },
        ].map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', marginBottom: 8, borderRadius: 10,
            background: s.confused ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.02)',
            borderLeft: `3px solid ${s.confused ? '#ef4444' : 'transparent'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: s.confused ? '#ef4444' : '#4ade80',
                boxShadow: `0 0 8px ${s.confused ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.3)'}`,
              }} />
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 500 }}>{s.name}</span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
              color: s.confused ? '#ef4444' : '#4ade80',
              background: s.confused ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.08)',
            }}>
              {s.confused ? 'Confused' : 'Engaged'}
            </span>
          </div>
        ))}
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <span style={{
            padding: '8px 18px', borderRadius: 8,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff', fontSize: 12, fontWeight: 600,
            boxShadow: '0 0 16px rgba(102,126,234,0.3)',
          }}>Intervene</span>
          <span style={{
            padding: '8px 18px', borderRadius: 8,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600,
          }}>Export Report</span>
        </div>
      </div>
    </div>
  );
}
