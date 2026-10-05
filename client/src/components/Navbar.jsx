import React from 'react';
import { Mic, ShieldCheck, GraduationCap, BarChart3, Radio, Server } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, currentUser, setCurrentUser }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(6, 9, 19, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 24px'
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        height: '70px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Radio size={22} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                MSOT <span style={{ color: 'var(--cyan)' }}>AI Viva</span>
              </h1>
              <span className="badge badge-emerald" style={{ fontSize: '10px', padding: '2px 8px' }}>
                Cohort #42 Active
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              15-Min Adaptive Technical Oral Examination
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('student')}
            className={`btn ${activeTab === 'student' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            <Mic size={16} />
            Student Viva Room
          </button>

          <button
            onClick={() => setActiveTab('faculty')}
            className={`btn ${activeTab === 'faculty' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            <GraduationCap size={16} />
            Faculty Audit Dashboard
          </button>

          <button
            onClick={() => setActiveTab('scalability')}
            className={`btn ${activeTab === 'scalability' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            <Server size={16} />
            Scalability & Capacity
          </button>
        </nav>

        {/* Active Identity Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '13px', fontWeight: '600' }}>
              {activeTab === 'student' ? 'Rahul Sharma' : 'Dr. Arvind Sharma'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <span className="recording-pulse" style={{ width: '6px', height: '6px', background: 'var(--emerald)' }}></span>
              {activeTab === 'student' ? 'ID: STU001' : 'Faculty Examiner'}
            </div>
          </div>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: activeTab === 'student' ? 'rgba(6, 182, 212, 0.2)' : 'rgba(99, 102, 241, 0.2)',
            border: `1px solid ${activeTab === 'student' ? 'var(--cyan)' : 'var(--primary)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '700',
            color: activeTab === 'student' ? 'var(--cyan)' : 'var(--primary-light)'
          }}>
            {activeTab === 'student' ? 'RS' : 'AS'}
          </div>
        </div>
      </div>
    </header>
  );
}
