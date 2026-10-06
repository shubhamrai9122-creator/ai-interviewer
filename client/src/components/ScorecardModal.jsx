import React from 'react';
import { 
  Award, CheckCircle2, Download, Printer, X, 
  Code2, Globe, Brain, AlertTriangle, Lightbulb, Compass, Target, ShieldCheck
} from 'lucide-react';

export default function ScorecardModal({
  isOpen = false,
  onClose = () => {},
  result = null,
  studentName = 'Rahul Sharma',
  studentId = 'IS-2026-DSA',
  subjectTitle = 'Data Structures, Algorithms & Web Systems'
}) {
  if (!isOpen || !result) return null;

  const score = Math.round(result.final_score || result.total_score || 85);
  const dsaScore = Math.round(result.dsa_score || score * 0.96);
  const webScore = Math.round(result.web_dev_score || score * 1.04);

  const evalReport = result.evaluation_report || {};
  const subscores = result.subscores || (evalReport.subscores || {
    problem_solving: 8.2,
    communication: 8.5,
    technical_depth: 7.9,
    code_quality: 8.0,
    complexity_analysis: 7.6,
    debugging: 8.1,
    adaptability: 8.4
  });

  const strongestAreas = evalReport.strongest_areas || [
    'Algorithmic problem decomposition and approach selection',
    'Practical full-stack web architecture and authentication flows'
  ];

  const weakestAreas = evalReport.weakest_areas || [
    'Auxiliary memory overhead and space complexity analysis under recursion',
    'Security mitigations against XSS vs CSRF in token storage'
  ];

  const improvementTopics = evalReport.improvement_topics || [
    'Two Pointers & Sliding Window edge-case handling',
    'HttpOnly cookies with SameSite attributes vs localStorage',
    'Stateless JWT blacklist caching using Redis with TTL'
  ];

  const recommendedTopics = evalReport.recommended_topics || [
    'Sliding Window & Monotonic Queue',
    'JWT Refresh Token Rotation & Redis Caching',
    'SQL Indexing & Explain Plans'
  ];

  const suggestedDifficulty = evalReport.suggested_difficulty || 'Intermediate';

  const categoryBreakdown = evalReport.category_breakdown || {
    knowledge_gaps: ['Stateless JWT revocation mechanics'],
    reasoning_problems: ['Optimal window bounds under edge cases'],
    implementation_mistakes: ['Boundary condition handling'],
    communication_problems: ['Initial requirements clarification']
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `MSOT_Evaluation_${studentId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getReadinessLabel = (s) => {
    if (s >= 80) return { text: "High Employability • Ready for Top SDE Roles", color: "#065F46", bg: "#ECFDF5", border: "#A7F3D0" };
    if (s >= 65) return { text: "Solid Baseline • Recommended for Internships", color: "#0073B6", bg: "#EBF5FB", border: "#BAE0F7" };
    return { text: "Developing Foundation • Needs Topic Revision", color: "#991B1B", bg: "#FEF2F2", border: "#FECACA" };
  };

  const readiness = getReadinessLabel(score);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        borderRadius: '12px',
        maxWidth: '920px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        border: '1px solid #CBD5E1',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Certificate / Report Top Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid #E2E8F0',
          background: 'linear-gradient(90deg, #F8FAFC 0%, #FFFFFF 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#008BDC' }}>MSOT</span>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FF6B00', display: 'inline-block' }} />
              <span style={{ height: '16px', width: '1px', background: '#CBD5E1', margin: '0 4px' }} />
              <span className="is-badge-blue">Mirai School of Technology</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', margin: '4px 0' }}>
              Official Candidate Evaluation Certificate
            </h2>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Candidate: <strong>{studentName}</strong> (ID: {studentId}) • Evaluated by <strong>Ira • MSOT AI Recruiter</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              className="is-btn-secondary"
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              <Printer size={14} /> Print Certificate
            </button>
            <button
              onClick={handleDownloadJson}
              className="is-btn-secondary"
              style={{ padding: '6px 14px', fontSize: '12px' }}
            >
              <Download size={14} /> Download JSON
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: '22px', color: '#64748B', cursor: 'pointer', marginLeft: '6px' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Certificate Body */}
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Readiness Score Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #EBF5FB 0%, #FFFFFF 100%)',
            border: '1.5px solid #008BDC',
            borderRadius: '10px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px'
          }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0073B6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Overall Industry Readiness Score
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '48px', fontWeight: 800, color: '#008BDC', lineHeight: 1 }}>
                  {score}%
                </span>
                <span style={{ fontSize: '16px', color: '#64748B', fontWeight: 600 }}>/ 100%</span>
              </div>
              <div style={{
                marginTop: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                background: readiness.bg,
                color: readiness.color,
                border: `1px solid ${readiness.border}`
              }}>
                <ShieldCheck size={16} />
                {readiness.text}
              </div>
            </div>

            {/* Subject Sub-scores */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '14px 20px',
                textAlign: 'center',
                minWidth: '130px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>DSA Mastery</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#008BDC', margin: '4px 0' }}>{dsaScore}%</div>
                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>Algorithms & Complexity</div>
              </div>

              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '14px 20px',
                textAlign: 'center',
                minWidth: '130px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Web Development</div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#FF6B00', margin: '4px 0' }}>{webScore}%</div>
                <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600 }}>Architecture & Auth</div>
              </div>
            </div>
          </div>

          {/* 7 Core Competency Subscores */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Brain size={18} color="#008BDC" />
              MSOT 7-Factor Technical Rubric
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {Object.entries(subscores).map(([dim, val]) => {
                const label = dim.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const numVal = typeof val === 'number' ? val : 8.0;
                const percentage = Math.round((numVal / 10) * 100);
                return (
                  <div key={dim} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                      <span>{label}</span>
                      <span style={{ color: '#008BDC', fontWeight: 700 }}>{numVal.toFixed(1)} / 10</span>
                    </div>
                    <div style={{ height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${percentage}%`,
                        background: percentage >= 80 ? '#10B981' : percentage >= 65 ? '#008BDC' : '#F59E0B',
                        borderRadius: '3px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Diagnostic Improvements */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            {/* Standout Strengths */}
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065F46', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>
                <CheckCircle2 size={16} /> Key Strengths Observed
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#166534', lineHeight: 1.6 }}>
                {strongestAreas.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Diagnostic Areas for Growth */}
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#B45309', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>
                <Lightbulb size={16} /> Key Improvement Areas
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
                {weakestAreas.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Internshala Hiring Partner Recommendation */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '14px', marginBottom: '4px' }}>
                Recommended Next Step: {suggestedDifficulty} Track Preparation
              </div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                Focus Topics: {recommendedTopics.join(', ')}
              </div>
            </div>
            <button
              onClick={onClose}
              className="is-btn-primary"
              style={{ padding: '8px 20px', fontSize: '13px' }}
            >
              Done & Return to Arena
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
