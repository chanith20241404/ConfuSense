

import React from 'react';
import './HowItWorksBenefits.css';

const HowItWorksBenefits = () => {
  
  // 4 main steps of the process
  const steps = [
    {
      number: 1,
      title: 'Install Extension',
      description: 'Add ConfuSense to Chrome with one click'
    },
    {
      number: 2,
      title: 'Join Session',
      description: 'Extension activates automatically in Google Meet'
    },
    {
      number: 3,
      title: 'Real-Time Analysis',
      description: 'AI analyzes micro-expressions locally'
    },
    {
      number: 4,
      title: 'Get Insights',
      description: 'Teachers see live dashboard with confusion alerts'
    }
  ];

    // Benefits for each user group
  const benefitsData = {
    students: {
      title: 'For Students',
      benefits: [
        'Get help when you need it most',
        'No more struggling in silence',
        'Privacy always protected',
        'Better learning outcomes'
      ]
    },
    teachers: {
      title: 'For Teachers',
      benefits: [
        'Know when students need help',
        'Improve teaching effectiveness',
        'Real-time classroom insights',
        'Reduce dropout rates'
      ]
    },
    institutions: {
      title: 'For Institutions',
      benefits: [
        'Enhanced student satisfaction',
        'Better retention rates',
        'GDPR/FERPA compliant',
        'Improved reputation'
      ]
    }
  };

  return (
    <>
     
      {/* HOW IT WORKS */}
      <section id="how-it-works" className="how-it-works">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Simple setup, powerful results</p>
          
          
          <div className="steps">
            {steps.map((step, index) => (
              // React Fragment with key for each step group
              <React.Fragment key={step.number}>
                
                <div className="step">
                  <div className="step-number">{step.number}</div>
                                  
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </div>
                               
                {index < steps.length - 1 && (
                  <div className="step-line"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section id="benefits" className="benefits">
        <div className="container">
          <h2 className="section-title">Benefits for Everyone</h2>

          <div className="benefits-grid">  
            {Object.entries(benefitsData).map(([key, data]) => (
              <div key={key} className={`benefit-card ${key}`}>
                <h3>{data.title}</h3>  
                <ul>
                  {data.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          
         {/* Short project description */}
          <div className="project-description">
            <p>
              ConfuSense is being developed as part of the Software Development 
              Group Project at Informatics Institute of Technology. Our team of 
              six software engineering students is committed to creating an 
              innovative solution that addresses real challenges in online education.
            </p>
            <p>
              The system combines cutting-edge technologies including TensorFlow.js 
              for browser-based AI, federated learning for privacy preservation, 
              and real-time WebSocket communication for instant feedback.
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

export default HowItWorksBenefits;


