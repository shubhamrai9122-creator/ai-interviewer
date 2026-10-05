import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, Shield, Clock, AlertTriangle, 
  Send, HelpCircle, FastForward, CheckCircle2, Award, FileText,
  Settings, Code2, Sparkles, UserCheck, AudioLines, Layers, ArrowRight, CornerDownRight
} from 'lucide-react';

import AudioVisualizer from './AudioVisualizer';
import CodeWhiteboard from './CodeWhiteboard';
import WebcamProctor from './WebcamProctor';
import VoiceSettingsModal from './VoiceSettingsModal';
import ScorecardModal from './ScorecardModal';
import { AudioCaptureEngine, analyzeSpokenText } from '../utils/audioCapture';

const API_BASE = 'http://localhost:8000';

export default function StudentPortal() {
  // Domain selection (Strictly DSA or Web Development)
  const [selectedDomain, setSelectedDomain] = useState('dsa'); // 'dsa' or 'webdev'
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

  // Multi-Modal features: Code Whiteboard & Video Proctor
  const [showCodePad, setShowCodePad] = useState(false);
  const [codeContent, setCodeContent] = useState('');
  const [silenceNotice, setSilenceNotice] = useState(null);

  // Voice Settings & Personas (Strictly Sweet Female Voices)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('grok_sweet');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [sttEngine, setSttEngine] = useState('hybrid');
  const [speechRate, setSpeechRate] = useState(0.98);

  // Audio Telemetry
  const [audioVolume, setAudioVolume] = useState(0);
  const [frequencyData, setFrequencyData] = useState([]);
  const [isSpeakingLive, setIsSpeakingLive] = useState(false);
  const [speechTurnStartSec, setSpeechTurnStartSec] = useState(null);
  const [acousticMetrics, setAcousticMetrics] = useState({
    wpm: 0,
    wpmStatus: 'Ready',
    fillerCounts: {},
    totalFillers: 0,
    fluencyScore: 100
  });

  // Integrity & Anti-Cheating Signals
  const [tabSwitchAlert, setTabSwitchAlert] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // References
  const audioEngineRef = useRef(null);
  const recognitionRef = useRef(null);

  // Helper to select sweet, young female voice in browser
  const getSweetFemaleVoice = () => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const preferred = [
      'Samantha', 'Victoria', 'Karen', 'Tessa', 'Moira',
      'Google UK English Female', 'Google US English', 'Microsoft Zira', 'Microsoft Jenny'
    ];

    for (const name of preferred) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }

    const femaleVoice = voices.find(v => (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('girl')) && v.lang.startsWith('en'));
    if (femaleVoice) return femaleVoice;

    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  };

  // Pre-load voices & viva details
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    const targetVivaId = selectedDomain === 'webdev' ? 43 : 42;
    fetch(`${API_BASE}/api/vivas/${targetVivaId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.duration_minutes !== undefined) {
          setDurationMinutes(data.duration_minutes || 15);
        }
      })
      .catch(err => console.error('Failed to load viva details:', err));
  }, [selectedDomain]);

  // Text-To-Speech with Sweet Young Female Voice
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const v = getSweetFemaleVoice();
      if (v) utterance.voice = v;

      // Sweet young tone calibrations (Pitch: 1.18 - 1.22)
      if (selectedPersona === 'grok_sweet') {
        utterance.rate = speechRate * 0.98;
        utterance.pitch = 1.22;
      } else if (selectedPersona === 'aria') {
        utterance.rate = speechRate * 0.95;
        utterance.pitch = 1.18;
      } else if (selectedPersona === 'maya') {
        utterance.rate = speechRate * 0.97;
        utterance.pitch = 1.15;
      } else {
        utterance.rate = speechRate * 0.94;
        utterance.pitch = 1.16;
      }

      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Hard 15-Minute Countdown Timer
  useEffect(() => {
    let timer;
    if (isStarted && !vivaCompleted) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          const totalDurationSec = (durationMinutes || 15) * 60;
          if (durationMinutes > 0 && next >= totalDurationSec) {
            handleEndViva(next);
            return totalDurationSec;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, vivaCompleted, durationMinutes]);

  // Tab switch detection (Integrity Signal)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isStarted && !vivaCompleted && sessionId) {
        setTabSwitchAlert(true);
        setTabSwitchCount(c => c + 1);
        fetch(`${API_BASE}/api/session/integrity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            event_type: 'TAB_SWITCH',
            details: `Candidate tab unfocused at ${elapsedSeconds}s.`,
            timestamp_sec: elapsedSeconds
          })
        }).catch(err => console.warn('Integrity log failed:', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStarted, vivaCompleted, sessionId, elapsedSeconds]);

  // Setup live audio capture
  const setupAudioCapture = async () => {
    try {
      const engine = new AudioCaptureEngine({
        onFrequencyData: (data) => setFrequencyData(data),
        onVolumeChange: ({ volume, isSpeaking }) => {
          setAudioVolume(volume);
          setIsSpeakingLive(isSpeaking);
          if (isSpeaking && !speechTurnStartSec) {
            setSpeechTurnStartSec(elapsedSeconds);
            setSilenceNotice(null);
          }
        },
        onSilenceDetected: ({ silenceDurationSec }) => {
          if (studentInput.trim().length > 10) {
            setSilenceNotice(`Sustained silence (${silenceDurationSec}s). Click 'Submit Answer' when ready.`);
          }
        },
        silenceThresholdSec: 3.5,
        dbThreshold: -42
      });

      await engine.start();
      audioEngineRef.current = engine;

      // Web Speech Recognition for instant streaming text
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Indian-accent English & Hinglish support

        recognition.onresult = (event) => {
          let full = '';
          for (let i = 0; i < event.results.length; ++i) {
            full += event.results[i][0].transcript + ' ';
          }
          setStudentInput(full.trim());
        };

        recognition.onerror = (e) => {
          console.warn('Speech recognition warning:', e);
        };

        recognition.onend = () => {
          if (audioEngineRef.current && audioEngineRef.current.isRecording) {
            try { recognition.start(); } catch (err) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsListening(true);
    } catch (err) {
      console.warn('Microphone access note:', err.message);
      setIsListening(false);
    }
  };

  // Start Viva Session
  const handleStartViva = async () => {
    if (!consentGiven) {
      alert('Please check the consent box to unlock and begin the exam.');
      return;
    }

    const vivaId = selectedDomain === 'webdev' ? 43 : 42;
    const domainTitle = selectedDomain === 'webdev'
      ? 'CS304: Modern Web Development & Full-Stack Systems'
      : 'CS302: Data Structures & Algorithms';

    try {
      const res = await fetch(`${API_BASE}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId.trim(),
          student_name: studentName.trim(),
          viva_id: vivaId,
          consent_given: true,
          examiner_persona: selectedPersona,
          subject_domain: domainTitle,
          duration_minutes: durationMinutes || 15
        })
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setAiQuestion(data.first_question);
      setCurrentPhase(data.phase);
      setQuestionType(data.question_type);
      setIsStarted(true);

      setTranscriptFeed([
        {
          speaker: 'Grok / Aria AI Examiner',
          text: data.first_question,
          time: '00:00',
          type: data.question_type
        }
      ]);

      speakText(data.first_question);
      await setupAudioCapture();
    } catch (err) {
      alert('Failed to initialize viva session: ' + err.message);
    }
  };

  // Submit Answer Turn
  const handleTurnSubmit = async (isGiveup = false, isHintReq = false) => {
    if (isSubmitting || !sessionId) return;
    const answerText = studentInput.trim();
    if (!answerText && !isGiveup && !isHintReq && !codeContent.trim()) {
      alert('Please speak or type your technical response before submitting.');
      return;
    }

    setIsSubmitting(true);
    setSilenceNotice(null);

    // Stop current speech chunk
    let audioBlob = null;
    if (audioEngineRef.current) {
      audioBlob = await audioEngineRef.current.getAudioBlob();
    }
    const answerSec = elapsedSeconds;

    // Upload audio turn
    let recordedAudioUrl = null;
    if (audioBlob && audioBlob.size > 0) {
      try {
        const formData = new FormData();
        formData.append('audio_file', audioBlob, 'turn.webm');
        formData.append('fallback_text', answerText);

        const transcribeRes = await fetch(`${API_BASE}/api/voice/transcribe`, {
          method: 'POST',
          body: formData
        });
        if (transcribeRes.ok) {
          const transData = await transcribeRes.json();
          recordedAudioUrl = transData.audio_url;
        }
      } catch (e) {
        console.warn('Audio snippet upload warning:', e);
      }
    }

    // Append to transcript
    setTranscriptFeed(prev => [
      ...prev,
      {
        speaker: studentName,
        text: answerText || (codeContent ? '[Submitted Code Solution]' : '[Skipped]'),
        time: formatTime(answerSec),
        codeSnippet: codeContent || null,
        audioUrl: recordedAudioUrl
      }
    ]);

    setStudentInput('');
    const submittedCode = codeContent;
    setCodeContent('');

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
          is_hint_request: isHintReq,
          code_snippet: submittedCode || null,
          audio_chunk_url: recordedAudioUrl,
          wpm: acousticMetrics.wpm > 0 ? acousticMetrics.wpm : 125.0,
          filler_words: acousticMetrics.fillerCounts,
          fluency_score: acousticMetrics.fluencyScore
        })
      });
      const data = await res.json();
      setAiQuestion(data.ai_response_text);
      setCurrentPhase(data.current_phase);
      setQuestionType(data.question_type);
      setLastLatencyMs(data.latency_ms);

      // Auto open whiteboard if question is applied/code
      if (['APPLIED', 'DEBUGGING', 'EDGE_CASE'].includes(data.question_type)) {
        setShowCodePad(true);
      }

      setTranscriptFeed(prev => [
        ...prev,
        {
          speaker: 'AI Examiner',
          text: data.ai_response_text,
          time: formatTime(data.elapsed_seconds),
          type: data.question_type
        }
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
    if (audioEngineRef.current) {
      try { await audioEngineRef.current.stop(); } catch (e) {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    try {
      const res = await fetch(`${API_BASE}/api/session/end?session_id=${sessionId}`, {
        method: 'POST'
      });
      const data = await res.json();
      setCompletionResult(data);
      setIsScorecardOpen(true);
    } catch (err) {
      console.error('Error ending viva:', err);
    }
  };

  const formatTime = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Remaining time for 15-minute countdown
  const totalLimitSec = (durationMinutes || 15) * 60;
  const remainingSec = Math.max(0, totalLimitSec - elapsedSeconds);
  const isTimeCritical = remainingSec <= 120 && durationMinutes > 0;
  const isTimeWarning = remainingSec <= 300 && durationMinutes > 0;

  // 1. Pre-Viva Check-in Screen (Dominant White & Mixed Cosmic Theme)
  if (!isStarted) {
    return (
      <div style={{ maxWidth: '980px', margin: '36px auto', padding: '0 24px' }}>
        <div className="glass-panel" style={{ padding: '36px 40px', background: '#FFFFFF' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '16px',
                background: 'radial-gradient(circle at 35% 35%, #FFE9B8, var(--sun) 55%, #D97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.35)'
              }}>
                <Shield size={26} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="eyebrow" style={{ fontSize: '0.7rem' }}>
                    STANDARDIZED TECHNICAL VIVA
                  </span>
                  <span className="badge badge-dark" style={{ fontSize: '9px' }}>
                    DSA & WEB DEV ONLY
                  </span>
                </div>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: '22px', fontWeight: 800, marginTop: '2px' }} className="sheen-text">
                  Candidate Check-in & Oral Exam Room
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-secondary"
              style={{ fontSize: '12px' }}
            >
              <Settings size={14} />
              Sweet Voice Settings
            </button>
          </div>

          {/* Subject Selector: DSA vs Web Development */}
          <div style={{ marginBottom: '28px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px' }}>
              Select Viva Examination Subject (Strictly DSA or Web Development)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* DSA Option */}
              <div
                onClick={() => setSelectedDomain('dsa')}
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${selectedDomain === 'dsa' ? 'var(--sun)' : 'var(--rule)'}`,
                  background: selectedDomain === 'dsa' ? '#FFFBEB' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedDomain === 'dsa' ? '0 4px 16px rgba(245, 158, 11, 0.18)' : 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)' }}>
                    Data Structures & Algorithms (DSA)
                  </span>
                  {selectedDomain === 'dsa' && (
                    <span className="badge badge-amber" style={{ fontSize: '10px' }}>
                      <CheckCircle2 size={12} /> Selected
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '10px', lineHeight: '1.4' }}>
                  Arrays, Hash Maps, BST/AVL Rotations, Dynamic Programming (Knapsack), Kahn's Graph Cycles, Big-O trade-offs.
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="badge badge-purple" style={{ fontSize: '9px' }}>Trees & Graphs</span>
                  <span className="badge badge-cyan" style={{ fontSize: '9px' }}>DP Optimization</span>
                  <span className="badge badge-amber" style={{ fontSize: '9px' }}>O(1) Hashing</span>
                </div>
              </div>

              {/* Web Development Option */}
              <div
                onClick={() => setSelectedDomain('webdev')}
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${selectedDomain === 'webdev' ? 'var(--nebula)' : 'var(--rule)'}`,
                  background: selectedDomain === 'webdev' ? '#EEF2FF' : '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedDomain === 'webdev' ? '0 4px 16px rgba(99, 102, 241, 0.18)' : 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)' }}>
                    Web Development & Full-Stack Systems
                  </span>
                  {selectedDomain === 'webdev' && (
                    <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                      <CheckCircle2 size={12} /> Selected
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '10px', lineHeight: '1.4' }}>
                  React 19 Virtual DOM & Fiber, Node.js Event Loop Microtasks, REST Idempotency, WebSockets, DB Indexing & ACID.
                </p>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '9px' }}>React Fiber</span>
                  <span className="badge badge-purple" style={{ fontSize: '9px' }}>Event Loop</span>
                  <span className="badge badge-emerald" style={{ fontSize: '9px' }}>B-Tree Indexing</span>
                </div>
              </div>
            </div>
          </div>

          {/* Student ID & Name */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
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
              <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
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

          {/* Sweet Voice Persona Indicator */}
          <div style={{
            background: '#FDF2F8',
            border: '1px solid rgba(225, 29, 72, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="sun-pulse" style={{ background: '#E11D48', boxShadow: '0 0 10px #E11D48' }} />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                  Interviewer Voice: {selectedPersona === 'grok_sweet' ? 'Grok Sweet AI (Bright & Youthful)' : selectedPersona === 'aria' ? 'Aria Sweet (Warm & Cheerful)' : selectedPersona === 'maya' ? 'Maya (Youthful Tech Lead)' : 'Zara (Sweet Socratic)'}
                </span>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Sweet young female voice tuned at pitch 1.22x with Web Speech synthesis • Zero male voices
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '4px 12px' }}
            >
              Test Voice
            </button>
          </div>

          {/* Hard 15-Minute Rule Notice */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="var(--ice)" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--ink)' }}>
                  Hard 15-Minute Exam Duration
                </span>
              </div>
              <span className="badge badge-dark" style={{ fontSize: '10px' }}>
                15:00 Countdown Limit
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', margin: 0, lineHeight: '1.5' }}>
              The viva adheres strictly to a 15-minute countdown. The AI will navigate adaptive topic trees, dig deeper into strong responses, advance gracefully on weak ones, and wrap up automatically at 0:00 with full multi-dimensional rubric marks.
            </p>
          </div>

          {/* Mandatory Academic Consent Checkbox (Unlocks Entry Box / Start) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px',
            background: consentGiven ? '#F0FDF4' : '#F8FAFC',
            border: `2px solid ${consentGiven ? '#10B981' : 'var(--rule)'}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '28px',
            transition: 'all 0.2s ease'
          }}>
            <label htmlFor="consent" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer', flex: 1 }}>
              <input
                type="checkbox"
                id="consent"
                checked={consentGiven}
                onChange={e => setConsentGiven(e.target.checked)}
                style={{ marginTop: '3px', width: '22px', height: '22px', accentColor: '#10B981', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontSize: '14px', fontWeight: 800, color: consentGiven ? '#047857' : 'var(--ink)' }}>
                  {consentGiven ? 'Academic Consent Acknowledged & Verified' : 'Check to Agree & Unlock Viva Examination'}
                </span>
                <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                  I consent to audio recording, timestamped speech transcription, and proctoring telemetry (tab-switch & silence tracking) for faculty evaluation.
                </p>
              </div>
            </label>
            <span className={`badge ${consentGiven ? 'badge-emerald' : 'badge-amber'}`} style={{ whiteSpace: 'nowrap' }}>
              {consentGiven ? 'Unlocked' : 'Entry Locked'}
            </span>
          </div>

          {/* Action button */}
          <button
            onClick={handleStartViva}
            disabled={!consentGiven || !studentName.trim() || !studentId.trim()}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.02em',
              background: consentGiven ? '#0F172A' : '#94A3B8',
              cursor: consentGiven ? 'pointer' : 'not-allowed'
            }}
          >
            {consentGiven ? 'Start Adaptive Technical Viva (15-Min)' : 'Please Agree to Consent Above to Unlock'}
          </button>
        </div>

        {/* Voice Settings Modal */}
        <VoiceSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          selectedPersona={selectedPersona}
          onSelectPersona={setSelectedPersona}
          sttEngine={sttEngine}
          onSelectSttEngine={setSttEngine}
          speechRate={speechRate}
          onChangeSpeechRate={setSpeechRate}
        />
      </div>
    );
  }

  // 2. Active Viva Room Interface (White & Mixed Cosmic Theme)
  return (
    <div style={{ maxWidth: '1440px', margin: '24px auto', padding: '0 24px' }}>
      {/* Top Session Bar with Hard 15-Minute Countdown */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '20px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          {/* Time & Phase */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Hard 15-Minute Countdown Display */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: isTimeCritical ? '#FEF2F2' : isTimeWarning ? '#FFFBEB' : '#F1F5F9',
              border: `1.5px solid ${isTimeCritical ? '#EF4444' : isTimeWarning ? '#F59E0B' : 'var(--rule)'}`
            }}>
              <Clock size={16} color={isTimeCritical ? '#EF4444' : isTimeWarning ? '#F59E0B' : 'var(--ink)'} />
              <span className="mono" style={{
                fontSize: '16px',
                fontWeight: 800,
                color: isTimeCritical ? '#EF4444' : isTimeWarning ? '#B45309' : 'var(--ink)'
              }}>
                {formatTime(remainingSec)} left
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                / 15:00
              </span>
            </div>

            <span className="badge badge-dark">
              {selectedDomain === 'webdev' ? 'Web Development Viva' : 'DSA Technical Viva'}
            </span>

            <span className="badge badge-purple">
              {currentPhase}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ flex: 1, maxWidth: '360px', height: '8px', background: '#F1F5F9', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, (elapsedSeconds / totalLimitSec) * 100)}%`,
              height: '100%',
              background: isTimeCritical ? '#EF4444' : 'linear-gradient(90deg, var(--nebula), var(--ice))',
              borderRadius: '999px',
              transition: 'width 1s linear'
            }} />
          </div>

          {/* Quick Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowCodePad(!showCodePad)}
              className={`btn ${showCodePad ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <Code2 size={14} />
              {showCodePad ? 'Hide Code Pad' : 'Open Code Pad'}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              <Settings size={14} />
              Voice
            </button>

            <button
              onClick={() => handleEndViva()}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 14px', color: '#BE123C' }}
            >
              Conclude Viva
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switch Alert (Integrity Alert) */}
      {tabSwitchAlert && (
        <div style={{
          background: '#FFF1F2',
          border: '1.5px solid #E11D48',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px',
          color: '#9F1239'
        }}>
          <AlertTriangle size={18} color="#E11D48" />
          <span>
            <strong>Integrity Warning:</strong> Tab switch detected (#{tabSwitchCount}). Your examiner and faculty review board have been notified. Please stay focused on the viva window.
          </span>
        </div>
      )}

      {/* Silence Alert */}
      {silenceNotice && (
        <div style={{
          background: '#FFFBEB',
          border: '1.5px solid #F59E0B',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: '#92400E'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="#F59E0B" />
            <span>{silenceNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => handleTurnSubmit()}
            className="btn btn-primary"
            style={{ fontSize: '11px', padding: '4px 12px' }}
          >
            Submit Now
          </button>
        </div>
      )}

      {/* Main Examination Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showCodePad ? '1fr 1fr 1fr' : '1.2fr 1fr',
        gap: '20px'
      }}>
        {/* Left Column: AI Examiner & Active Question */}
        <div>
          {/* Active Question Card */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-purple">{questionType} QUESTION</span>
                {lastLatencyMs && (
                  <span className="mono" style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                    ⚡ Turnaround: {lastLatencyMs}ms
                  </span>
                )}
              </div>

              {isAiSpeaking && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Volume2 size={16} color="var(--ice)" />
                  <span style={{ fontSize: '12px', color: 'var(--ice)', fontWeight: 700 }}>
                    Sweet Voice Speaking...
                  </span>
                </div>
              )}
            </div>

            {/* Audio Visualizer */}
            <div style={{ marginBottom: '16px' }}>
              <AudioVisualizer
                frequencyData={frequencyData}
                isSpeaking={isSpeakingLive || isAiSpeaking}
                volume={audioVolume}
              />
            </div>

            {/* Question Text */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-md)',
              padding: '20px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--nebula)', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
                Examiner Probe:
              </div>
              <p style={{
                fontFamily: 'var(--body)',
                fontSize: '17px',
                fontWeight: 600,
                color: 'var(--ink)',
                lineHeight: '1.5'
              }}>
                {aiQuestion || 'Listening to your thoughts...'}
              </p>
            </div>

            {/* Candidate Spoken Input / Entry Box */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>
                  Your Spoken Answer (Hindi/Hinglish Supported):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="sun-pulse" style={{ width: '7px', height: '7px', background: isListening ? '#10B981' : '#94A3B8' }} />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    {isListening ? 'Voice Catching Active' : 'Microphone Inactive'}
                  </span>
                </div>
              </div>

              <textarea
                value={studentInput}
                onChange={e => setStudentInput(e.target.value)}
                placeholder="Speak naturally into your microphone (English or Hindi/Hinglish), or type here..."
                rows={4}
                className="input-field"
                style={{ fontSize: '14px', lineHeight: '1.5', resize: 'vertical' }}
              />
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleTurnSubmit(false, true)}
                  disabled={isSubmitting}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '7px 14px' }}
                >
                  <HelpCircle size={14} color="var(--sun)" />
                  Ask Socratic Hint
                </button>

                <button
                  type="button"
                  onClick={() => handleTurnSubmit(true, false)}
                  disabled={isSubmitting}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '7px 14px' }}
                >
                  <FastForward size={14} />
                  Move to Next Topic
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTurnSubmit(false, false)}
                disabled={isSubmitting || (!studentInput.trim() && !codeContent.trim())}
                className="btn btn-primary"
                style={{ padding: '8px 24px', fontSize: '13px' }}
              >
                <Send size={14} />
                {isSubmitting ? 'Evaluating...' : 'Submit Answer'}
              </button>
            </div>
          </div>
        </div>

        {/* Center/Middle Column: Code Whiteboard (If Open) */}
        {showCodePad && (
          <div>
            <CodeWhiteboard
              code={codeContent}
              onChange={setCodeContent}
              onRunSimulation={(code) => {
                setStudentInput(prev => prev ? `${prev}\n[Explained Code Solution]` : '[Explained Code Solution]');
              }}
            />
          </div>
        )}

        {/* Right Column: Live Transcript Feed & Telemetry */}
        <div>
          <div className="glass-panel" style={{ padding: '20px', background: '#FFFFFF', maxHeight: '720px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid var(--rule)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="var(--nebula)" />
                <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--ink)' }}>
                  Auditable Viva Transcript
                </span>
              </div>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>
                {transcriptFeed.length} turns
              </span>
            </div>

            {/* Transcript Scroll Container */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {transcriptFeed.map((item, idx) => {
                const isExaminer = item.speaker.includes('AI') || item.speaker.includes('Examiner');
                return (
                  <div
                    key={idx}
                    style={{
                      background: isExaminer ? '#F8FAFC' : '#EEF2FF',
                      border: `1px solid ${isExaminer ? 'var(--rule)' : 'rgba(99, 102, 241, 0.25)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 800, color: isExaminer ? 'var(--nebula)' : '#1E1B4B' }}>
                        {item.speaker}
                      </span>
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--muted)' }}>
                        {item.time}
                      </span>
                    </div>
                    <p style={{ color: 'var(--ink)', lineHeight: '1.45', margin: 0 }}>
                      {item.text}
                    </p>
                    {item.codeSnippet && (
                      <pre style={{
                        marginTop: '8px',
                        background: '#0B0F19',
                        color: '#E2E8F0',
                        padding: '10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        overflowX: 'auto'
                      }}>
                        <code>{item.codeSnippet}</code>
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Voice Settings & Scorecard Modals */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        selectedPersona={selectedPersona}
        onSelectPersona={setSelectedPersona}
        sttEngine={sttEngine}
        onSelectSttEngine={setSttEngine}
        speechRate={speechRate}
        onChangeSpeechRate={setSpeechRate}
      />

      <ScorecardModal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        result={completionResult}
        studentName={studentName}
        studentId={studentId}
        subjectTitle={selectedDomain === 'webdev' ? 'CS304: Modern Web Development' : 'CS302: Data Structures & Algorithms'}
      />
    </div>
  );
}
