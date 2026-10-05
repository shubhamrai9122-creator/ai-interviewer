import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ProjectInterviewer from './components/ProjectInterviewer';
import StudentPortal from './components/StudentPortal';
import FacultyDashboard from './components/FacultyDashboard';
import ScalabilityReport from './components/ScalabilityReport';
import StarfieldSky from './components/StarfieldSky';

function App() {
  const [activeTab, setActiveTab] = useState('project'); // 'project', 'student', 'faculty', 'scalability'
  const [currentUser, setCurrentUser] = useState({
    id: 'STU001',
    name: 'Rahul Sharma',
    role: 'STUDENT'
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Living Cosmic Canvas & Ambient Nebulae Background */}
      <StarfieldSky />

      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <main style={{ flex: 1, paddingBottom: '60px', position: 'relative', zIndex: 1 }}>
        {activeTab === 'project' && <ProjectInterviewer />}
        {activeTab === 'student' && <StudentPortal />}
        {activeTab === 'faculty' && <FacultyDashboard />}
        {activeTab === 'scalability' && <ScalabilityReport />}
      </main>

      {/* Deep-Space Cosmic Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 1,
        borderTop: '1px solid var(--rule)',
        padding: '24px 32px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--muted)',
        background: 'rgba(5, 5, 10, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="sun-pulse" style={{ width: '8px', height: '8px' }} />
            <span style={{ fontFamily: 'var(--display)', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              AI INTERVIEWER • STAFF BAR-RAISER
            </span>
          </div>
          <div className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>
            Deep Architectural Defense • 8 Load-Bearing Probe Categories • Sweet Aria Voice Engine • WebRTC Telemetry
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-cyan" style={{ fontSize: '10px' }}>Vite + React</span>
            <span className="badge badge-purple" style={{ fontSize: '10px' }}>FastAPI + WebSocket</span>
            <span className="badge badge-emerald" style={{ fontSize: '10px' }}>p95 &lt; 2.5s</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
