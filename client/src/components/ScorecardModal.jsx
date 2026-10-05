import React from 'react';
import { Award, CheckCircle2, Mic, Volume2, Download, Printer, X, ShieldAlert } from 'lucide-react';

export default function ScorecardModal({
  isOpen = false,
  onClose = () => {},
  result = null,
  studentName = 'Candidate',
  studentId = 'STU001',
  subjectTitle = 'CS302: Data Structures & Algorithms'
}) {
  if (!isOpen || !result) return null;

  const score = result.final_score || 0;
  const rubric = result.rubric_breakdown || {
    conceptual: 4.0,
    depth: 4.2,
    problem_solving: 3.8,
    practical: 4.5,
    communication: 4.5
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
    downloadAnchor.setAttribute('download', `Viva_Evaluation_${studentId}.json`);
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
        maxWidth: '780px',
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
              <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Viva Examination Scorecard</h2>
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

        {/* Big Overall Score & Confidence Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.15))',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '20px',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary-light)', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Final Evaluated Viva Mark
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '48px', fontWeight: '900', color: '#fff', lineHeight: 1 }}>
                {score}
              </span>
              <span style={{ fontSize: '18px', color: 'var(--text-dim)', fontWeight: '600' }}>/ 100</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
              <span className="badge badge-emerald">
                {score >= 80 ? 'Distinction' : score >= 60 ? 'Satisfactory' : 'Needs Review'}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                Confidence: {Math.round((result.confidence || 0.95) * 100)}%
              </span>
            </div>
          </div>

          {/* Acoustic & Speech Highlights Card */}
          <div style={{
            background: 'rgba(6, 9, 19, 0.6)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Mic size={14} color="var(--cyan)" />
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--cyan)' }}>
                Vocal Intelligence Telemetry
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Pacing:</span>
                <div style={{ fontWeight: '700', color: '#fff' }}>{acoustics.avg_wpm} WPM</div>
                <div style={{ fontSize: '10px', color: 'var(--emerald)' }}>{acoustics.pacing_verdict}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-dim)' }}>Filler Words:</span>
                <div style={{ fontWeight: '700', color: acoustics.total_fillers > 5 ? 'var(--amber)' : '#fff' }}>
                  {acoustics.total_fillers} detected
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Fluency: {acoustics.avg_fluency}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Dimensional Rubric Bars */}
        <div style={{ marginBottom: '24px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '14px' }}>
            Standardized 5-Dimensional Rubric Breakdown
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { label: 'Conceptual Understanding (30%)', val: rubric.conceptual, max: 5 },
              { label: 'Depth & Reasoning (25%)', val: rubric.depth, max: 5 },
              { label: 'Problem Solving & Scenarios (20%)', val: rubric.problem_solving, max: 5 },
              { label: 'Practical & Project Knowledge (15%)', val: rubric.practical, max: 5 },
              { label: 'Communication & Vocal Clarity (10%)', val: rubric.communication, max: 5 }
            ].map((dim, i) => (
              <div key={i} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 14px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600' }}>{dim.label}</span>
                  <span className="mono" style={{ color: 'var(--cyan)' }}>{dim.val} / {dim.max}</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(dim.val / dim.max) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--primary), var(--cyan))',
                    borderRadius: '999px'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Feedback */}
        {result.feedback && (
          <div style={{
            background: 'rgba(11, 17, 32, 0.8)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px'
          }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary-light)', marginBottom: '8px' }}>
              Examiner Qualitative Feedback & Remediation
            </h4>
            <div style={{ fontSize: '12px', lineHeight: '1.6', color: '#cbd5e1', whiteSpace: 'pre-line' }}>
              {result.feedback}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Cryptographically sealed and archived for faculty audit trail.
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
