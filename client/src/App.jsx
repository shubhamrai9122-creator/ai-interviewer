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

      <main style={{ flex: 1, paddingBottom: '24px', position: 'relative', zIndex: 1 }}>
        {activeTab === 'student' && <StudentPortal />}
        {activeTab === 'faculty' && <FacultyDashboard />}
        {activeTab === 'scalability' && <ScalabilityReport />}
      </main>
    </div>
  );
}

export default App;
