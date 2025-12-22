import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './NavigationHero.css';

const NavigationHero = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); 

  return (
    <>
      {/* NAVIGATION SECTION */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <div className="nav-content">
            
            {/* Logo */}
            <div className="logo">
              <span className="logo-text">
                Confu<span className="accent">Sense</span>
              </span>
            </div>
            
            {/* Navigation Links */}
            <div className="nav-links">
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#benefits">Benefits</a>
              <a href="#team">Team</a>
              <Link to="/pricing" className="nav-btn">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION (Main Banner) */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            
            {/* Left side - Text content */}
            <div className="hero-text">
              <h1 className="hero-title">
                Detect Student Confusion in 
                <span className="gradient-text"> Real-Time</span>
              </h1>
              
              <p className="hero-description">
                ConfuSense uses advanced micro-expression analysis and federated learning 
                to help educators identify and address student confusion during online classes, 
                ensuring no student is left behind. Our privacy-first approach processes all 
                data locally, keeping student information secure while providing valuable 
                insights to instructors.
              </p>
              
              <div className="hero-info">
                <p className="hero-detail">
                  Built as a browser extension for Google Meet, ConfuSense seamlessly 
                  integrates into your existing online classroom setup. No additional 
                  software or complex configurations required.
                </p>
              </div>
              
              <div className="stats">
                <div className="stat">
                  <h3>70-80%</h3>
                  <p>Detection Accuracy</p>
                </div>
                <div className="stat">
                  <h3>100%</h3>
                  <p>Privacy Protected</p>
                </div>
                <div className="stat">
                  <h3>&lt;500ms</h3>
                  <p>Response Time</p>
                </div>
              </div>
            </div>
            
            {/* Right side - Images */}
            <div className="hero-visual">
              <div className="hero-images">
                <div className="hero-decoration hero-decoration-1"></div>
                <div className="hero-decoration hero-decoration-2"></div>
                <img 
                  src="/hero-isometric.png" 
                  alt="Online Learning" 
                  className="hero-img-main"
                />
                <img 
                  src="/federated-iso.png" 
                  alt="Federated Learning Network" 
                  className="hero-img-secondary"
                />
              </div>
            </div>
            
          </div>
        </div>
      </section>
    </>
  );
};

export default NavigationHero;