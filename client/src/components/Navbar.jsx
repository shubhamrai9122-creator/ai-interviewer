import React from 'react';
import { Mic, GraduationCap, Server, Radio, Code2, Sparkles } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <>
      {/* Top Cosmic Gradient Beam */}
      <div className="top-progress-beam" />

      <header style={{
        borderBottom: '1px solid var(--rule)',
        background: 'rgba(5, 5, 10, 0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0 24px'
      }}>
        <div style={{
          maxWidth: '1440px',
          margin: '0 auto',
          height: '76px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          {/* Brand: Sun Pulse & Unbounded Sheen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #FFE9B8, var(--sun) 55%, #C0621B)',
              boxShadow: '0 0 24px rgba(255, 179, 71, 0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Radio size={20} color="#0B0920" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="eyebrow" style={{ fontSize: '0.68rem' }}>
                  AI PROJECT INTERVIEWER
                </span>
                <span className="badge badge-amber" style={{ fontSize: '9px', padding: '2px 8px' }}>
                  LIVE BAR-RAISER
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
                INTERVIEW <span style={{ color: 'var(--ice)' }}>MY PROJECT</span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('project')}
              className={`btn ${activeTab === 'project' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              <Code2 size={15} color="var(--ice)" />
              Interview My Project
            </button>

            <button
              onClick={() => setActiveTab('student')}
              className={`btn ${activeTab === 'student' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              <Mic size={15} />
              Academic Topic Trees
            </button>

            <button
              onClick={() => setActiveTab('faculty')}
              className={`btn ${activeTab === 'faculty' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              <GraduationCap size={15} />
              Faculty Command Center
            </button>

            <button
              onClick={() => setActiveTab('scalability')}
              className={`btn ${activeTab === 'scalability' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              <Server size={15} />
              Telemetry & Load
            </button>
          </nav>

          {/* Right Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--rule)'
            }}>
              <span className="sun-pulse" style={{ width: '8px', height: '8px' }} />
              <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                Aria Sweet Voice Engine
              </span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
