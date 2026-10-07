import React from 'react';
import { Mic, BookOpen, Award, CheckCircle2 } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  return (
    <header style={{
      borderBottom: '1px solid #E2E8F0',
      background: '#FFFFFF',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)'
    }}>
      {/* Top subtle blue accent strip */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #008BDC, #0073B6, #FF6B00)' }} />

      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        height: '68px',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px'
      }}>
        {/* MSOT Brand Logo & Product Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', cursor: 'pointer' }} onClick={() => setActiveTab('interview')}>
            <span style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#008BDC',
              letterSpacing: '-0.5px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              MSOT
            </span>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#FF6B00',
              display: 'inline-block',
              marginLeft: '2px',
              marginBottom: '2px'
            }} />
          </div>

          <div style={{ height: '24px', width: '1px', background: '#CBD5E1' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              background: '#EBF5FB',
              color: '#0073B6',
              fontWeight: 700,
              fontSize: '12px',
              padding: '3px 9px',
              borderRadius: '4px',
              border: '1px solid #BAE0F7'
            }}>
              MSOT Code Arena
            </span>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
              Powered by <strong style={{ color: '#008BDC' }}>Ira • MSOT AI Recruiter</strong>
            </span>
          </div>
        </div>

        {/* Navigation Tabs (Student View: MSOT Code Arena & Evaluation Reports) */}
        <nav style={{
          display: 'flex',
          gap: '4px',
          background: '#F1F5F9',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #E2E8F0'
        }}>
          <button
            onClick={() => setActiveTab('interview')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'interview' ? '#008BDC' : 'transparent',
              color: activeTab === 'interview' ? '#FFFFFF' : '#475569',
              boxShadow: activeTab === 'interview' ? '0 2px 6px rgba(0, 139, 220, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Mic size={15} color={activeTab === 'interview' ? '#FFFFFF' : '#64748B'} />
            MSOT Code Arena
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 18px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'reports' ? '#008BDC' : 'transparent',
              color: activeTab === 'reports' ? '#FFFFFF' : '#475569',
              boxShadow: activeTab === 'reports' ? '0 2px 6px rgba(0, 139, 220, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Award size={15} color={activeTab === 'reports' ? '#FFFFFF' : '#64748B'} />
            Evaluation Reports
          </button>
        </nav>

        {/* Candidate & Ira Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '20px',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span style={{ fontSize: '12px', color: '#065F46', fontWeight: 600 }}>
              Ira • Online
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '6px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            fontSize: '12px',
            color: '#334155',
            fontWeight: 500
          }}>
            <span style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: '#008BDC',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 700
            }}>
              R
            </span>
            <span>Rahul Sharma</span>
          </div>
        </div>
      </div>
    </header>
  );
}
