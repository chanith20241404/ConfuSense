import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import './App.css';
import './NavigationHero.css';
import './Features.css'; 
import './HowItWorksBenefits.css';
import './TeamFooter.css';

import NavigationHero from './NavigationHero';     
import Features from './Features';                 
import HowItWorksBenefits from './HowItWorksBenefits'; 
import TeamFooter from './TeamFooter';
import Pricing from './Pricing';

// Home page component
const HomePage = () => {
  return (
    <>
      <NavigationHero />
      <Features />
      <HowItWorksBenefits />
      <TeamFooter />
    </>
  );
};

// Main App component with routing
const App = () => {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pricing" element={<Pricing />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;