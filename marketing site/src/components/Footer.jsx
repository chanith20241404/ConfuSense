import { Link } from 'react-router-dom';
import useReveal from '../useReveal';

const team = [
  { name: 'Faraz Ahamed', id: 'w2119695' },
  { name: 'Chanith Thewnaka', id: 'w2119810' },
  { name: 'Rashmi Pathiraja', id: 'w2120776' },
  { name: 'Manojkumar Tejeas', id: 'w2119747' },
  { name: 'Nethya Fernando', id: 'w2120040' },
  { name: 'Nisanda Gunasinha', id: 'w2119685' },
];

export default function Footer() {
  const [ref, visible] = useReveal();

  return (
    <>
      <section id="team" ref={ref} style={{
        padding: '120px 0',
        background: 'linear-gradient(180deg, #0a0a1a 0%, #0e0e24 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', bottom: -200, left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(102,126,234,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <div style={{
            textAlign: 'center', marginBottom: 56,
            opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)',
            transition: 'all 0.7s ease',
          }}>
            <span style={badgeStyle}>Our Team</span>
            <h2 style={{ fontSize: 44, color: '#fff', marginBottom: 8, fontWeight: 800, letterSpacing: '-0.02em' }}>
              Meet the Team
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)' }}>SE-11 Software Engineering Students</p>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 20, marginBottom: 56,
          }} className="team-grid">
            {team.map((m, i) => (
              <div key={i} style={{
                textAlign: 'center',
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateY(20px)',
                transition: 'all 0.6s ease',
                transitionDelay: `${i * 0.08}s`,
              }}>
                <div style={{
                  width: 80, height: 80, margin: '0 auto 14px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 22, fontWeight: 700,
                  boxShadow: '0 0 24px rgba(102,126,234,0.2)',
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', inset: -3, borderRadius: '50%',
                    border: '1px solid rgba(102,126,234,0.3)',
                  }} />
                  {m.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{m.id}</div>
              </div>
            ))}
          </div>

          <div style={{
            textAlign: 'center', padding: '28px 36px', borderRadius: 20,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(10px)',
            maxWidth: 700, margin: '0 auto',
          }}>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>
              Developed as part of the Software Development Group Project (5COSCO21C) at
              Informatics Institute of Technology, in collaboration with the University of Westminster.
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 10, marginBottom: 0 }}>
              Module Leader: Mr. Banuka Athuraliya
            </p>
          </div>
        </div>
      </section>

      <footer style={{
        background: '#060612',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '48px 0 28px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 40, marginBottom: 40,
          }} className="footer-cols">
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12 }}>
                Confu<span style={{
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>Sense</span>
              </div>
              <p style={{ fontSize: 14, maxWidth: 300, lineHeight: 1.7, color: 'rgba(255,255,255,0.35)' }}>
                Enhancing online education through AI.
                Real-time confusion detection for better learning outcomes.
              </p>
            </div>
            <div>
              <h4 style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginBottom: 16, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Quick Links
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Features', 'How It Works', 'Benefits', 'Team'].map(label => (
                  <a key={label} href={`#${label.toLowerCase().replace(/ /g, '-')}`} style={footerLink}>{label}</a>
                ))}
                <Link to="/pricing" style={footerLink}>Pricing</Link>
              </div>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 24, textAlign: 'center',
          }}>
            <p style={{ fontSize: 13, margin: 0, color: 'rgba(255,255,255,0.3)' }}>
              &copy; 2025 ConfuSense &mdash; SE-11 Group Project
            </p>
            <p style={{ fontSize: 12, marginTop: 4, color: 'rgba(255,255,255,0.2)' }}>
              All rights reserved | Academic Project
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 900px) {
          .team-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 28px !important; }
        }
        @media (max-width: 500px) {
          .team-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .footer-cols { flex-direction: column !important; }
        }
      `}</style>
    </>
  );
}

const badgeStyle = {
  display: 'inline-block', padding: '8px 20px', marginBottom: 20,
  background: 'rgba(102,126,234,0.08)',
  border: '1px solid rgba(102,126,234,0.2)', borderRadius: 100,
  fontSize: 13, fontWeight: 600, color: '#667eea',
  letterSpacing: '0.04em', textTransform: 'uppercase',
};

const footerLink = {
  color: 'rgba(255,255,255,0.35)', fontSize: 14,
  transition: 'color 0.3s ease',
};
