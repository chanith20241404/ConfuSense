import React from 'react';

import './TeamFooter.css';
import './HowItWorksBenefits.css';
import './Features.css'; 
import './NavigationHero.css';  
import './App.css';

import HowItWorksBenefits from './HowItWorksBenefits'; 
import TeamFooter from './TeamFooter';         
import Features from './Features'; 
import NavigationHero from './NavigationHero';     


const App = () => {
  

  
  return (
    <div className="app">
      <NavigationHero />

      <HowItWorksBenefits />
      
      <Features />
  
      <TeamFooter />
      
    </div>
  );
};


export default App;
