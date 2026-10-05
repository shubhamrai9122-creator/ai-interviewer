import React, { useState } from 'react';
import Navbar from './components/Navbar';
import StudentPortal from './components/StudentPortal';
import FacultyDashboard from './components/FacultyDashboard';
import ScalabilityReport from './components/ScalabilityReport';

function App() {
  const [activeTab, setActiveTab] = useState('student'); // 'student', 'faculty', 'scalability'
  const [currentUser, setCurrentUser] = useState({
    id: 'STU001',
    name: 'Rahul Sharma',
    role: 'STUDENT'
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {activeTab === 'student' && <StudentPortal />}
        {activeTab === 'faculty' && <FacultyDashboard />}
        {activeTab === 'scalability' && <ScalabilityReport />}
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 24px',
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-dim)',
        background: 'rgba(6, 9, 19, 0.8)'
      }}>
        MSOT AI Viva Platform (Problem 1) • Deterministic Standardized Rubric • p95 Latency &lt; 2.5s • Auditable Audio & Transcript Logs
      </footer>
    </div>
  );
}

export default App;
