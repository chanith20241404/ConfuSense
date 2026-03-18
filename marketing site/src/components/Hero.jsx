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
