import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, CheckCircle, AlertTriangle, Play, Pause, RotateCcw, 
  Award, ShieldAlert, FileText, Check, X, Download, Sliders, Sparkles, MessageSquare,
  Volume2, Code2, GitBranch, Clock, PlusCircle, CornerDownRight, Upload, Layers, Settings, Trash2
} from 'lucide-react';
import VoiceSettingsModal from './VoiceSettingsModal';

const API_BASE = 'http://localhost:8000';

export default function FacultyDashboard() {
  const [activeSubTab, setActiveSubTab] = useState('trees'); // 'trees', 'sessions', 'calibration'
  const [selectedSubject, setSelectedSubject] = useState('dsa'); // 'dsa' or 'webdev'
  
  // Syllabus upload & tree state
  const [syllabusText, setSyllabusText] = useState('');
  const [isUploadingSyllabus, setIsUploadingSyllabus] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
  const [vivaDetails, setVivaDetails] = useState(null);

  // Sessions & audit state
  const [sessions, setSessions] = useState([]);
  const [filterFlagged, setFilterFlagged] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Faculty Override form
  const [newScore, setNewScore] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  // Calibration state
  const [calibrationData, setCalibrationData] = useState(null);

  // Exam Duration state (Admin/Faculty configured)
  const [selectedDuration, setSelectedDuration] = useState(15);
  // Admin Voice Settings modal state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('grok_sweet');
  const [speechRate, setSpeechRate] = useState(0.98);
  // Audio player ref
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const currentVivaId = selectedSubject === 'webdev' ? 43 : 42;

  // Load Viva details & question trees
  const loadVivaDetails = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/vivas/${currentVivaId}`);
      const data = await res.json();
      setVivaDetails(data);
      if (data && data.duration_minutes !== undefined) {
        setSelectedDuration(data.duration_minutes || 15);
      }
    } catch (err) {
      console.error('Failed to load viva details:', err);
    }
  };

  // Load Sessions
  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/faculty/sessions?viva_id=${currentVivaId}&flagged_only=${filterFlagged}`);
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  // Load Calibration
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
    loadVivaDetails();
    loadSessions();
    loadCalibration();
  }, [selectedSubject, filterFlagged]);

  // Handle Syllabus Upload to Question Tree
  const handleUploadSyllabus = async () => {
    if (!syllabusText.trim()) {
      alert('Please paste or type syllabus topics or upload a document.');
      return;
    }
    setIsUploadingSyllabus(true);
    setUploadSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/faculty/syllabus-to-tree`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viva_id: currentVivaId,
          subject: selectedSubject === 'webdev' ? 'Web Development' : 'Data Structures & Algorithms',
          difficulty: 'Medium',
          duration_minutes: selectedDuration || 15,
          syllabus_text: syllabusText
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUploadSuccessMessage(data.message || 'Successfully created adaptive Question Trees!');
        setSyllabusText('');
        loadVivaDetails();
      } else {
        alert('Failed to generate question trees: ' + (data.detail || 'Error'));
      }
    } catch (err) {
      alert('Error parsing syllabus: ' + err.message);
    } finally {
      setIsUploadingSyllabus(false);
    }
  };

  // Handle File Input (.txt, .md, .csv, .json)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setSyllabusText(event.target.result);
    };
    reader.readAsText(file);
  };

  // Select session for audit
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

  // Delete student viva record
  const handleDeleteSession = async (sessionId, studentName, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to delete the viva examination record for "${studentName}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/faculty/sessions/${sessionId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        if (selectedSessionId === sessionId) {
          setSelectedSessionId(null);
          setAuditData(null);
        }
        await loadSessions();
        await loadCalibration();
      } else {
        alert('Failed to delete session: ' + (data.detail || 'Error'));
      }
    } catch (err) {
      alert('Error deleting session: ' + err.message);
    }
  };

  // Seek audio
  const seekTo = (sec) => {
    if (audioRef.current) {
      audioRef.current.currentTime = sec;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Save Faculty Override
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
          reason: overrideReason.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setOverrideSuccess(true);
        handleSelectSession(selectedSessionId);
        loadSessions();
        loadCalibration();
      } else {
        alert('Failed to apply override: ' + (data.detail || 'Error'));
      }
    } catch (err) {
      alert('Error saving override: ' + err.message);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    window.open(`${API_BASE}/api/faculty/export`, '_blank');
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '32px auto', padding: '0 28px' }}>
      {/* Faculty Command Header */}
      <div className="glass-panel" style={{ padding: '28px 36px', marginBottom: '24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="eyebrow" style={{ fontSize: '0.7rem' }}>
                EXAMINER CONTROL CENTER
              </span>
              <span className="badge badge-dark" style={{ fontSize: '9px' }}>
                DSA & WEB DEV ONLY
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 800, marginTop: '2px' }} className="sheen-text">
              Faculty Command Center & Audit Suite
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
              Syllabus-to-Tree Synthesizer • Audio & Transcript Audit • Mark Overrides • Inter-Rater Calibration
            </p>
          </div>

          {/* Subject Switcher & CSV Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: '#F1F5F9', padding: '4px', borderRadius: '999px', border: '1px solid var(--rule)' }}>
              <button
                onClick={() => setSelectedSubject('dsa')}
                className={`btn ${selectedSubject === 'dsa' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '11px',
                  padding: '6px 14px',
                  background: selectedSubject === 'dsa' ? '#0F172A' : 'transparent',
                  color: selectedSubject === 'dsa' ? '#FFFFFF' : 'var(--ink-secondary)',
                  border: 'none',
                  boxShadow: 'none'
                }}
              >
                DSA (CS302)
              </button>
              <button
                onClick={() => setSelectedSubject('webdev')}
                className={`btn ${selectedSubject === 'webdev' ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '11px',
                  padding: '6px 14px',
                  background: selectedSubject === 'webdev' ? '#0F172A' : 'transparent',
                  color: selectedSubject === 'webdev' ? '#FFFFFF' : 'var(--ink-secondary)',
                  border: 'none',
                  boxShadow: 'none'
                }}
              >
                Web Dev (CS304)
              </button>
            </div>

            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              <Volume2 size={14} color="var(--nebula)" />
              Voice Engine (Admin Only)
            </button>

            <button
              onClick={handleExportCsv}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              <Download size={14} />
              Export to CSV / Sheets
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--rule)', marginTop: '20px', paddingTop: '16px' }}>
          <button
            onClick={() => setActiveSubTab('trees')}
            className={`btn ${activeSubTab === 'trees' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '7px 18px' }}
          >
            <GitBranch size={14} color={activeSubTab === 'trees' ? 'var(--sun)' : 'currentColor'} />
            Syllabus Upload & Question Trees
          </button>

          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`btn ${activeSubTab === 'sessions' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '7px 18px' }}
          >
            <Users size={14} color={activeSubTab === 'sessions' ? 'var(--ice)' : 'currentColor'} />
            Student Vivas & Audit Inspector ({sessions.length})
          </button>

          <button
            onClick={() => setActiveSubTab('calibration')}
            className={`btn ${activeSubTab === 'calibration' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '7px 18px' }}
          >
            <Sliders size={14} color={activeSubTab === 'calibration' ? 'var(--nebula)' : 'currentColor'} />
            Faculty Calibration Mode
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SYLLABUS UPLOAD & QUESTION TREES */}
      {activeSubTab === 'trees' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
          {/* Left Column: Syllabus Document Ingestion */}
          <div>
            <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Upload size={20} color="var(--nebula)" />
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 800 }}>
                  Upload Syllabus or Custom Documents
                </h2>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                Upload your course syllabus, lecture modules, or custom question bank. The AI will extract core concepts and synthesize a <strong>branching topic tree</strong> (Root Question → Follow-up 1 Depth → Follow-up 2 Depth → Socratic Hint).
              </p>

              {/* File upload input */}
              <div style={{
                border: '2px dashed var(--rule)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                textAlign: 'center',
                background: '#F8FAFC',
                marginBottom: '16px'
              }}>
                <FileText size={32} color="var(--muted)" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                <label style={{ cursor: 'pointer', fontWeight: 700, color: 'var(--nebula)', fontSize: '13px' }}>
                  Click to select syllabus file (.txt, .md, .json, .csv)
                  <input
                    type="file"
                    accept=".txt,.md,.json,.csv"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                  Supports plain text syllabus or document outlines
                </div>
              </div>

              {/* Textarea for pasting syllabus */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>
                  Or Paste Syllabus Text Directly:
                </label>
                <textarea
                  value={syllabusText}
                  onChange={e => setSyllabusText(e.target.value)}
                  placeholder="Paste syllabus modules (e.g., 'Module 1: React Virtual DOM & Reconciliation. Module 2: Node.js Event Loop Microtasks. Module 3: SQL Clustered Indexes vs Non-Clustered B-Trees...')"
                  rows={6}
                  className="input-field"
                  style={{ fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              {uploadSuccessMessage && (
                <div style={{
                  background: '#ECFDF5',
                  border: '1px solid #10B981',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '12px',
                  color: '#065F46',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <CheckCircle size={15} />
                  {uploadSuccessMessage}
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleUploadSyllabus}
                disabled={isUploadingSyllabus || !syllabusText.trim()}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '14px' }}
              >
                <Sparkles size={16} />
                {isUploadingSyllabus ? 'Synthesizing Question Trees...' : 'Synthesize Adaptive Question Trees'}
              </button>
            </div>
          </div>

          {/* Right Column: Visual Question Tree Explorer */}
          <div>
            <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} color="var(--sun)" />
                  <h3 style={{ fontFamily: 'var(--display)', fontSize: '16px', fontWeight: 800 }}>
                    Active Topic Question Trees
                  </h3>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                  {vivaDetails?.topics?.length || 0} Topics Configured
                </span>
              </div>

              {/* Topics Tree List */}
              <div style={{ maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '4px' }}>
                {vivaDetails?.topics?.map(topic => {
                  const questionsInTopic = vivaDetails?.questions?.filter(q => q.topic_id === topic.id) || [];
                  const rootQ = questionsInTopic.find(q => q.tree_depth === 1 || q.branch_condition === 'ROOT');
                  const depth1Q = questionsInTopic.find(q => q.tree_depth === 2 && q.branch_condition === 'CORRECT');
                  const depth2Q = questionsInTopic.find(q => q.tree_depth === 3 && q.branch_condition === 'STRONG');
                  const hintQ = questionsInTopic.find(q => q.branch_condition === 'PARTIAL');

                  return (
                    <div
                      key={topic.id}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid var(--rule)',
                        borderRadius: 'var(--radius-md)',
                        padding: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink)' }}>
                          🌲 Topic: {topic.name}
                        </span>
                        <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                          Weight: {topic.weight}x
                        </span>
                      </div>

                      {/* Tree Nodes Progression */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                        {/* Root */}
                        <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--nebula)', display: 'block', fontSize: '11px' }}>
                            [Level 1: Root Question]
                          </span>
                          <span style={{ color: 'var(--ink)' }}>
                            {rootQ?.question_text || 'Explain core invariants and operation.'}
                          </span>
                        </div>

                        {/* Branch Depth 1 */}
                        <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)', marginLeft: '12px', borderLeft: '3px solid #10B981' }}>
                          <span style={{ fontWeight: 700, color: '#047857', display: 'block', fontSize: '11px' }}>
                            ↳ If Answer is Solid → [Level 2 Follow-up]
                          </span>
                          <span style={{ color: 'var(--ink)' }}>
                            {depth1Q?.question_text || 'Why does this trade-off behave as expected?'}
                          </span>
                        </div>

                        {/* Branch Depth 2 */}
                        <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)', marginLeft: '24px', borderLeft: '3px solid #6366F1' }}>
                          <span style={{ fontWeight: 700, color: '#4338CA', display: 'block', fontSize: '11px' }}>
                            ↳ If Still Solid → [Level 3 Edge Case & Scale]
                          </span>
                          <span style={{ color: 'var(--ink)' }}>
                            {depth2Q?.question_text || 'Degenerate scale breakdown and production mitigation.'}
                          </span>
                        </div>

                        {/* Hint Branch */}
                        <div style={{ background: '#FFFFFF', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--rule)', marginLeft: '12px', borderLeft: '3px solid #F59E0B' }}>
                          <span style={{ fontWeight: 700, color: '#B45309', display: 'block', fontSize: '11px' }}>
                            ↳ If Struggling / Partial → [Socratic Hint Bridge]
                          </span>
                          <span style={{ color: 'var(--ink-secondary)' }}>
                            {hintQ?.question_text || 'Socratic hint provided without revealing solution.'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: STUDENT VIVAS & AUDIT REVIEW */}
      {activeSubTab === 'sessions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '24px' }}>
          {/* Left Column: Session List */}
          <div>
            <div className="glass-panel" style={{ padding: '20px', background: '#FFFFFF', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink)' }}>
                  Candidate Viva Records
                </span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filterFlagged}
                    onChange={e => setFilterFlagged(e.target.checked)}
                    style={{ accentColor: '#E11D48' }}
                  />
                  <span>Flagged Only</span>
                </label>
              </div>

              {/* Sessions list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '680px', overflowY: 'auto' }}>
                {sessions.map(s => {
                  const isSelected = selectedSessionId === s.session_id;
                  return (
                    <div
                      key={s.session_id}
                      onClick={() => handleSelectSession(s.session_id)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isSelected ? 'var(--nebula)' : 'var(--rule)'}`,
                        background: isSelected ? '#EEF2FF' : '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'var(--shadow-sm)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
                          {s.student_name}
                        </span>
                        <span className="mono" style={{ fontWeight: 800, fontSize: '14px', color: s.final_score >= 70 ? '#059669' : '#DC2626' }}>
                          {s.final_score !== null ? `${s.final_score}/100` : 'In Progress'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="mono">{s.student_id}</span>
                          {s.flagged && (
                            <span className="badge badge-rose" style={{ fontSize: '9px', padding: '1px 6px' }}>
                              <ShieldAlert size={10} /> Flagged
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSession(s.session_id, s.student_name, e)}
                          title="Delete Candidate Record"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Audit Inspector */}
          <div>
            {loadingAudit ? (
              <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', background: '#FFFFFF' }}>
                <Clock size={32} color="var(--nebula)" style={{ margin: '0 auto 12px auto' }} />
                <h3>Loading auditable logs...</h3>
              </div>
            ) : auditData ? (
              <div className="glass-panel" style={{ padding: '28px', background: '#FFFFFF' }}>
                {/* Audit Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--rule)', paddingBottom: '16px' }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                      Audit Log: {auditData.session.student_name} ({auditData.session.student_id})
                    </h2>
                    <span className="mono" style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Duration: {Math.round(auditData.session.elapsed_seconds / 60)}m • Prompt Version: {auditData.session.scoring_prompt_version}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--nebula)' }}>
                        {auditData.session.final_score}/100
                      </div>
                      <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                        Confidence: {Math.round((auditData.score?.confidence || 0.9) * 100)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(auditData.session.id, auditData.session.student_name, e)}
                      className="btn btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        color: '#EF4444',
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                        background: '#FEF2F2'
                      }}
                      title="Permanently Delete this Student Session"
                    >
                      <Trash2 size={13} />
                      Delete Record
                    </button>
                  </div>
                </div>

                {/* Audio Playback Player */}
                <div style={{ background: '#F8FAFC', border: '1px solid var(--rule)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Volume2 size={16} color="var(--sun)" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)' }}>
                      Recorded Spoken Audio Stream:
                    </span>
                  </div>
                  <audio
                    ref={audioRef}
                    controls
                    style={{ width: '100%', outline: 'none' }}
                    src={auditData.session.audio_url || `${API_BASE}/static/audio/sample_stu001.wav`}
                  />
                </div>

                {/* Rubric Dimension Breakdown */}
                {auditData.score && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
                      Multi-Dimensional Rubric Marks (0 - 5.0 Scale)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', textAlign: 'center' }}>
                      <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>Conceptual</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>{auditData.score.conceptual}</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>Depth & Why</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>{auditData.score.depth}</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>Problem Solving</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>{auditData.score.problem_solving}</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>Practical Code</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>{auditData.score.practical}</div>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '10px', borderRadius: '8px', border: '1px solid var(--rule)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 600 }}>Communication</div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--ink)' }}>{auditData.score.communication}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Qualitative Feedback */}
                {auditData.score?.feedback && (
                  <div style={{ background: '#F8FAFC', border: '1px solid var(--rule)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '24px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--nebula)', marginBottom: '6px' }}>
                      Diagnostic AI Examiner Feedback:
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--ink-secondary)', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-line' }}>
                      {auditData.score.feedback}
                    </p>
                  </div>
                )}

                {/* Faculty Mark Override Form */}
                <div style={{
                  background: '#FFFBEB',
                  border: '1.5px solid #F59E0B',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <Award size={18} color="#D97706" />
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--ink)' }}>
                      Faculty Mark Override & Justification
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                        New Score:
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={newScore}
                        onChange={e => setNewScore(e.target.value)}
                        className="input-field mono"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                        Mandatory Audit Reason:
                      </label>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={e => setOverrideReason(e.target.value)}
                        placeholder="e.g. Replayed recording at 07:15; candidate correctly justified Red-Black treeification."
                        className="input-field"
                      />
                    </div>
                  </div>

                  {overrideSuccess && (
                    <div style={{ color: '#059669', fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>
                      ✓ Override confirmed and logged to audit trail!
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveOverride}
                    className="btn btn-primary"
                    style={{ fontSize: '12px', padding: '6px 18px' }}
                  >
                    Confirm & Sign Faculty Override
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', background: '#FFFFFF' }}>
                <Users size={36} color="var(--muted)" style={{ margin: '0 auto 12px auto' }} />
                <h3>Select a candidate viva from the left column to view auditable recording and transcript logs</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: CALIBRATION MODE */}
      {activeSubTab === 'calibration' && (
        <div className="glass-panel" style={{ padding: '32px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Sliders size={22} color="var(--nebula)" />
            <div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: '20px', fontWeight: 800 }}>
                Faculty vs AI Calibration Analysis
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Measure inter-rater reliability, variance deltas, and scoring alignment between AI rubric marks and Faculty manual marks
              </p>
            </div>
          </div>

          {calibrationData && (
            <div>
              {/* Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--rule)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>Total Vivas Analyzed</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>{calibrationData.total_sessions}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--rule)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>Faculty Overridden</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sun)' }}>{calibrationData.overridden_count}</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--rule)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>Mean Score Delta</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669' }}>±{calibrationData.mean_delta_points} pts</div>
                </div>
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--rule)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>Inter-Rater Reliability</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--nebula)' }}>{calibrationData.reliability_rating}</div>
                </div>
              </div>

              {/* Overrides Table */}
              <div style={{ border: '1px solid var(--rule)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead style={{ background: '#F8FAFC', borderBottom: '1px solid var(--rule)' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted)' }}>Student</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--muted)' }}>AI Score</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--muted)' }}>Faculty Score</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--muted)' }}>Delta</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--muted)' }}>Audit Justification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calibrationData.overrides?.map(ov => (
                      <tr key={ov.session_id} style={{ borderBottom: '1px solid var(--rule)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--ink)' }}>{ov.student_name} ({ov.student_id})</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--muted)' }}>{ov.old_score}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 800, color: 'var(--nebula)' }}>{ov.new_score}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: ov.delta > 0 ? '#059669' : '#DC2626', fontWeight: 700 }}>
                          {ov.delta > 0 ? `+${ov.delta}` : ov.delta}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--ink-secondary)', fontSize: '12px' }}>{ov.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Admin Only Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        selectedPersona={selectedPersona}
        onSelectPersona={setSelectedPersona}
        speechRate={speechRate}
        onChangeSpeechRate={setSpeechRate}
      />
    </div>
  );
}
