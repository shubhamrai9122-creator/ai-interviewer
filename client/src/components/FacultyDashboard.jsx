import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, CheckCircle, AlertTriangle, Play, Pause, RotateCcw, 
  Award, ShieldAlert, FileText, Check, X, Download, Sliders, Sparkles, MessageSquare,
  Volume2, Code2, GitBranch, Clock, PlusCircle, CornerDownRight
} from 'lucide-react';
import ResumeQuestionGeneratorModal from './ResumeQuestionGeneratorModal';

const API_BASE = 'http://localhost:8000';

export default function FacultyDashboard() {
  const [sessions, setSessions] = useState([]);
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);

  // Faculty Override form
  const [newScore, setNewScore] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  // Question bank & tree tab
  const [activeSubTab, setActiveSubTab] = useState('sessions'); // 'sessions', 'bank', 'calibration'
  const [vivaDetails, setVivaDetails] = useState(null);
  const [generatingAiQ, setGeneratingAiQ] = useState(false);
  const [calibrationData, setCalibrationData] = useState(null);

  // Exam Duration state (Admin/Faculty configured)
  const [selectedDuration, setSelectedDuration] = useState(15);
  const [durationSaving, setDurationSaving] = useState(false);
  const [durationMessage, setDurationMessage] = useState('');

  // Add Tree Node modal state
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [nodeForm, setNodeForm] = useState({
    topic_id: 1,
    parent_question_id: null,
    branch_condition: 'ROOT',
    tree_depth: 0,
    is_terminal: false,
    question_text: '',
    difficulty: 3,
    question_type: 'CONCEPT',
    expected_concepts: '',
    answer_key: ''
  });
  const [addingNode, setAddingNode] = useState(false);

  // Audio player ref
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Fetch session list
  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/faculty/sessions?flagged_only=${filterFlagged}`);
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  // Fetch Viva details (for question bank)
  const loadVivaDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vivas/42`);
      const data = await res.json();
      setVivaDetails(data);
      if (data && data.duration_minutes !== undefined) {
        setSelectedDuration(data.duration_minutes);
      }
    } catch (err) {
      console.error('Failed to load viva details:', err);
    }
  };

  // Update Exam Duration
  const handleUpdateDuration = async (minutes) => {
    setDurationSaving(true);
    setDurationMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/vivas/42/duration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_minutes: minutes })
      });
      const data = await res.json();
      setSelectedDuration(minutes);
      setDurationMessage(data.message || `Exam duration set to ${minutes === 0 ? 'Unlimited' : `${minutes}m`}`);
      loadVivaDetails();
    } catch (err) {
      alert('Failed to update duration: ' + err.message);
    } finally {
      setDurationSaving(false);
    }
  };

  // Add question tree node in advance
  const handleCreateTreeNode = async (e) => {
    e.preventDefault();
    if (!nodeForm.question_text.trim()) {
      alert('Question text is required.');
      return;
    }
    setAddingNode(true);
    try {
      const concepts = nodeForm.expected_concepts
        .split(',')
        .map(c => c.trim())
        .filter(Boolean);

      const payload = {
        viva_id: 42,
        topic_id: parseInt(nodeForm.topic_id),
        parent_question_id: nodeForm.parent_question_id ? parseInt(nodeForm.parent_question_id) : null,
        branch_condition: nodeForm.branch_condition,
        tree_depth: parseInt(nodeForm.tree_depth),
        is_terminal: Boolean(nodeForm.is_terminal),
        question_text: nodeForm.question_text.trim(),
        difficulty: parseInt(nodeForm.difficulty),
        question_type: nodeForm.question_type,
        expected_concepts: concepts,
        answer_key: nodeForm.answer_key.trim()
      };

      const res = await fetch(`${API_BASE}/api/questions/tree-node`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsAddNodeOpen(false);
        setNodeForm({
          topic_id: 1,
          parent_question_id: null,
          branch_condition: 'ROOT',
          tree_depth: 0,
          is_terminal: false,
          question_text: '',
          difficulty: 3,
          question_type: 'CONCEPT',
          expected_concepts: '',
          answer_key: ''
        });
        loadVivaDetails();
      } else {
        const errData = await res.json();
        alert('Failed to add question node: ' + (errData.detail || 'Error'));
      }
    } catch (err) {
      alert('Error creating question node: ' + err.message);
    } finally {
      setAddingNode(false);
    }
  };

  // Fetch Calibration data
  const loadCalibration = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/faculty/calibration`);
      const data = await res.json();
      setCalibrationData(data);
    } catch (err) {
      console.error('Failed to load calibration:', err);
    }
  };

  useEffect(() => {
    loadSessions();
    loadVivaDetails();
    loadCalibration();
  }, [filterFlagged]);

  // Load audit data when a session is selected
  const handleSelectSession = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setLoadingAudit(true);
    setOverrideSuccess(false);
    try {
      const res = await fetch(`${API_BASE}/api/faculty/sessions/${sessionId}`);
      const data = await res.json();
      setAuditData(data);
      setNewScore(data.session.final_score || '');
      setOverrideReason('');
    } catch (err) {
      console.error('Failed to load audit data:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Seek audio player to exact timestamp
  const seekTo = (sec) => {
    if (audioRef.current) {
      audioRef.current.currentTime = sec;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Submit faculty override
  const handleSaveOverride = async () => {
    if (!overrideReason.trim()) {
      alert('Faculty override requires a mandatory justification reason for the audit trail.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/faculty/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: selectedSessionId,
          faculty_id: 'FAC_SHARMA',
          faculty_name: 'Dr. Arvind Sharma',
          new_score: parseFloat(newScore),
          reason: overrideReason
        })
      });
      const data = await res.json();
      setOverrideSuccess(true);
      loadSessions();
      handleSelectSession(selectedSessionId);
    } catch (err) {
      alert('Failed to save override: ' + err.message);
    }
  };

  // AI question generation
  const handleGenerateQuestions = async () => {
    setGeneratingAiQ(true);
    try {
      await fetch(`${API_BASE}/api/vivas/42/generate-questions`, { method: 'POST' });
      loadVivaDetails();
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAiQ(false);
    }
  };

  // Approve / Reject question
  const handleApproveQuestion = async (qid, approve) => {
    try {
      await fetch(`${API_BASE}/api/vivas/questions/${qid}/approve?approve=${approve}`, { method: 'POST' });
      loadVivaDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const formatSec = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '24px auto', padding: '0 24px' }}>
      {/* Faculty Header & Key Metrics */}
      <div className="glass-panel" style={{ padding: '24px 32px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '800' }}>
              Faculty Examination & Audit Dashboard
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Cohort Review for CS302: Data Structures & Algorithms (350 Students)
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href={`${API_BASE}/api/faculty/export`}
              download
              className="btn btn-secondary"
              style={{ fontSize: '13px' }}
            >
              <Download size={15} />
              Export Cohort CSV
            </a>
          </div>
        </div>

        {/* 5 High-Level Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          <div style={{ background: 'rgba(11, 17, 32, 0.7)', padding: '16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total Cohort</div>
            <div style={{ fontSize: '24px', fontWeight: '800' }}>350</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MSOT Enrolled</div>
          </div>

          <div style={{ background: 'rgba(11, 17, 32, 0.7)', padding: '16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--emerald)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Completed Vivas</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--emerald)' }}>318</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>90.8% Submissions</div>
          </div>

          <div style={{ background: 'rgba(11, 17, 32, 0.7)', padding: '16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--rose)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Flagged For Review</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--rose)' }}>14</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Integrity & Confidence</div>
          </div>

          <div style={{ background: 'rgba(11, 17, 32, 0.7)', padding: '16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--cyan)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Cohort Avg Score</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--cyan)' }}>74.2<span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>/100</span></div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SD = 9.4 pts</div>
          </div>

          <div style={{ background: 'rgba(11, 17, 32, 0.7)', padding: '16px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--amber)' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>p95 Response Latency</div>
            <div className="mono" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--amber)' }}>1.6s</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target &lt;2.5s Passed</div>
          </div>
        </div>
      </div>

      {/* Faculty / Admin Controls: Exam Duration & Policy */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'rgba(99, 102, 241, 0.06)',
        border: '1px solid rgba(99, 102, 241, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Clock size={20} color="var(--primary-light)" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
              Faculty / Admin Exam Duration Control
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Configure viva duration for the cohort or choose <strong>Unlimited Mode</strong> so AI asks as many questions as needed across topic trees.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { label: '5 Min', value: 5 },
            { label: '10 Min', value: 10 },
            { label: '15 Min', value: 15 },
            { label: '30 Min', value: 30 },
            { label: '45 Min', value: 45 },
            { label: '60 Min', value: 60 },
            { label: '♾️ Unlimited', value: 0 }
          ].map(opt => (
            <button
              key={opt.value}
              disabled={durationSaving}
              onClick={() => handleUpdateDuration(opt.value)}
              className={`btn ${selectedDuration === opt.value ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '8px',
                fontWeight: selectedDuration === opt.value ? '700' : '500'
              }}
            >
              {opt.label}
            </button>
          ))}
          {durationMessage && (
            <span style={{ fontSize: '12px', color: 'var(--emerald)', marginLeft: '8px' }}>
              ✓ {durationMessage}
            </span>
          )}
        </div>
      </div>

      {/* Sub-tabs: Student Vivas, Question Bank, Calibration */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveSubTab('sessions')}
          className={`btn ${activeSubTab === 'sessions' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          <Users size={16} />
          Student Vivas List & Audit
        </button>

        <button
          onClick={() => setActiveSubTab('bank')}
          className={`btn ${activeSubTab === 'bank' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          <FileText size={16} />
          Question Bank Management
        </button>

        <button
          onClick={() => setActiveSubTab('calibration')}
          className={`btn ${activeSubTab === 'calibration' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ fontSize: '13px', padding: '8px 16px' }}
        >
          <Sliders size={16} />
          AI vs Human Calibration
        </button>
      </div>

      {/* SUBTAB 1: Student Vivas List & Audit View */}
      {activeSubTab === 'sessions' && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedSessionId ? '1fr 1.6fr' : '1fr', gap: '24px' }}>
          {/* Left Table: Vivas List */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Student Submissions</h3>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filterFlagged}
                  onChange={e => setFilterFlagged(e.target.checked)}
                />
                Flagged for Review Only
              </label>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {sessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: selectedSessionId === s.id ? 'rgba(99, 102, 241, 0.18)' : 'rgba(11, 17, 32, 0.6)',
                    border: `1px solid ${selectedSessionId === s.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700', fontSize: '14px' }}>{s.student_name}</span>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--cyan)' }}>{s.student_id}</span>
                      {s.flagged_for_review && (
                        <span className="badge badge-rose" style={{ fontSize: '10px' }}>Flagged</span>
                      )}
                      {s.has_override && (
                        <span className="badge badge-amber" style={{ fontSize: '10px' }}>Overridden</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Duration: {Math.round(s.elapsed_seconds / 60)}m | Confidence: {Math.round((s.confidence || 0.9) * 100)}%
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: (s.final_score || 0) >= 75 ? 'var(--emerald)' : (s.final_score || 0) >= 50 ? 'var(--amber)' : 'var(--rose)' }}>
                      {s.final_score ?? '--'}<span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>/100</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--primary-light)' }}>
                      Audit Details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Detailed Audit Console */}
          {selectedSessionId && auditData && (
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Header with audio player */}
              <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '800' }}>
                      Viva Audit: {auditData.session.student_name} ({auditData.session.student_id})
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Final Recorded Mark: <strong style={{ color: 'var(--emerald)', fontSize: '14px' }}>{auditData.session.final_score}/100</strong> | AI Confidence: {Math.round(auditData.session.confidence * 100)}%
                    </div>
                  </div>
                  <button onClick={() => setSelectedSessionId(null)} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                    Close
                  </button>
                </div>

                {/* Audio Player */}
                <div style={{ background: 'rgba(6, 9, 19, 0.8)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Recorded Oral Audio Feed</span>
                    <span className="mono">00:00 / 15:00</span>
                  </div>
                  <audio
                    ref={audioRef}
                    controls
                    src={`${API_BASE}${auditData.session.audio_url}`}
                    style={{ width: '100%', height: '36px' }}
                    onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--cyan)', marginTop: '4px' }}>
                    Tip: Click any timestamp in the transcript below to jump audio to that exact moment.
                  </div>
                </div>
              </div>

              {/* Integrity Alerts if any */}
              {auditData.integrity_logs.length > 0 && (
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--rose)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <ShieldAlert size={16} />
                    Integrity Incidents Detected ({auditData.integrity_logs.length})
                  </h4>
                  {auditData.integrity_logs.map((log, i) => (
                    <div key={i} style={{ fontSize: '12px', color: '#fecdd3' }}>
                      • <strong>[{formatSec(log.timestamp_sec)}] {log.event_type}:</strong> {log.details}
                    </div>
                  ))}
                </div>
              )}

              {/* Standardized 5-Dimensional Rubric Breakdown */}
              {auditData.score && (
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Award size={16} color="var(--primary-light)" />
                    Standardized 5-Dimensional Rubric Scorecard
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Conceptual', weight: '30%', val: auditData.score.conceptual, max: 5 },
                      { label: 'Depth & "Why"', weight: '25%', val: auditData.score.depth, max: 5 },
                      { label: 'Problem Solving', weight: '20%', val: auditData.score.problem_solving, max: 5 },
                      { label: 'Practical', weight: '15%', val: auditData.score.practical, max: 5 },
                      { label: 'Communication', weight: '10%', val: auditData.score.communication, max: 5 },
                    ].map((dim, i) => (
                      <div key={i} style={{ background: 'rgba(11, 17, 32, 0.7)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{dim.label}</div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '4px 0' }}>
                          {dim.val}<span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>/5</span>
                        </div>
                        <span className="badge badge-blue" style={{ fontSize: '9px', padding: '1px 6px' }}>
                          {dim.weight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence Citations linked to Transcript */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={16} color="var(--cyan)" />
                  Evidence Citations (Audit Trail)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {auditData.evidence.map((ev, i) => (
                    <div key={i} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '12px', color: 'var(--cyan)' }}>{ev.dimension} ({ev.dimension_score}/5)</strong>
                        <button
                          onClick={() => seekTo(ev.transcript_start)}
                          className="btn btn-secondary mono"
                          style={{ fontSize: '10px', padding: '2px 8px' }}
                        >
                          ▶ Jump to {formatSec(ev.transcript_start)} - {formatSec(ev.transcript_end)}
                        </button>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{ev.reason}</p>
                      {ev.quote && (
                        <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#cbd5e1', borderLeft: '2px solid var(--cyan)', paddingLeft: '8px' }}>
                          "{ev.quote}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Timestamped Transcript Feed (Clickable) */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px' }}>
                  Full Timestamped Transcript
                </h4>
                <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '6px' }}>
                  {auditData.timeline.map((item, idx) => (
                    <div key={idx} style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: item.speaker === 'AI Examiner' ? 'rgba(99, 102, 241, 0.06)' : 'rgba(6, 182, 212, 0.06)',
                      borderLeft: `3px solid ${item.speaker === 'AI Examiner' ? 'var(--primary)' : 'var(--cyan)'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: item.speaker === 'AI Examiner' ? 'var(--primary-light)' : 'var(--cyan)' }}>
                          {item.speaker}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {item.audio_chunk_url && (
                            <button
                              onClick={() => {
                                const a = new Audio(API_BASE + item.audio_chunk_url);
                                a.play();
                              }}
                              className="btn btn-secondary mono"
                              style={{ fontSize: '10px', padding: '2px 6px', height: '22px' }}
                              title="Play isolated student audio snippet"
                            >
                              <Volume2 size={11} color="var(--emerald)" />
                              Play Spoken Clip
                            </button>
                          )}
                          <button
                            onClick={() => seekTo(item.timestamp_sec)}
                            className="mono"
                            style={{
                              background: 'transparent', border: 'none', color: 'var(--cyan)',
                              cursor: 'pointer', fontSize: '11px', textDecoration: 'underline'
                            }}
                          >
                            [{formatSec(item.timestamp_sec)}]
                          </button>
                        </div>
                      </div>
                      <p style={{ fontSize: '12px', color: '#e2e8f0', lineHeight: '1.4' }}>{item.text}</p>
                      {item.code_snippet && (
                        <div style={{
                          marginTop: '6px',
                          background: 'rgba(0, 0, 0, 0.5)',
                          padding: '8px',
                          borderRadius: '6px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: '#38bdf8',
                          overflowX: 'auto',
                          whiteSpace: 'pre-wrap'
                        }}>
                          <div style={{ color: 'var(--text-dim)', fontSize: '10px', marginBottom: '2px' }}>Student Submitted Code:</div>
                          {item.code_snippet}
                        </div>
                      )}
                      {item.wpm && (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '10px', color: 'var(--text-dim)' }}>
                          <span>⚡ {item.wpm} WPM</span>
                          <span>• Fillers: {Object.values(item.filler_words || {}).reduce((a, b) => a + b, 0)}</span>
                          <span>• Fluency: {item.fluency_score}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Faculty Override Section */}
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: 'var(--primary-light)' }}>
                  Faculty Score Override (Permanent Audit Trail)
                </h4>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  AI mark is preserved in the database. Overriding records your faculty ID, previous score, new score, and required rationale.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>New Score (/100)</label>
                    <input
                      type="number"
                      className="input-field mono"
                      value={newScore}
                      onChange={e => setNewScore(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>Override Justification (Required)</label>
                    <input
                      className="input-field"
                      placeholder="e.g. Verified student clarified dynamic resizing at 06:12 despite microphone hiss."
                      value={overrideReason}
                      onChange={e => setOverrideReason(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {overrideSuccess && (
                    <span style={{ fontSize: '12px', color: 'var(--emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Override successfully recorded in audit log.
                    </span>
                  )}
                  <button onClick={handleSaveOverride} className="btn btn-primary" style={{ fontSize: '12px', marginLeft: 'auto' }}>
                    Save Faculty Override
                  </button>
                </div>

                {/* Override History if present */}
                {auditData.overrides.length > 0 && (
                  <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--amber)' }}>Override Log:</div>
                    {auditData.overrides.map((ov, i) => (
                      <div key={i} style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                        • By <strong>{ov.faculty_name}</strong>: Changed {ov.old_score} → {ov.new_score} | Reason: "{ov.reason}"
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: Question Bank Manager & Topic Tree Structure */}
      {activeSubTab === 'bank' && vivaDetails && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitBranch size={22} color="var(--primary-light)" />
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Faculty Topic Question Trees</h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {vivaDetails.subject} • Faculty provides advance questions structured as branching decision trees (Root ➔ Deep Probe / Hint ➔ Terminal Stop).
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  setNodeForm({
                    topic_id: vivaDetails.topics?.[0]?.id || 1,
                    parent_question_id: null,
                    branch_condition: 'ROOT',
                    tree_depth: 0,
                    is_terminal: false,
                    question_text: '',
                    difficulty: 3,
                    question_type: 'CONCEPT',
                    expected_concepts: '',
                    answer_key: ''
                  });
                  setIsAddNodeOpen(true);
                }}
                className="btn btn-primary"
                style={{ fontSize: '13px', background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
              >
                <PlusCircle size={15} />
                Add Advance Tree Node
              </button>

              <button
                onClick={() => setIsResumeModalOpen(true)}
                className="btn btn-secondary"
                style={{ fontSize: '13px' }}
              >
                <FileText size={15} color="var(--cyan)" />
                Resume / JD Synthesizer
              </button>

              <button
                onClick={handleGenerateQuestions}
                disabled={generatingAiQ}
                className="btn btn-secondary"
                style={{ fontSize: '13px' }}
              >
                <Sparkles size={15} />
                {generatingAiQ ? 'Generating...' : 'AI Generate Nodes'}
              </button>
            </div>
          </div>

          {/* Render Topics with Trees */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {(vivaDetails.topics || []).map(topic => {
              const topicQuestions = (vivaDetails.questions || []).filter(q => q.topic_id === topic.id);
              const rootQuestions = topicQuestions.filter(q => !q.parent_question_id || q.branch_condition === 'ROOT');

              return (
                <div
                  key={topic.id}
                  style={{
                    background: 'rgba(11, 17, 32, 0.7)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge badge-purple" style={{ fontSize: '12px' }}>Topic {topic.id}</span>
                      <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff', margin: 0 }}>{topic.name}</h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="badge badge-blue">Weight: {Math.round(topic.weight * 100)}%</span>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        {topicQuestions.length} Questions in Tree
                      </span>
                    </div>
                  </div>

                  {rootQuestions.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No root questions configured for this topic yet. Click "Add Advance Tree Node" to create one.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {rootQuestions.map(rootQ => {
                        const childNodes = topicQuestions.filter(c => c.parent_question_id === rootQ.id);

                        return (
                          <div
                            key={rootQ.id}
                            style={{
                              background: 'rgba(255, 255, 255, 0.02)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              borderRadius: 'var(--radius-md)',
                              padding: '16px'
                            }}
                          >
                            {/* Root Node Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <span className="badge badge-blue">🌲 ROOT (Depth 0)</span>
                                  <span className="badge badge-purple">{rootQ.question_type}</span>
                                  <span className="badge badge-cyan">Diff: {rootQ.difficulty}/5</span>
                                  <span className={`badge ${rootQ.status === 'APPROVED' ? 'badge-emerald' : 'badge-amber'}`}>
                                    {rootQ.status}
                                  </span>
                                </div>
                                <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#fff', margin: '4px 0 6px 0' }}>
                                  {rootQ.question_text}
                                </h4>
                                <div style={{ fontSize: '12px', color: 'var(--cyan)' }}>
                                  Expected Concepts: {rootQ.expected_concepts?.join(', ') || 'N/A'}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setNodeForm({
                                    topic_id: topic.id,
                                    parent_question_id: rootQ.id,
                                    branch_condition: 'CORRECT',
                                    tree_depth: 1,
                                    is_terminal: false,
                                    question_text: '',
                                    difficulty: Math.min(5, rootQ.difficulty + 1),
                                    question_type: 'WHY',
                                    expected_concepts: '',
                                    answer_key: ''
                                  });
                                  setIsAddNodeOpen(true);
                                }}
                                className="btn btn-secondary"
                                style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}
                              >
                                + Add Branch
                              </button>
                            </div>

                            {/* Child Branches */}
                            {childNodes.length > 0 && (
                              <div style={{ marginTop: '14px', paddingLeft: '16px', borderLeft: '2px dashed rgba(99, 102, 241, 0.4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {childNodes.map(childQ => {
                                  const grandChildren = topicQuestions.filter(gc => gc.parent_question_id === childQ.id);

                                  return (
                                    <div key={childQ.id} style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '8px', padding: '12px 14px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            <CornerDownRight size={14} color="var(--primary-light)" />
                                            <span className={`badge ${childQ.branch_condition === 'PARTIAL' ? 'badge-amber' : 'badge-emerald'}`}>
                                              Branch: IF {childQ.branch_condition}
                                            </span>
                                            <span className="badge badge-purple">{childQ.question_type}</span>
                                            {childQ.is_terminal && (
                                              <span className="badge badge-rose">🛑 Terminal Leaf (Topic Concludes)</span>
                                            )}
                                          </div>
                                          <div style={{ fontSize: '13.5px', fontWeight: '500', color: '#e2e8f0', margin: '4px 0' }}>
                                            {childQ.question_text}
                                          </div>
                                          <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                                            Concepts: {childQ.expected_concepts?.join(', ')}
                                          </div>
                                        </div>

                                        {!childQ.is_terminal && (
                                          <button
                                            onClick={() => {
                                              setNodeForm({
                                                topic_id: topic.id,
                                                parent_question_id: childQ.id,
                                                branch_condition: 'STRONG',
                                                tree_depth: 2,
                                                is_terminal: true,
                                                question_text: '',
                                                difficulty: 4,
                                                question_type: 'APPLIED',
                                                expected_concepts: '',
                                                answer_key: ''
                                              });
                                              setIsAddNodeOpen(true);
                                            }}
                                            className="btn btn-secondary"
                                            style={{ fontSize: '10px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                                          >
                                            + Add Follow-up
                                          </button>
                                        )}
                                      </div>

                                      {/* Grandchildren / Depth 2 Nodes */}
                                      {grandChildren.length > 0 && (
                                        <div style={{ marginTop: '10px', paddingLeft: '14px', borderLeft: '2px dotted rgba(6, 182, 212, 0.4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                          {grandChildren.map(gc => (
                                            <div key={gc.id} style={{ background: 'rgba(255, 255, 255, 0.02)', borderRadius: '6px', padding: '10px' }}>
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                                <CornerDownRight size={12} color="var(--cyan)" />
                                                <span className="badge badge-cyan">Depth 2: IF {gc.branch_condition}</span>
                                                {gc.is_terminal && (
                                                  <span className="badge badge-rose">🛑 Terminal Stop Node</span>
                                                )}
                                              </div>
                                              <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                                                {gc.question_text}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: Calibration & Fairness */}
      {activeSubTab === 'calibration' && calibrationData && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>
            AI vs Faculty Calibration & Fairness Analysis
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Statistical comparison between automated AI scores and human faculty overrides across sample vivas.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
            <div style={{ background: 'rgba(11, 17, 32, 0.7)', padding: '18px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--emerald)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Correlation Coefficient (r)</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--emerald)' }}>
                {calibrationData.correlation_coefficient}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>High positive alignment</div>
            </div>

            <div style={{ background: 'rgba(11, 17, 32, 0.7)', padding: '18px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--cyan)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Mean Absolute Error (MAE)</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--cyan)' }}>
                ±{calibrationData.mean_absolute_error} pts
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Under 5% margin threshold</div>
            </div>

            <div style={{ background: 'rgba(11, 17, 32, 0.7)', padding: '18px', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--purple)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Language & Accent Fairness</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--purple)' }}>PASS</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Hinglish normalized fairly</div>
            </div>
          </div>

          <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
            Recent Human vs AI Marks Calibration Pairs
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {calibrationData.calibration_pairs.map((p, i) => (
              <div key={i} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 18px', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '13px' }}>{p.student_name} ({p.student_id})</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>"{p.reason}"</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontSize: '13px' }}>
                    AI: {p.ai_score} ➔ Faculty: <strong>{p.faculty_score}</strong>
                  </span>
                  <div style={{ fontSize: '11px', color: p.diff > 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                    Δ {p.diff > 0 ? `+${p.diff}` : p.diff} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Advance Tree Node (Root, Branch, or Terminal Hint) */}
      {isAddNodeOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '640px',
            width: '100%',
            padding: '28px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <GitBranch size={20} color="var(--primary-light)" />
                <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Add Advance Question to Topic Tree</h3>
              </div>
              <button
                onClick={() => setIsAddNodeOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '4px', borderRadius: '50%', width: '28px', height: '28px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTreeNode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Select Topic
                  </label>
                  <select
                    className="input-field"
                    value={nodeForm.topic_id}
                    onChange={e => setNodeForm({ ...nodeForm, topic_id: parseInt(e.target.value) })}
                  >
                    {(vivaDetails?.topics || []).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Branch Trigger Condition
                  </label>
                  <select
                    className="input-field"
                    value={nodeForm.branch_condition}
                    onChange={e => setNodeForm({ ...nodeForm, branch_condition: e.target.value })}
                  >
                    <option value="ROOT">ROOT (Initial Question for Topic)</option>
                    <option value="CORRECT">IF CORRECT (Follow-up Probe)</option>
                    <option value="STRONG">IF STRONG (Advanced Depth Probe)</option>
                    <option value="PARTIAL">IF PARTIAL / STRUGGLING (Socratic Hint)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Parent Question in Tree (Optional)
                </label>
                <select
                  className="input-field"
                  value={nodeForm.parent_question_id || ''}
                  onChange={e => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    const parent = vivaDetails?.questions?.find(q => q.id === val);
                    setNodeForm({
                      ...nodeForm,
                      parent_question_id: val,
                      tree_depth: parent ? (parent.tree_depth || 0) + 1 : 0
                    });
                  }}
                >
                  <option value="">None (Top-Level Root Question)</option>
                  {(vivaDetails?.questions || [])
                    .filter(q => q.topic_id === parseInt(nodeForm.topic_id))
                    .map(q => (
                      <option key={q.id} value={q.id}>
                        [{q.branch_condition}] {q.question_text.slice(0, 70)}...
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Advance Question Text *
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="e.g. How does AVL tree rebalancing guarantee O(log N) lookup time during consecutive insertions?"
                  value={nodeForm.question_text}
                  onChange={e => setNodeForm({ ...nodeForm, question_text: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Question Type
                  </label>
                  <select
                    className="input-field"
                    value={nodeForm.question_type}
                    onChange={e => setNodeForm({ ...nodeForm, question_type: e.target.value })}
                  >
                    <option value="CONCEPT">CONCEPT (Fundamentals)</option>
                    <option value="WHY">WHY (Depth & Invariance)</option>
                    <option value="TRADE_OFF">TRADE_OFF (Architectural Choice)</option>
                    <option value="APPLIED">APPLIED (Design / Implementation)</option>
                    <option value="DEBUGGING">DEBUGGING (Failure Analysis)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Difficulty Level (1 to 5)
                  </label>
                  <select
                    className="input-field"
                    value={nodeForm.difficulty}
                    onChange={e => setNodeForm({ ...nodeForm, difficulty: parseInt(e.target.value) })}
                  >
                    <option value={1}>1 - Beginner</option>
                    <option value={2}>2 - Intermediate</option>
                    <option value={3}>3 - Standard Technical</option>
                    <option value={4}>4 - Advanced / Edge Probing</option>
                    <option value={5}>5 - Mastery / FAANG Bar</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                  Expected Concepts (comma-separated keywords)
                </label>
                <input
                  className="input-field"
                  placeholder="e.g. balance factor, tree rotations, logarithmic height, monotonicity"
                  value={nodeForm.expected_concepts}
                  onChange={e => setNodeForm({ ...nodeForm, expected_concepts: e.target.value })}
                />
              </div>

              {/* Terminal Leaf Checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                background: 'rgba(244, 63, 94, 0.08)',
                border: '1px solid rgba(244, 63, 94, 0.25)',
                borderRadius: 'var(--radius-md)'
              }}>
                <input
                  type="checkbox"
                  id="terminal"
                  checked={nodeForm.is_terminal}
                  onChange={e => setNodeForm({ ...nodeForm, is_terminal: e.target.checked })}
                  style={{ width: '18px', height: '18px', accentColor: '#f43f5e', cursor: 'pointer' }}
                />
                <label htmlFor="terminal" style={{ fontSize: '12px', cursor: 'pointer', color: '#fca5a5' }}>
                  <strong>Terminal Stop Node:</strong> When candidate answers this question, stop this topic tree and smoothly transition to the next topic.
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddNodeOpen(false)}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingNode}
                  className="btn btn-primary"
                  style={{ fontSize: '13px', background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
                >
                  {addingNode ? 'Saving Node...' : 'Add to Question Tree'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Resume & Job Description Question Generator Modal */}
      <ResumeQuestionGeneratorModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onQuestionsApplied={() => {
          loadVivaDetails();
        }}
      />
    </div>
  );
}
