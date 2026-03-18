import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      padding: scrolled ? '12px 0' : '20px 0',
      background: scrolled ? 'rgba(10, 10, 26, 0.85)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(102, 126, 234, 0.1)' : '1px solid transparent',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
          Confu<span style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Sense</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }} className="nav-links">
          {['Features', 'How It Works', 'Benefits', 'Team'].map(label => (
            <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`} style={linkStyle}>{label}</a>
          ))}
          <Link to="/pricing" style={linkStyle}>Pricing</Link>
          <a href="#features" style={{
            padding: '10px 28px', borderRadius: 10,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff', fontWeight: 600, fontSize: 14,
            boxShadow: '0 0 20px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(102, 126, 234, 0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 20px rgba(102, 126, 234, 0.3)'; e.currentTarget.style.transform = 'none'; }}
          >Get Started</a>
        </div>

        <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: 'none', flexDirection: 'column', gap: 5 }} className="nav-hamburger">
          <span style={{ width: 24, height: 2, background: '#fff', borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span style={{ width: 24, height: 2, background: '#fff', borderRadius: 2, transition: 'all 0.3s', opacity: menuOpen ? 0 : 1 }} />
          <span style={{ width: 24, height: 2, background: '#fff', borderRadius: 2, transition: 'all 0.3s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      </div>

      {menuOpen && (
        <div style={{
          padding: '20px 24px', background: 'rgba(10, 10, 26, 0.95)',
          backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(102, 126, 234, 0.1)',
        }}>
          {['Features', 'How It Works', 'Benefits', 'Team'].map(label => (
            <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`}
              onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>{label}</a>
          ))}
          <Link to="/pricing" onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>Pricing</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}

const linkStyle = {
  color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: 15,
  transition: 'color 0.3s ease',
};
const mobileLinkStyle = {
  display: 'block', padding: '14px 0',
  color: 'rgba(255,255,255,0.7)', fontWeight: 500, fontSize: 15,
  borderBottom: '1px solid rgba(255,255,255,0.05)',
};
