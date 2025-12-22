import React from 'react';
import './TeamFooter.css';
import { FaInstagram } from 'react-icons/fa';

const TeamFooter = () => {
  
  // Array of team members
  // Add your actual team member names here
  const teamMembers = [
    {
      id: 1,
      name: 'Faraz Ahamed',
      role: 'Team Member',
      studentId: 'w2119695'
    },
    {
      id: 2,
      name: 'Chanith Thewnaka',
      role: 'Team Member',
      studentId: 'w2119810'
    },
    {
      id: 3,
      name: 'Rashmi Pathiraja',
      role: 'Team Member',
      studentId: 'w2120776'
    },
    {
      id: 4,
      name: 'Manojkumar Tejeas',
      role: 'Team Member',
      studentId: 'w2119747'
    },
    {
      id: 5,
      name: 'Nethya Fernando',
      role: 'Team Member',
      studentId: 'w2120040'
    },
    {
      id: 6,
      name: 'Nisanda Gunasinha',
      role: 'Team Member',
      studentId: 'w2119685'
    }
  ];

  return (
    <>
      {/* Team Section */}
      <section id="team" className="team">
        <div className="container">
          {/* Section heading */}
          <h2 className="section-title">Meet Our Team</h2>
          <p className="section-subtitle">SE-11 Software Engineering Students</p>
          
          {/* Team members grid */}
          <div className="team-grid">
            {teamMembers.map((member) => (
              <div key={member.id} className="team-member">
                {/* Placeholder for member photo */}
                <div className="member-avatar">
                  <div className="avatar-placeholder">
                    {/* Display initials from name */}
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                
                {/* Member details */}
                <h4>{member.name}</h4>
                <p className="role">{member.role}</p>
                <p className="student-id">{member.studentId}</p>
              </div>
            ))}
          </div>
          
          {/* Project description */}
          <div className="project-info">
            <p>
              This project is developed as part of the Software Development Group Project 
              (5COSCO21C) at Informatics Institute of Technology, in collaboration with 
              the University of Westminster.
            </p>
            <p>
              Module Leader: Mr. Banuka Athuraliya
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            {/*Logo and tagline */}
            <div className="footer-logo">
              <span className="logo-text">
                Confu<span className="accent">Sense</span>
              </span>
              <p>Enhancing online education through AI</p>
              <p className="tagline">
                Real-time confusion detection for better learning outcomes
              </p>
            </div>
            
            {/*Quick links */}
            <div className="footer-links">
              <h4>Quick Links</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">How It Works</a>
              <a href="#benefits">Benefits</a>
              <a href="#team">Team</a>
            </div>
            
          
          </div>
          
          {/* Copyright bar */}
          <div className="footer-bottom">
            <div className="footer-divider"></div>
            <div className="copyright">
              <p>© 2025 ConfuSense - SE-11 Group Project</p>
              <p>All rights reserved | Academic Project</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};
export default TeamFooter;
