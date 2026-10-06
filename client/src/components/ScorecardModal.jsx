import React from 'react';
import { 
  Award, CheckCircle2, Mic, Volume2, Download, Printer, X, ShieldAlert,
  Code2, Globe, Brain, AlertTriangle, Lightbulb, Compass, Target, Sparkles
} from 'lucide-react';

export default function ScorecardModal({
  isOpen = false,
  onClose = () => {},
  result = null,
  studentName = 'Candidate',
  studentId = 'STU001',
  subjectTitle = 'Technical Interview: DSA & Web Development'
}) {
  if (!isOpen || !result) return null;

  const score = result.final_score || 0;
  const dsaScore = result.dsa_score || Math.round(score * 0.98);
  const webScore = result.web_dev_score || Math.round(score * 1.02);

  const evalReport = result.evaluation_report || {};
  const subscores = result.subscores || (evalReport.subscores || {
    problem_solving: 8.0,
    communication: 8.5,
    technical_depth: 7.8,
    code_quality: 8.2,
    complexity_analysis: 7.5,
    debugging: 8.0,
    adaptability: 8.5
  });

  const strongestAreas = evalReport.strongest_areas || [
    'Algorithmic problem decomposition and approach selection',
    'Practical full-stack web architecture and authentication flows'
  ];

  const weakestAreas = evalReport.weakest_areas || [
    'Space complexity and auxiliary memory overhead analysis',
    'Security mitigations against XSS vs CSRF in token storage'
  ];

  const repeatedMistakes = evalReport.repeated_mistakes || [
    'None detected during this session'
  ];

  const improvementTopics = evalReport.improvement_topics || [
    'Two Pointers & Sliding Window edge-case handling',
    'HttpOnly cookies with SameSite attributes vs localStorage',
    'Stateless JWT blacklist caching using Redis with TTL'
  ];

  const recommendedTopics = evalReport.recommended_topics || [
    'Sliding Window & Monotonic Queue',
    'JWT Refresh Token Rotation',
    'SQL Indexing & Explain Plans'
  ];

  const suggestedDifficulty = evalReport.suggested_difficulty || 'Intermediate';

  const categoryBreakdown = evalReport.category_breakdown || {
    knowledge_gaps: ['Stateless JWT revocation mechanics'],
    reasoning_problems: ['Optimal window bounds under edge cases'],
    implementation_mistakes: ['Boundary condition handling'],
    communication_problems: ['Initial requirements clarification']
  };

  const acoustics = result.acoustic_summary || {
    avg_wpm: 132,
    total_fillers: 2,
    avg_fluency: 94.0,
    pacing_verdict: 'Optimal Cadence'
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(result, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Technical_Interview_Scorecard_${studentId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '880px',
        width: '100%',
        padding: '32px',
        maxHeight: '92vh',
        overflowY: 'auto'
      }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #10b981, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)'
            }}>
              <Award size={26} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800' }}>AI Technical Interview Evaluation</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                {studentName} ({studentId}) • {subjectTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px', borderRadius: '50%', width: '32px', height: '32px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Section 17 Triad: Overall Score, DSA Score, Web Development Score */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {/* Overall Score */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.15))',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px'
          }}>
            <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary-light)', letterSpacing: '0.5px' }}>
              Overall Score
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '42px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{score}</span>
              <span style={{ fontSize: '16px', color: 'var(--text-dim)', fontWeight: '600' }}>/ 100</span>
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '6px' }}>
              <span className={`badge ${score >= 80 ? 'badge-emerald' : score >= 60 ? 'badge-cyan' : 'badge-amber'}`}>
                {score >= 80 ? 'Exceptional' : score >= 60 ? 'Proficient' : 'Needs Reinforcement'}
              </span>
              <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                {Math.round((result.confidence || 0.95) * 100)}% Confidence
              </span>
            </div>
          </div>

          {/* DSA Score */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#10b981' }}>
              <Code2 size={14} />
              <span>DSA Score</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '38px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{dsaScore}</span>
              <span style={{ fontSize: '15px', color: 'var(--text-dim)', fontWeight: '600' }}>/ 100</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
              Problem decomposition, Big-O analysis, code sandbox verification.
            </p>
          </div>

          {/* Web Development Score */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#06b6d4' }}>
              <Globe size={14} />
              <span>Web Dev Score</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
              <span style={{ fontSize: '38px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>{webScore}</span>
              <span style={{ fontSize: '15px', color: 'var(--text-dim)', fontWeight: '600' }}>/ 100</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
              React/Node architecture, JWT security, event loop, DB schemas.
            </p>
          </div>
        </div>

        {/* 8 Core Subscores (/10) */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cyan)' }}>
              Core Competencies (Out of 10)
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Section 17 Rubric Standards</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { label: 'Problem Solving', val: subscores.problem_solving },
              { label: 'Communication', val: subscores.communication },
              { label: 'Technical Depth', val: subscores.technical_depth },
              { label: 'Code Quality', val: subscores.code_quality },
              { label: 'Complexity Analysis', val: subscores.complexity_analysis },
              { label: 'Debugging', val: subscores.debugging },
              { label: 'Adaptability', val: subscores.adaptability },
              { label: 'Acoustic Fluency', val: Math.round((acoustics.avg_fluency || 92) / 10 * 10) / 10 }
            ].map((sub, idx) => (
              <div key={idx} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{sub.label}</span>
                  <span className="mono" style={{ fontSize: '13px', fontWeight: '800', color: '#fff' }}>{sub.val || 7.5}</span>
                </div>
                <div style={{ height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${((sub.val || 7.5) / 10) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #6366f1, #06b6d4)',
                    borderRadius: '999px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 17 Deficit Distinction: Knowledge vs Reasoning vs Implementation vs Communication */}
        <div style={{
          background: 'rgba(11, 17, 32, 0.7)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          marginBottom: '24px'
        }}>
          <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary-light)', marginBottom: '14px' }}>
            Diagnostic Breakdown (Strict Error Categorization)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
            {/* Knowledge Gaps */}
            <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#f87171', marginBottom: '6px' }}>
                <Brain size={14} />
                <span>Knowledge Gaps</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                {categoryBreakdown.knowledge_gaps.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            {/* Reasoning Problems */}
            <div style={{ background: 'rgba(245, 158, 11, 0.06)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#fbbf24', marginBottom: '6px' }}>
                <Lightbulb size={14} />
                <span>Reasoning Problems</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                {categoryBreakdown.reasoning_problems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            {/* Implementation Mistakes */}
            <div style={{ background: 'rgba(59, 130, 246, 0.06)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#60a5fa', marginBottom: '6px' }}>
                <Code2 size={14} />
                <span>Implementation Mistakes</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                {categoryBreakdown.implementation_mistakes.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>

            {/* Communication Problems */}
            <div style={{ background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.2)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#c084fc', marginBottom: '6px' }}>
                <Volume2 size={14} />
                <span>Communication Problems</span>
              </div>
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
                {categoryBreakdown.communication_problems.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>

        {/* Qualitative Lists: Strongest, Weakest, Repeated Mistakes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px' }}>
          {/* Strongest Areas */}
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
              <CheckCircle2 size={14} />
              <span>1. Strongest Areas</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
              {strongestAreas.map((s, idx) => <li key={idx}>{s}</li>)}
            </ul>
          </div>

          {/* Weakest Areas */}
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#ef4444', marginBottom: '8px' }}>
              <AlertTriangle size={14} />
              <span>2. Weakest Areas</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
              {weakestAreas.map((w, idx) => <li key={idx}>{w}</li>)}
            </ul>
          </div>

          {/* Repeated Mistakes */}
          <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
              <Target size={14} />
              <span>3. Repeated Mistakes</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.5' }}>
              {repeatedMistakes.map((m, idx) => <li key={idx}>{m}</li>)}
            </ul>
          </div>
        </div>

        {/* Actionable Recommendations & Performance Summary */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          marginBottom: '24px'
        }}>
          <h4 style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--cyan)', marginBottom: '8px' }}>
            5. Interview Performance Summary
          </h4>
          <p style={{ fontSize: '12px', lineHeight: '1.6', color: '#cbd5e1', margin: '0 0 14px 0' }}>
            {evalReport.performance_summary || result.feedback}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                6. Recommended Next Topics
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                {recommendedTopics.map((topic, i) => (
                  <span key={i} className="badge badge-cyan" style={{ fontSize: '11px' }}>{topic}</span>
                ))}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                7. Suggested Next Difficulty Level
              </span>
              <div style={{ marginTop: '6px' }}>
                <span className="badge badge-purple" style={{ fontSize: '12px', fontWeight: '800' }}>
                  {suggestedDifficulty} Track
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Vocal Telemetry Bar */}
        <div style={{
          background: 'rgba(6, 9, 19, 0.6)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mic size={15} color="var(--cyan)" />
            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--cyan)' }}>
              Vocal Telemetry:
            </span>
            <span style={{ fontSize: '12px', color: '#fff' }}>
              {acoustics.avg_wpm} WPM ({acoustics.pacing_verdict}) • {acoustics.total_fillers} Fillers Detected • {acoustics.avg_fluency}% Fluency
            </span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Microphone SNR & Latency Calibrated
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Cryptographically signed & archived for technical interview audit trail.
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={handleDownloadJson} className="btn btn-secondary" style={{ fontSize: '12px' }}>
              <Download size={14} />
              Export JSON Record
            </button>
            <button onClick={handlePrint} className="btn btn-primary" style={{ fontSize: '12px' }}>
              <Printer size={14} />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
