import React from 'react';
import './Features.css';

// Create Features component as arrow function
const Features = () => {
  
  // Create array of feature objects
  // Each object has icon, title, and description
  const features = [
    {
      id: 1, 
      icon: '🧠', // Emoji icon (brain)
      title: 'Micro-Expression Analysis',
      description: 'Advanced AI detects subtle facial cues that indicate confusion in real-time'
    },
    {
      id: 2,
      icon: '🔒', // Lock emoji
      title: 'Privacy-First Design', 
      description: 'All processing happens locally with federated learning - no video data leaves the device'
    },
    {
      id: 3,
      icon: '📊', // Chart emoji
      title: 'Real-Time Dashboard',
      description: 'Instructors see live confusion rates and get instant alerts when students need help'
    },
    {
      id: 4, 
      icon: '✅', // Checkmark emoji
      title: 'Smart Confirmation',
      description: 'Non-intrusive popups verify confusion states to improve accuracy and reduce false positives'
    },
    {
      id: 5,
      icon: '📈', // Graph emoji
      title: 'Continuous Learning',
      description: 'Models improve over time through federated learning without compromising privacy'
    },
    {
      id: 6,
      icon: '🎯', // Target emoji
      title: 'Google Meet Integration',
      description: 'Seamless browser extension works directly with Google Meet - no additional software needed'
    }
  ];

  // Return JSX (the HTML-like code)
  return (
    <section id="features" className="features">

      <div className="container">
        
        <h2 className="section-title">Powerful Features</h2>
        
        <p className="section-subtitle">
          Everything you need to enhance online learning
        </p>
        
        <div className="features-grid">
          {/* map() loops over the array and returns JSX for each feature */}
          {features.map((feature) => (
            <div key={feature.id} className="feature-card">
              
              {/* Icon container */}
              <div className="feature-icon">
                <div className="icon-cube">
                  {/* Display emoji icon */}
                  <span>{feature.icon}</span>
                </div>
              </div>
              
              <h3>{feature.title}</h3>
              
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
};

// Make this component available for use in App.jsx and other files
export default Features;