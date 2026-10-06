import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, Shield, Clock, AlertTriangle, 
  Send, HelpCircle, FastForward, CheckCircle2, Award, FileText,
  Code2, Sparkles, UserCheck, AudioLines, Layers, ArrowRight, CornerDownRight, Play
} from 'lucide-react';

import AudioVisualizer from './AudioVisualizer';
import HackerRankCodeEditor from './HackerRankCodeEditor';
import ScreenAndCameraRecorder from './ScreenAndCameraRecorder';
import SolarSystem3D from './SolarSystem3D';
import ScorecardModal from './ScorecardModal';
import { AudioCaptureEngine, analyzeSpokenText } from '../utils/audioCapture';

const API_BASE = 'http://localhost:8000';

export default function StudentPortal() {
  // Domain selection (Strictly DSA or Web Development)
  const [selectedDomain, setSelectedDomain] = useState('dsa'); // 'dsa' or 'webdev'
  const [rollNumber, setRollNumber] = useState('21BCSE104');
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
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);

  // Current Interview Step:
  // 1 = Introduction, 2 = Strong Topic Choice, 3 = Questions on Strong Topic, 4 = Other Topics
  const [currentStep, setCurrentStep] = useState(1);

  // Code editor state
  const [codeContent, setCodeContent] = useState('');
  const [silenceNotice, setSilenceNotice] = useState(null);

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

  // Fixed 15-Minute Limit
  const durationMinutes = 15;

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

  // Pre-load speech voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Text-To-Speech with Sweet Young Voice
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const v = getSweetFemaleVoice();
      if (v) utterance.voice = v;

      utterance.rate = 0.98;
      utterance.pitch = 1.22; // Sweet melodious young tone

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
          const totalDurationSec = durationMinutes * 60;
          if (next >= totalDurationSec) {
            handleEndViva(next);
            return totalDurationSec;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, vivaCompleted]);

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
            details: `Candidate window lost focus at ${elapsedSeconds}s.`,
            timestamp_sec: elapsedSeconds
          })
        }).catch(err => console.warn('Integrity log failed:', err));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isStarted, vivaCompleted, sessionId, elapsedSeconds]);

  // Audio Capture Engine
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
        recognition.lang = 'en-IN'; // Indian English & Hinglish support

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

  // Start Viva Session (AI INTERVIEW START)
  const handleStartViva = async () => {
    if (!consentGiven) {
      alert('Please check the consent box to proceed.');
      return;
    }

    const vivaId = selectedDomain === 'webdev' ? 43 : 42;
    const domainTitle = selectedDomain === 'webdev' ? 'Web Development' : 'Data Structures & Algorithms';

    try {
      const res = await fetch(`${API_BASE}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: rollNumber.trim().toUpperCase(),
          student_name: studentName.trim(),
          viva_id: vivaId,
          consent_given: true,
          examiner_persona: 'grok_sweet',
          subject_domain: domainTitle,
          duration_minutes: 15
        })
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setAiQuestion(data.first_question);
      setCurrentPhase(data.phase);
      setQuestionType(data.question_type);
      setIsStarted(true);
      setCurrentStep(1); // Step 1: Introduction

      setTranscriptFeed([
        {
          speaker: 'AI Examiner',
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
  const handleTurnSubmit = async (isGiveup = false, isHintReq = false, explicitCode = null) => {
    if (isSubmitting || !sessionId) return;
    const effectiveCode = explicitCode !== null ? explicitCode : codeContent;
    const answerText = studentInput.trim();
    if (!answerText && !isGiveup && !isHintReq && !effectiveCode.trim()) {
      alert('Please speak or type your response before submitting.');
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

    // Optional: upload turn audio
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
        text: answerText || (effectiveCode ? '[Submitted Code Solution in Editor]' : '[Skipped]'),
        time: formatTime(answerSec),
        codeSnippet: effectiveCode || null,
        audioUrl: recordedAudioUrl
      }
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
          is_hint_request: isHintReq,
          code_snippet: effectiveCode || null,
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

      // Advance step indicator
      if (currentStep === 1) setCurrentStep(2); // Move to Strong Topic
      else if (currentStep === 2) setCurrentStep(3); // Move to Strong Questions
      else if (currentStep === 3 && data.ai_response_text.includes('next topic')) setCurrentStep(4);

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

  const totalLimitSec = durationMinutes * 60;
  const remainingSec = Math.max(0, totalLimitSec - elapsedSeconds);
  const isTimeCritical = remainingSec <= 120;
  const isTimeWarning = remainingSec <= 300;

  // =========================================================================
  // 1. CLEAN LANDING & REGISTRATION PAGE WITH 3D SOLAR SYSTEM
  // =========================================================================
  if (!isStarted) {
    return (
      <div style={{ maxWidth: '1060px', margin: '36px auto', padding: '0 24px' }}>
        {/* Clean Registration Card */}
        <div className="glass-panel" style={{ padding: '36px 40px', background: '#FFFFFF', marginBottom: '28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 35% 35%, #FFE9B8, var(--sun) 55%, #D97706)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.45)'
              }}>
                <Shield size={24} color="#FFFFFF" />
              </div>
              <div>
                <span className="eyebrow" style={{ fontSize: '0.68rem' }}>
                  STANDARDIZED TECHNICAL EVALUATION
                </span>
                <h1 style={{ fontFamily: 'var(--display)', fontSize: '24px', fontWeight: 800, marginTop: '2px' }} className="sheen-text">
                  Candidate Registration & Viva Arena
                </h1>
              </div>
            </div>

            <span className="badge badge-dark" style={{ fontSize: '10px' }}>
              15:00 TIMED ARENA
            </span>
          </div>

          {/* Clean Domain Choice: DSA vs Web Development Only */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '10px' }}>
              Select Examination Track:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <button
                type="button"
                onClick={() => setSelectedDomain('dsa')}
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${selectedDomain === 'dsa' ? 'var(--sun)' : 'var(--rule)'}`,
                  background: selectedDomain === 'dsa' ? '#FFFBEB' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedDomain === 'dsa' ? '0 4px 14px rgba(245, 158, 11, 0.18)' : 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)' }}>
                    DSA (Data Structures & Algorithms)
                  </span>
                  {selectedDomain === 'dsa' && <CheckCircle2 size={16} color="#D97706" />}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                  Problem solving, complexity analysis & algorithmic implementations.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDomain('webdev')}
                style={{
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${selectedDomain === 'webdev' ? 'var(--nebula)' : 'var(--rule)'}`,
                  background: selectedDomain === 'webdev' ? '#EEF2FF' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedDomain === 'webdev' ? '0 4px 14px rgba(99, 102, 241, 0.18)' : 'var(--shadow-sm)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--ink)' }}>
                    Web Development & Systems
                  </span>
                  {selectedDomain === 'webdev' && <CheckCircle2 size={16} color="#4F46E5" />}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-secondary)' }}>
                  Full-stack architecture, asynchronous workflows & data persistence.
                </div>
              </button>
            </div>
          </div>

          {/* Candidate Name & Roll Number Input */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>
                Candidate Full Name
              </label>
              <input
                className="input-field"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>
                Roll Number
              </label>
              <input
                className="input-field mono"
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 21BCSE104"
              />
            </div>
          </div>

          {/* Academic Consent */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '16px 20px',
            background: consentGiven ? '#F0FDF4' : '#F8FAFC',
            border: `1.5px solid ${consentGiven ? '#10B981' : 'var(--rule)'}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '28px'
          }}>
            <label htmlFor="consent" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', flex: 1 }}>
              <input
                type="checkbox"
                id="consent"
                checked={consentGiven}
                onChange={e => setConsentGiven(e.target.checked)}
                style={{ marginTop: '2px', width: '20px', height: '20px', accentColor: '#10B981', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: consentGiven ? '#047857' : 'var(--ink)' }}>
                  {consentGiven ? 'Consent Acknowledged' : 'Click to Agree & Authorize Examination'}
                </span>
                <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                  I agree to audio stream recording, front camera proctoring, screen recording capture, and integrity monitoring.
                </p>
              </div>
            </label>
            <span className={`badge ${consentGiven ? 'badge-emerald' : 'badge-amber'}`}>
              {consentGiven ? 'Ready' : 'Pending'}
            </span>
          </div>

          {/* AI INTERVIEW START Button (Singularity Celestial Glow from rishiraj38.github.io) */}
          <button
            onClick={handleStartViva}
            disabled={!consentGiven || !studentName.trim() || !rollNumber.trim()}
            style={{
              width: '100%',
              padding: '18px 28px',
              borderRadius: '999px',
              background: consentGiven ? '#0F172A' : '#94A3B8',
              color: '#FFFFFF',
              fontFamily: 'var(--display)',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              border: consentGiven ? '1.5px solid rgba(255, 255, 255, 0.25)' : 'none',
              boxShadow: consentGiven ? '0 0 25px rgba(99, 102, 241, 0.4), 0 8px 24px rgba(15, 23, 42, 0.3)' : 'none',
              cursor: consentGiven ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <span className="sun-pulse" style={{ width: '10px', height: '10px', background: '#F59E0B' }} />
            <span>AI INTERVIEW START</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* 3D Solar System Animation from rishiraj38.github.io */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 8px' }}>
            <span className="eyebrow" style={{ fontSize: '0.68rem' }}>
              3D GRAVITATIONAL CELESTIAL ENGINE
            </span>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Interactive Orbit Simulation
            </span>
          </div>
          <SolarSystem3D height="440px" />
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. ACTIVE VIVA ARENA: HACKERRANK SPLIT VIEW (LEFT: QUESTION, RIGHT: CODE)
  // =========================================================================
  return (
    <div style={{ maxWidth: '1680px', margin: '20px auto', padding: '0 24px' }}>
      {/* Top Header Bar with 15-Minute Countdown */}
      <div className="glass-panel" style={{ padding: '14px 24px', marginBottom: '18px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
          {/* Left: Step & Student Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* 15-Minute Countdown Badge */}
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
                fontSize: '15px',
                fontWeight: 800,
                color: isTimeCritical ? '#EF4444' : isTimeWarning ? '#B45309' : 'var(--ink)'
              }}>
                {formatTime(remainingSec)}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                / 15:00
              </span>
            </div>

            <span className="badge badge-dark">
              {selectedDomain === 'webdev' ? 'Web Development Track' : 'DSA Track'}
            </span>

            {/* Step Progress Pill */}
            <span className="badge badge-purple" style={{ fontSize: '11px' }}>
              {currentStep === 1 && 'Step 1: Introduction'}
              {currentStep === 2 && 'Step 2: Declare Strong Topic'}
              {currentStep === 3 && 'Step 3: Strong Topic Depth'}
              {currentStep >= 4 && 'Step 4: Broad Adaptive Probing'}
            </span>
          </div>

          {/* Candidate Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
              {studentName} ({rollNumber})
            </span>

            <button
              onClick={() => handleEndViva()}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '5px 12px', color: '#BE123C' }}
            >
              Conclude Exam Early
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switch Alert (Anti-Cheating) */}
      {tabSwitchAlert && (
        <div style={{
          background: '#FFF1F2',
          border: '1.5px solid #E11D48',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: '#9F1239'
        }}>
          <AlertTriangle size={18} color="#E11D48" />
          <span>
            <strong>Anti-Cheating Notice:</strong> Window unfocused (#{tabSwitchCount}). Focus loss logged to audit records.
          </span>
        </div>
      )}

      {/* Silence Nudge Alert */}
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
            Submit Answer
          </button>
        </div>
      )}

      {/* =====================================================================
          HACKERRANK SPLIT VIEW: LEFT (QUESTION & SPEECH) | RIGHT (CODE ARENA)
          ===================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(420px, 45%) minmax(500px, 55%)',
        gap: '20px',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: Question Probe, Voice Catching, Proctors & Transcript */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Question Card */}
          <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-purple">{questionType}</span>
                {lastLatencyMs && (
                  <span className="mono" style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                    ⚡ {lastLatencyMs}ms turnaround
                  </span>
                )}
              </div>

              {isAiSpeaking && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Volume2 size={16} color="var(--ice)" />
                  <span style={{ fontSize: '12px', color: 'var(--ice)', fontWeight: 700 }}>
                    Examiner Speaking...
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

            {/* Question Text Box */}
            <div style={{
              background: '#F8FAFC',
              border: '1px solid var(--rule)',
              borderRadius: 'var(--radius-md)',
              padding: '18px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--nebula)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Examiner Question:
              </div>
              <p style={{
                fontFamily: 'var(--body)',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--ink)',
                lineHeight: '1.5',
                margin: 0
              }}>
                {aiQuestion || 'Connecting to viva engine...'}
              </p>
            </div>

            {/* Spoken Answer Input Area */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)' }}>
                  Spoken Answer (Hindi/Hinglish Supported):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="sun-pulse" style={{ width: '7px', height: '7px', background: isListening ? '#10B981' : '#94A3B8' }} />
                  <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    {isListening ? 'Voice Catching Active' : 'Mic Off'}
                  </span>
                </div>
              </div>

              <textarea
                value={studentInput}
                onChange={e => setStudentInput(e.target.value)}
                placeholder="Speak your answer naturally into the microphone, or type here..."
                rows={3}
                className="input-field"
                style={{ fontSize: '13px', lineHeight: '1.45', resize: 'vertical' }}
              />
            </div>

            {/* Question Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleTurnSubmit(false, true)}
                  disabled={isSubmitting}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  <HelpCircle size={13} color="var(--sun)" />
                  Ask Socratic Hint
                </button>

                <button
                  type="button"
                  onClick={() => handleTurnSubmit(true, false)}
                  disabled={isSubmitting}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                >
                  <FastForward size={13} />
                  Next Topic
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTurnSubmit(false, false)}
                disabled={isSubmitting || (!studentInput.trim() && !codeContent.trim())}
                className="btn btn-primary"
                style={{ padding: '7px 20px', fontSize: '12px' }}
              >
                <Send size={13} />
                {isSubmitting ? 'Evaluating...' : 'Submit Spoken Answer'}
              </button>
            </div>
          </div>

          {/* Front Camera & Screen Recording Widget (Picture-in-Picture) */}
          <div className="glass-panel" style={{ padding: '16px 20px', background: '#FFFFFF' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
              Anti-Cheating Live Proctors:
            </div>
            <ScreenAndCameraRecorder
              isStarted={isStarted}
              onIntegrityAlert={(type, details) => {
                fetch(`${API_BASE}/api/session/integrity`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    session_id: sessionId,
                    event_type: type,
                    details: details,
                    timestamp_sec: elapsedSeconds
                  })
                }).catch(e => console.warn(e));
              }}
            />
          </div>

          {/* Transcript History */}
          <div className="glass-panel" style={{ padding: '18px', background: '#FFFFFF', maxHeight: '340px', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '10px' }}>
              Verbatim Viva Transcript:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {transcriptFeed.map((item, idx) => {
                const isExaminer = item.speaker.includes('AI') || item.speaker.includes('Examiner');
                return (
                  <div
                    key={idx}
                    style={{
                      background: isExaminer ? '#F8FAFC' : '#EEF2FF',
                      border: `1px solid ${isExaminer ? 'var(--rule)' : 'rgba(99, 102, 241, 0.25)'}`,
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 800 }}>
                      <span style={{ color: isExaminer ? 'var(--nebula)' : '#1E1B4B' }}>{item.speaker}</span>
                      <span className="mono" style={{ fontSize: '10px', color: 'var(--muted)' }}>{item.time}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--ink)' }}>{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: FULL HACKERRANK-STYLE CODE WRITING PANEL */}
        <div style={{ position: 'sticky', top: '90px' }}>
          <HackerRankCodeEditor
            subject={selectedDomain}
            code={codeContent}
            onChange={setCodeContent}
            onSubmitSolution={(codeToSubmit) => {
              handleTurnSubmit(false, false, codeToSubmit);
            }}
          />
        </div>
      </div>

      {/* Final Scorecard Modal */}
      <ScorecardModal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        result={completionResult}
        studentName={studentName}
        studentId={rollNumber}
        subjectTitle={selectedDomain === 'webdev' ? 'Web Development Track' : 'DSA Track'}
      />
    </div>
  );
}
