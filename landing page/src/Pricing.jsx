// PRICING PAGE: Shows Free and Pro plans
// File: Pricing.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import './Pricing.css';

const Pricing = () => {
  return (
    <div className="pricing-page">
      {/* Navigation */}
      <nav className="pricing-nav">
        <div className="pricing-container">
          <Link to="/" className="pricing-logo">
            <span className="logo-text">
              Confu<span className="accent">Sense</span>
            </span>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pricing-main">
        <div className="pricing-container">
          {/* Header */}
          <div className="pricing-header">
            <div className="coming-soon-badge">
              <span className="badge-dot"></span>
              Free version coming to Chrome Web Store soon
            </div>
            <h1 className="pricing-title">
              Choose your plan
            </h1>
            <p className="pricing-subtitle">
              Start for free and upgrade when you need more powerful features
            </p>
          </div>

          {/* Plans */}
          <div className="plans-grid">
            {/* Free Plan */}
            <div className="plan-card">
              <div className="plan-header">
                <h2 className="plan-name">Free</h2>
                <p className="plan-description">
                  Perfect for individual educators getting started
                </p>
              </div>
              
              <div className="plan-price">
                <span className="price-amount">$0</span>
                <span className="price-period">/month</span>
              </div>

              <div className="plan-features">
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Up to 25 students per session</span>
                </div>
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Real-time confusion detection</span>
                </div>
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Basic analytics dashboard</span>
                </div>
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Privacy-first local processing</span>
                </div>
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Google Meet integration</span>
                </div>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="plan-card plan-card-featured">
              <div className="plan-header">
                <h2 className="plan-name">Pro</h2>
                <p className="plan-description">
                  For educators and institutions who need advanced insights and larger classes
                </p>
              </div>
              
              <div className="plan-price">
                <span className="price-amount">$20</span>
                <span className="price-period">/month</span>
              </div>

              <div className="plan-features">
                <p className="features-intro">Everything in Free, plus:</p>
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Unlimited students per session</span>
                </div>
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Advanced analytics & reports</span>
                </div>
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Historical data & trends</span>
                </div>
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Export session data</span>
                </div>
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Priority support</span>
                </div>
                <div className="feature-item">
                  <svg className="feature-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Custom confusion thresholds</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="pricing-note">
            All plans include our core privacy-first technology. Your data stays on your device.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
