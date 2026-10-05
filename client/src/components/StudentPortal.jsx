import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, Shield, Clock, AlertTriangle, 
  Send, HelpCircle, FastForward, CheckCircle2, Award, FileText
} from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export default function StudentPortal() {
  // Session setup state
  const [studentId, setStudentId] = useState('STU001');
  const [studentName, setStudentName] = useState('Rahul Sharma');
  const [consentGiven, setConsentGiven] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);

  // Live viva state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('WARMUP');
  const [aiQuestion, setAiQuestion] = useState('');
  const [questionType, setQuestionType] = useState('PROJECT');
  const [studentInput, setStudentInput] = useState('');
  const [transcriptFeed, setTranscriptFeed] = useState([]);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastLatencyMs, setLastLatencyMs] = useState(null);
  const [vivaCompleted, setVivaCompleted] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);

  // Tab switch detection
  const [tabSwitchAlert, setTabSwitchAlert] = useState(false);

  // Speech Recognition reference
  const recognitionRef = useRef(null);

  // Web Speech Synthesis (TTS)
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Timer effect: increments every 1 second
  useEffect(() => {
    let timer;
    if (isStarted && !vivaCompleted) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (next >= 900) {
            handleEndViva(next);
            return 900;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, vivaCompleted]);

  // Tab switch / Window focus detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isStarted && !vivaCompleted && sessionId) {
        setTabSwitchAlert(true);
        fetch(`${API_BASE}/api/session/integrity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            event_type: 'TAB_SWITCH',
            details: 'Browser window tab switched during viva questioning.',
            timestamp_sec: elapsedSeconds
          })
        }).catch(err => console.error(err));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStarted, vivaCompleted, sessionId, elapsedSeconds]);

  // Initialize Speech Recognition if supported
  const toggleSpeechRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Web Speech API is not supported in this browser. You can type your answer in the box below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // Indian-accent English / Hinglish supported

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        finalTranscript += event.results[i][0].transcript;
      }
      setStudentInput(finalTranscript);
    };

    recognition.onerror = (e) => {
      console.warn('Speech recognition error:', e);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  // Start Viva Session
  const handleStartViva = async () => {
    if (!consentGiven) {
      alert('Please accept the recording consent to begin the exam.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          student_name: studentName,
          viva_id: 42,
          consent_given: true
        })
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setIsStarted(true);
      setAiQuestion(data.initial_prompt);
      setCurrentPhase(data.phase);
      setTranscriptFeed([{
        speaker: 'AI Examiner',
        text: data.initial_prompt,
        time: '00:00'
      }]);
      speakText(data.initial_prompt);
    } catch (err) {
      alert('Failed to connect to Viva Server: ' + err.message);
    }
  };

  // Submit Answer Turn
  const handleTurnSubmit = async ({ isGiveup = false, isHintReq = false } = {}) => {
    if (!sessionId) return;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const answerText = isGiveup ? "I don't know the exact answer to this, can we move to the next topic?" :
                       isHintReq ? "Could you give me a small hint on this concept?" :
                       studentInput.trim();

    if (!answerText && !isGiveup && !isHintReq) return;

    setIsSubmitting(true);
    const answerSec = elapsedSeconds;

    // Append student answer to feed
    setTranscriptFeed(prev => [
      ...prev,
      { speaker: studentName, text: answerText, time: formatTime(answerSec) }
    ]);
    setStudentInput('');

    try {
      const res = await fetch(`${API_BASE}/api/session/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          elapsed_seconds: answerSec,
          transcript: answerText,
          is_silence: false,
          is_giveup: isGiveup,
          is_hint_request: isHintReq
        })
      });
      const data = await res.json();
      setAiQuestion(data.ai_response_text);
      setCurrentPhase(data.current_phase);
      setQuestionType(data.question_type);
      setLastLatencyMs(data.latency_ms);

      setTranscriptFeed(prev => [
        ...prev,
        { speaker: 'AI Examiner', text: data.ai_response_text, time: formatTime(data.elapsed_seconds), type: data.question_type }
      ]);

      speakText(data.ai_response_text);

      if (data.is_viva_completed) {
        handleEndViva(data.elapsed_seconds);
      }
    } catch (err) {
      console.error('Turn submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // End Viva & Run Scoring
  const handleEndViva = async (finalSec = elapsedSeconds) => {
    if (!sessionId || vivaCompleted) return;
    setVivaCompleted(true);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    try {
      const res = await fetch(`${API_BASE}/api/session/end?session_id=${sessionId}`, {
        method: 'POST'
      });
      const data = await res.json();
      setCompletionResult(data);
    } catch (err) {
      console.error('Error ending viva:', err);
    }
  };

  const formatTime = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getPhaseBadge = (phase) => {
    switch (phase) {
      case 'WARMUP': return <span className="badge badge-blue">Warm-up (0-1m)</span>;
      case 'FUNDAMENTALS': return <span className="badge badge-purple">Fundamentals (1-5m)</span>;
      case 'DEPTH': return <span className="badge badge-cyan">Depth & Reasoning (5-10m)</span>;
      case 'APPLIED': return <span className="badge badge-amber">Applied Engineering (10-13m)</span>;
      case 'WRAPUP': return <span className="badge badge-rose">Wrap-up (13-14:30m)</span>;
      default: return <span className="badge badge-emerald">Scoring Phase</span>;
    }
  };

  // 1. Pre-Viva Setup View
  if (!isStarted) {
    return (
      <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px' }}>
        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              width: '54px', height: '54px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
            }}>
              <Shield size={28} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: '800' }}>Student Examination Check-in</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                MSOT Technical Viva — CS302: Data Structures & Algorithms
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Candidate Student ID
              </label>
              <input
                className="input-field mono"
                value={studentId}
                onChange={e => setStudentId(e.target.value.toUpperCase())}
                placeholder="e.g. STU001"
              />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                Candidate Full Name
              </label>
              <input
                className="input-field"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
              />
            </div>
          </div>

          {/* 15-Minute Flow Rundown */}
          <div style={{
            background: 'rgba(11, 17, 32, 0.6)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="var(--cyan)" />
              Fixed 15-Minute Exam Structure (Standardized Across Cohort)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', fontSize: '12px' }}>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--primary)' }}>
                <strong>0-1 min</strong><br />Warm-up & Opener
              </div>
              <div style={{ background: 'rgba(168, 85, 247, 0.1)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--purple)' }}>
                <strong>1-5 min</strong><br />Core Fundamentals
              </div>
              <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--cyan)' }}>
                <strong>5-10 min</strong><br />Depth & "Why" Probes
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--amber)' }}>
                <strong>10-13 min</strong><br />Applied Debugging
              </div>
              <div style={{ background: 'rgba(244, 63, 94, 0.1)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--rose)' }}>
                <strong>13-15 min</strong><br />Wrap-up & Scoring
              </div>
            </div>
          </div>

          {/* Consent Checkbox */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '16px',
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '28px'
          }}>
            <input
              type="checkbox"
              id="consent"
              checked={consentGiven}
              onChange={e => setConsentGiven(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer', transform: 'scale(1.2)' }}
            />
            <label htmlFor="consent" style={{ fontSize: '13px', lineHeight: '1.6', cursor: 'pointer' }}>
              <strong>Mandatory Examination Consent:</strong> I acknowledge that this 15-minute viva will be recorded and transcribed for faculty review and audit. The AI examiner adapts questions dynamically and strictly follows a 5-dimensional standardized rubric.
            </label>
          </div>

          {/* Action Button */}
          <button
            onClick={handleStartViva}
            disabled={!consentGiven}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px', opacity: consentGiven ? 1 : 0.5 }}
          >
            <Mic size={20} />
            Begin 15-Minute Technical Viva
          </button>
        </div>
      </div>
    );
  }

  // 2. Post-Viva Completed View
  if (vivaCompleted) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div className="glass-panel" style={{ padding: '36px', textAlign: 'center' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.2)',
            border: '2px solid var(--emerald)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <CheckCircle2 size={36} color="var(--emerald)" />
          </div>

          <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>
            Viva Successfully Concluded
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
            Your 15-minute oral examination for <strong>CS302: Data Structures & Algorithms</strong> is complete.
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px',
            background: 'rgba(11, 17, 32, 0.7)', padding: '24px', borderRadius: 'var(--radius-md)',
            marginBottom: '28px', textAlign: 'left'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Student Name & ID</div>
              <div style={{ fontSize: '16px', fontWeight: '700' }}>{studentName}</div>
              <div className="mono" style={{ fontSize: '13px', color: 'var(--cyan)' }}>{studentId}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Preliminary Score</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--emerald)' }}>
                {completionResult?.final_score ?? '--'}<span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>/100</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Confidence: {Math.round((completionResult?.confidence ?? 0.9) * 100)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Audit Status</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: completionResult?.flagged_for_review ? 'var(--rose)' : 'var(--emerald)' }}>
                {completionResult?.flagged_for_review ? 'Flagged for Faculty Review' : 'Verified & Archived'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Full Audio & Transcript Logged</div>
            </div>
          </div>

          {completionResult?.feedback && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              textAlign: 'left',
              marginBottom: '28px'
            }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="var(--primary-light)" />
                AI Examiner Rubric Feedback
              </h4>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'pre-line', lineHeight: '1.7' }}>
                {completionResult.feedback}
              </div>
            </div>
          )}

          <button
            onClick={() => {
              setIsStarted(false);
              setVivaCompleted(false);
              setElapsedSeconds(0);
              setTranscriptFeed([]);
            }}
            className="btn btn-secondary"
          >
            Return to Check-in Portal
          </button>
        </div>
      </div>
    );
  }

  // 3. Active 15-Minute Viva Room View
  const remainingSec = Math.max(0, 900 - elapsedSeconds);
  const progressPct = (elapsedSeconds / 900) * 100;

  return (
    <div style={{ maxWidth: '1200px', margin: '24px auto', padding: '0 20px' }}>
      {/* Top Viva Status Bar */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Phase Badge & Candidate Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>{getPhaseBadge(currentPhase)}</div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>{studentName}</div>
            <div className="mono" style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{studentId}</div>
          </div>
        </div>

        {/* 15-Minute Countdown Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Time Remaining</div>
            <div className="mono" style={{
              fontSize: '24px', fontWeight: '800',
              color: remainingSec < 120 ? 'var(--rose)' : remainingSec < 300 ? 'var(--amber)' : 'var(--cyan)'
            }}>
              {formatTime(remainingSec)}
            </div>
          </div>

          <div style={{ width: '120px', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`,
              height: '100%',
              background: remainingSec < 120 ? 'var(--rose)' : 'linear-gradient(90deg, #6366f1, #06b6d4)',
              transition: 'width 1s linear'
            }}></div>
          </div>

          <button
            onClick={() => handleEndViva()}
            className="btn btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Wrap-up Early
          </button>
        </div>
      </div>

      {/* Tab Switch Alert if triggered */}
      {tabSwitchAlert && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid var(--rose)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: '#fecdd3'
        }}>
          <AlertTriangle size={18} color="var(--rose)" />
          <span>
            <strong>Integrity Notice:</strong> Window unfocused. Tab switching has been logged with timestamps for faculty audit review.
          </span>
        </div>
      )}

      {/* Main Dual Columns: AI Question / Live Waveform vs Conversation Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Left Column: Examiner Audio & Current Question Card */}
        <div>
          <div className="glass-panel" style={{ padding: '28px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge badge-purple">{questionType} QUESTION</span>
                {lastLatencyMs && (
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--emerald)' }}>
                    ⚡ TTFT: {lastLatencyMs}ms (Target &lt;2500ms)
                  </span>
                )}
              </div>
              {isAiSpeaking && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Volume2 size={16} color="var(--cyan)" />
                  <span style={{ fontSize: '12px', color: 'var(--cyan)' }}>AI Examiner Speaking...</span>
                </div>
              )}
            </div>

            {/* Voice Waveform Animation */}
            <div style={{
              background: 'rgba(6, 9, 19, 0.7)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              textAlign: 'center',
              marginBottom: '20px',
              border: '1px solid var(--border-subtle)'
            }}>
              {isAiSpeaking ? (
                <div className="waveform-container">
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                  <div className="wave-bar"></div>
                </div>
              ) : isListening ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span className="recording-pulse"></span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--rose)' }}>Listening to candidate speech...</span>
                </div>
              ) : (
                <div style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                  Press "Speak with Mic" or type your technical answer below.
                </div>
              )}
            </div>

            {/* AI Question Text */}
            <h3 style={{ fontSize: '18px', fontWeight: '700', lineHeight: '1.5', color: '#fff', marginBottom: '20px' }}>
              "{aiQuestion}"
            </h3>

            {/* Student Answer Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Click 'Speak with Mic' to answer aloud (English / Hinglish), or type your explanation here..."
                value={studentInput}
                onChange={e => setStudentInput(e.target.value)}
                style={{ resize: 'vertical' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ flex: '1' }}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  {isListening ? 'Mute / Stop Mic' : 'Speak with Mic (STT)'}
                </button>

                <button
                  type="button"
                  onClick={() => handleTurnSubmit()}
                  disabled={isSubmitting || !studentInput.trim()}
                  className="btn btn-primary"
                  style={{ flex: '1' }}
                >
                  <Send size={16} />
                  {isSubmitting ? 'Evaluating...' : 'Submit Spoken Answer'}
                </button>
              </div>

              {/* Quick Pedagogical Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleTurnSubmit({ isHintReq: true })}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', flex: '1', padding: '8px' }}
                >
                  <HelpCircle size={14} color="var(--amber)" />
                  Request Socratic Hint
                </button>

                <button
                  type="button"
                  onClick={() => handleTurnSubmit({ isGiveup: true })}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', flex: '1', padding: '8px' }}
                >
                  <FastForward size={14} color="var(--cyan)" />
                  I Don't Know / Move to Next Topic
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Timestamped Transcript Stream */}
        <div>
          <div className="glass-panel" style={{ padding: '24px', height: '620px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700' }}>Live Timestamped Transcript</h4>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Auditable Stream</span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '6px' }}>
              {transcriptFeed.map((item, idx) => (
                <div key={idx} style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: item.speaker === 'AI Examiner' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(6, 182, 212, 0.08)',
                  borderLeft: `3px solid ${item.speaker === 'AI Examiner' ? 'var(--primary)' : 'var(--cyan)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: item.speaker === 'AI Examiner' ? 'var(--primary-light)' : 'var(--cyan)' }}>
                      {item.speaker}
                    </span>
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      {item.time}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#e2e8f0' }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
