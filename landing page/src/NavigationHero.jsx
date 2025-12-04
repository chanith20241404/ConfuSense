import React, { useState, useEffect } from 'react';

import './NavigationHero.css';

const NavigationHero = () => {
  

  const [scrolled, setScrolled] = useState(false);

  

  useEffect(() => {
    const handleScroll = () => {
  
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    
    // Cleanup function - removes listener when component unmounts
    return () => window.removeEventListener('scroll', handleScroll);
  }, []); // Empty array means run once when component loads

  return (
    <>
      
      
      {/* NAVIGATION SECTION */}
      
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        {/* Container keeps content centered with max width */}
        <div className="nav-container">
          <div className="nav-content">
            
            {/* Logo */}
            <div className="logo">
              {/* span is inline element for styling part of text */}
              <span className="logo-text">
                Confu<span className="accent">Sense</span>
              </span>
            </div>
            
            {/* Navigation Links */}
            <div className="nav-links">
              {/* href="#features" scrolls to element with id="features" */}
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#benefits">Benefits</a>
              <a href="#team">Team</a>
              {/* Removed Get Started button as requested */}
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
              {/* Main heading */}
              <h1 className="hero-title">
                Detect Student Confusion in 
                <span className="gradient-text"> Real-Time</span>
              </h1>
              
              {/* Description paragraph */}
              <p className="hero-description">
                ConfuSense uses advanced micro-expression analysis and federated learning 
                to help educators identify and address student confusion during online classes, 
                ensuring no student is left behind. Our privacy-first approach processes all 
                data locally, keeping student information secure while providing valuable 
                insights to instructors.
              </p>
              
              {/* Updated content - removed buttons, added more description */}
              <div className="hero-info">
                <p className="hero-detail">
                  Built as a browser extension for Google Meet, ConfuSense seamlessly 
                  integrates into your existing online classroom setup. No additional 
                  software or complex configurations required.
                </p>
              </div>
              
              {/* Statistics boxes */}
              <div className="stats">
                <div className="stat">
                  <h3>70-75%</h3>
                  <p>Detection Accuracy</p>
                </div>
                <div className="stat">
                  <h3>100%</h3>
                  <p>Privacy Protected</p>
                </div>
                <div className="stat">
                  <h3>&lt;500ms</h3>
                  {/* &lt; is HTML entity for < symbol */}
                  <p>Response Time</p>
                </div>
              </div>
            </div>
            
            {/* Right side - Visual elements */}
            <div className="hero-visual">
              {/* Isometric 3D container */}
              <div className="isometric-container">
                {/* Main floating cube */}
                <div className="iso-cube main-cube">
                  <div className="face top"></div>
                  <div className="face left"></div>
                  <div className="face right"></div>
                </div>
                
                {/* Smaller floating cubes */}
                <div className="iso-cube float-cube-1">
                  <div className="face top"></div>
                  <div className="face left"></div>
                  <div className="face right"></div>
                </div>
                
                <div className="iso-cube float-cube-2">
                  <div className="face top"></div>
                  <div className="face left"></div>
                  <div className="face right"></div>
                </div>
                
                {/* Dashboard mockup */}
                <div className="screen-mock">
                  <div className="screen-content">
                    <div className="student-grid">
                      {/* Array(6) creates array with 6 empty slots */}
                      {/* map loops through array to create 6 student cards */}
                      {/* _ means we don't use the value, i is the index */}
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="student-card">
                          {/* key={i} helps React track elements efficiently */}
                          <div className="avatar"></div>
                          <div className="confusion-bar">
                            {/* Math.random() generates random width for demo */}
                            <div 
                              className="bar-fill" 
                              style={{width: `${Math.random() * 100}%`}}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </section>
    </>
  );
};

export default NavigationHero;
