import React, { useState } from 'react';
import Navbar from './components/Navbar';
import StudentPortal from './components/StudentPortal';
import SyllabusTrainingLab from './components/SyllabusTrainingLab';
import FacultyDashboard from './components/FacultyDashboard';

function App() {
  const [activeTab, setActiveTab] = useState('interview'); // 'interview', 'training', 'reports'
  const [activeSyllabusForInterview, setActiveSyllabusForInterview] = useState(null);
  const [currentUser, setCurrentUser] = useState({
    id: 'IS-2026-DSA',
    name: 'Rahul Sharma',
    role: 'STUDENT'
  });

  const handleLaunchInterviewFromSyllabus = (syllabus) => {
    setActiveSyllabusForInterview(syllabus);
    setActiveTab('interview');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F8F9FA' }}>
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
      />

      <main style={{ flex: 1, paddingBottom: '36px' }}>
        {activeTab === 'interview' && (
          <StudentPortal
            initialSyllabus={activeSyllabusForInterview}
            onNavigateToTraining={() => setActiveTab('training')}
          />
        )}
        {activeTab === 'training' && (
          <SyllabusTrainingLab
            onLaunchInterview={handleLaunchInterviewFromSyllabus}
          />
        )}
        {activeTab === 'reports' && (
          <FacultyDashboard />
        )}
      </main>
    </div>
  );
}

export default App;
