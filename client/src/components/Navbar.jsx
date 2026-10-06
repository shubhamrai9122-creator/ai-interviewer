import React from 'react';
import { Mic, GraduationCap, Server, Radio, Code2, Sparkles, Layers } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <>
      {/* Top Cosmic Gradient Beam */}
      <div className="top-progress-beam" />

      <header style={{
        borderBottom: '1px solid var(--rule)',
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0 28px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          height: '74px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          {/* Brand: Sun Pulse & Unbounded Sheen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #FFE9B8, var(--sun) 55%, #D97706)',
              boxShadow: '0 0 20px rgba(245, 158, 11, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Radio size={19} color="#FFFFFF" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="eyebrow" style={{ fontSize: '0.68rem' }}>
                  TECHNICAL VIVA ARENA
                </span>
                <span className="badge badge-dark" style={{ fontSize: '9px', padding: '2px 8px' }}>
                  DSA & WEB DEV
                </span>
              </div>
              <h1 style={{
                fontFamily: 'var(--display)',
                fontWeight: '800',
                fontSize: '18px',
                letterSpacing: '-0.03em',
                lineHeight: '1.2',
                marginTop: '2px'
              }} className="sheen-text">
                AI INTERVIEWER <span style={{ color: 'var(--ice)' }}>• CORE</span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{
            display: 'flex',
            gap: '6px',
            background: '#F1F5F9',
            padding: '4px',
            borderRadius: '999px',
            border: '1px solid var(--rule)'
          }}>
            <button
              onClick={() => setActiveTab('student')}
              className={`btn ${activeTab === 'student' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '12px',
                padding: '7px 18px',
                border: 'none',
                background: activeTab === 'student' ? '#0F172A' : 'transparent',
                color: activeTab === 'student' ? '#FFFFFF' : 'var(--ink-secondary)',
                boxShadow: activeTab === 'student' ? '0 2px 8px rgba(15, 23, 42, 0.2)' : 'none'
              }}
            >
              <Mic size={14} color={activeTab === 'student' ? '#F59E0B' : 'currentColor'} />
              Student Viva Portal
            </button>

            <button
              onClick={() => setActiveTab('faculty')}
              className={`btn ${activeTab === 'faculty' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '12px',
                padding: '7px 18px',
                border: 'none',
                background: activeTab === 'faculty' ? '#0F172A' : 'transparent',
                color: activeTab === 'faculty' ? '#FFFFFF' : 'var(--ink-secondary)',
                boxShadow: activeTab === 'faculty' ? '0 2px 8px rgba(15, 23, 42, 0.2)' : 'none'
              }}
            >
              <GraduationCap size={14} color={activeTab === 'faculty' ? '#6366F1' : 'currentColor'} />
              Faculty Command Center
            </button>

            <button
              onClick={() => setActiveTab('scalability')}
              className={`btn ${activeTab === 'scalability' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '12px',
                padding: '7px 18px',
                border: 'none',
                background: activeTab === 'scalability' ? '#0F172A' : 'transparent',
                color: activeTab === 'scalability' ? '#FFFFFF' : 'var(--ink-secondary)',
                boxShadow: activeTab === 'scalability' ? '0 2px 8px rgba(15, 23, 42, 0.2)' : 'none'
              }}
            >
              <Server size={14} color={activeTab === 'scalability' ? '#0284C7' : 'currentColor'} />
              Telemetry & Load
            </button>
          </nav>

          {/* Right Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: '#FFFFFF',
              border: '1px solid var(--rule)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <span className="sun-pulse" style={{ width: '8px', height: '8px', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
              <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-secondary)', fontWeight: 600 }}>
                Live Proctor & Code Arena
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Clean Ticker Belt: strictly DSA & Web Development only */}
      <div className="belts">
        <div className="belt-track">
          <div className="belt-item">
            <span className="sun-pulse" style={{ width: '6px', height: '6px' }} />
            <span>DSA: Data Structures & Algorithms</span>
          </div>
          <div className="belt-item">
            <span className="badge badge-purple" style={{ fontSize: '9px', padding: '1px 6px' }}>Web Dev</span>
            <span>Web Development & Systems Architecture</span>
          </div>
          <div className="belt-item">
            <span className="sun-pulse" style={{ width: '6px', height: '6px' }} />
            <span>DSA: Adaptive Complexity Probing</span>
          </div>
          <div className="belt-item">
            <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '1px 6px' }}>Web Dev</span>
            <span>Full-Stack Engineering Assessment</span>
          </div>
          {/* Duplicate set for seamless loop */}
          <div className="belt-item">
            <span className="sun-pulse" style={{ width: '6px', height: '6px' }} />
            <span>DSA: Data Structures & Algorithms</span>
          </div>
          <div className="belt-item">
            <span className="badge badge-purple" style={{ fontSize: '9px', padding: '1px 6px' }}>Web Dev</span>
            <span>Web Development & Systems Architecture</span>
          </div>
          <div className="belt-item">
            <span className="sun-pulse" style={{ width: '6px', height: '6px' }} />
            <span>DSA: Adaptive Complexity Probing</span>
          </div>
          <div className="belt-item">
            <span className="badge badge-cyan" style={{ fontSize: '9px', padding: '1px 6px' }}>Web Dev</span>
            <span>Full-Stack Engineering Assessment</span>
          </div>
        </div>
      </div>
    </>
  );
}
