import React, { useState } from 'react';
import Navbar from './components/Navbar';
import StudentPortal from './components/StudentPortal';
import FacultyDashboard from './components/FacultyDashboard';
import ScalabilityReport from './components/ScalabilityReport';
import StarfieldSky from './components/StarfieldSky';

function App() {
  const [activeTab, setActiveTab] = useState('student'); // 'student', 'faculty', 'scalability'
  const [currentUser, setCurrentUser] = useState({
    id: 'STU001',
    name: 'Rahul Sharma',
    role: 'STUDENT'
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Living Ambient Canvas (Light & Cosmic Mixed) */}
      <StarfieldSky />

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <main style={{ flex: 1, paddingBottom: '60px', position: 'relative', zIndex: 1 }}>
        {activeTab === 'student' && <StudentPortal />}
        {activeTab === 'faculty' && <FacultyDashboard />}
        {activeTab === 'scalability' && <ScalabilityReport />}
      </main>

      {/* Porcelain White & Cosmic Mixed Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid var(--rule)',
        padding: '24px 32px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--muted)',
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 -2px 10px rgba(15, 23, 42, 0.03)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="sun-pulse" style={{ width: '8px', height: '8px' }} />
            <span style={{ fontFamily: 'var(--display)', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              AI INTERVIEWER • DSA & WEB DEV ONLY
            </span>
          </div>
          <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-secondary)' }}>
            Adaptive Question Trees • Grok Sweet Voice Engine • Hard 15-Min Limit • Anti-Cheating Telemetry
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-dark" style={{ fontSize: '10px' }}>DSA & Web Dev</span>
            <span className="badge badge-purple" style={{ fontSize: '10px' }}>FastAPI + WebSocket</span>
            <span className="badge badge-emerald" style={{ fontSize: '10px' }}>Turnaround &lt; 2s</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
