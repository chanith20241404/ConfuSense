import React from 'react';
import './App.css';
import './TeamFooter.css';
import './HowItWorksBenefits.css';

import HowItWorksBenefits from './HowItWorksBenefits'; 
import TeamFooter from './TeamFooter';             


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
