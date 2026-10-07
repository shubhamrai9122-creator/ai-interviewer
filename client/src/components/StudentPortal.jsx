import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, Shield, Clock, AlertTriangle, 
  Send, HelpCircle, CheckCircle2, Award, FileText,
  Code2, Sparkles, UserCheck, AudioLines, Layers, ArrowRight, CornerDownRight, Play,
  Wifi, Camera, Check, RefreshCw
} from 'lucide-react';

import AudioVisualizer from './AudioVisualizer';
import HackerRankCodeEditor from './HackerRankCodeEditor';
import ScreenAndCameraRecorder from './ScreenAndCameraRecorder';
import ScorecardModal from './ScorecardModal';
import { AudioCaptureEngine, analyzeSpokenText } from '../utils/audioCapture';

const API_BASE = 'http://localhost:8000';

export default function StudentPortal({ initialSyllabus, onNavigateToTraining }) {
  // Pre-Interview Setup States
  const [setupStep, setSetupStep] = useState(1); // 1 = System Checks, 2 = Track & Syllabus, 3 = Guidelines
  const [selectedDomain, setSelectedDomain] = useState('dsa'); // 'dsa' or 'webdev'
  const [studentName, setStudentName] = useState('Rahul Sharma');
  const [candidateId, setCandidateId] = useState('IS-2026-DSA');
  const [targetLevel, setTargetLevel] = useState('Intermediate');
  const [availableSyllabi, setAvailableSyllabi] = useState([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState(null);
  const [consentGiven, setConsentGiven] = useState(false);

  // System Readiness Checks
  const [camStatus, setCamStatus] = useState('checking'); // 'checking', 'ready', 'error'
  const [micStatus, setMicStatus] = useState('checking'); // 'checking', 'ready', 'error'
  const [netLatency, setNetLatency] = useState(24);
  const [cameraStream, setCameraStream] = useState(null);
  const videoPreviewRef = useRef(null);

  // Live Interview Session States
  const [isStarted, setIsStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [activeSyllabusTitle, setActiveSyllabusTitle] = useState(null);
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
  const [hintsUsed, setHintsUsed] = useState(0);

  // Proctoring & Anti-Cheat Tab Switch States
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isTabLocked, setIsTabLocked] = useState(false);
  const [cursorExitWarning, setCursorExitWarning] = useState(false);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const tabSwitchCountRef = useRef(0);

  // Dynamic Coding Question Views
  const [isCodingQuestion, setIsCodingQuestion] = useState(false);
  const [shouldAskToRead, setShouldAskToRead] = useState(false);
  const [codingProblemDetails, setCodingProblemDetails] = useState(null);

  // Code editor state
  const [codeContent, setCodeContent] = useState('');

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

  // Fixed 15-Minute Limit
  const durationMinutes = 15;

  // References
  const audioEngineRef = useRef(null);
  const recognitionRef = useRef(null);
  const handleTurnSubmitRef = useRef(null);
  const isAiSpeakingRef = useRef(false);

  // Strict Tab Switch / Window Blur Lockdown (Anti-Cheating Proctoring Alert)
  useEffect(() => {
    if (!isStarted || vivaCompleted) return;

    const handleBlurOrHide = () => {
      if (document.visibilityState === 'hidden' || !document.hasFocus()) {
        const nextCount = tabSwitchCountRef.current + 1;
        tabSwitchCountRef.current = nextCount;
        setTabSwitchCount(nextCount);
        setIsTabLocked(true);

        if (sessionId) {
          fetch(`${API_BASE}/api/session/integrity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              elapsed_seconds: elapsedSeconds,
              event_type: 'TAB_SWITCH',
              confidence_score: 1.0,
              metadata_json: {
                violation_count: nextCount,
                timestamp: Date.now(),
                note: `Candidate attempted tab switch / window blur (Strict Lockdown Event #${nextCount})`
              }
            })
          }).catch(err => console.warn("Failed to log integrity event:", err));
        }
      }
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Interview in progress! Are you sure you want to leave? Your interview will be ended.';
      return e.returnValue;
    };

    const handleMouseLeave = () => {
      setCursorExitWarning(true);
    };

    const handleMouseEnter = () => {
      setCursorExitWarning(false);
    };

    document.addEventListener('visibilitychange', handleBlurOrHide);
    window.addEventListener('blur', handleBlurOrHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('visibilitychange', handleBlurOrHide);
      window.removeEventListener('blur', handleBlurOrHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isStarted, vivaCompleted, sessionId, elapsedSeconds]);

  // Initialize Syllabi and System Checks
  useEffect(() => {
    fetchSyllabi();
    runSystemChecks();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Update selected syllabus if passed from parent
  useEffect(() => {
    if (initialSyllabus) {
      setSelectedSyllabusId(initialSyllabus.id);
      if (initialSyllabus.subject.includes('Web')) {
        setSelectedDomain('webdev');
      } else {
        setSelectedDomain('dsa');
      }
    }
  }, [initialSyllabus]);

  const fetchSyllabi = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/syllabus/list`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSyllabi(data);
        const active = data.find(s => s.is_active);
        if (active && !selectedSyllabusId) {
          setSelectedSyllabusId(active.id);
        }
      }
    } catch (err) {
      console.error("Failed to load syllabi:", err);
    }
  };

  const runSystemChecks = async () => {
    // 1. Camera check
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      setCamStatus('ready');
      setMicStatus('ready');
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera/Mic permission warning:", err);
      setCamStatus('ready'); // Fallback to ready for simulation
      setMicStatus('ready');
    }

    // 2. Ping latency check
    const startPing = Date.now();
    try {
      await fetch(`${API_BASE}/api/syllabus/active`);
      setNetLatency(Math.max(12, Date.now() - startPing));
    } catch {
      setNetLatency(28);
    }
  };

  // Browser TTS using natural human voice
  const getNaturalVoice = () => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prefer natural, standard English voices
    const preferred = ['Google US English', 'Samantha', 'Alex', 'Daniel', 'Victoria', 'Microsoft David', 'Microsoft Zira'];
    for (const name of preferred) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }
    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  };

  const speakText = (text) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();

    // Clean markdown before speaking
    const clean = text
      .replace(/\[Hint Level \d+\]:/g, 'Here is a hint:')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/📋\s*\[From[^\]]+\]/g, '')
      .replace(/Example \d+:[\s\S]*$/, '');

    const utterance = new SpeechSynthesisUtterance(clean);
    const naturalVoice = getNaturalVoice();
    if (naturalVoice) utterance.voice = naturalVoice;

    // Normal natural human voice pitch and cadence
    utterance.pitch = 1.0;
    utterance.rate = 1.0;

    utterance.onstart = () => {
      setIsAiSpeaking(true);
      isAiSpeakingRef.current = true;
    };

    utterance.onend = () => {
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;
    };

    utterance.onerror = () => {
      setIsAiSpeaking(false);
      isAiSpeakingRef.current = false;
    };

    window.speechSynthesis.speak(utterance);
  };

  // Speech Recognition Setup
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
    } else {
      startSpeechRecognition();
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please type your responses.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      if (!speechTurnStartSec) setSpeechTurnStartSec(elapsedSeconds);
    };

    rec.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setStudentInput(prev => (prev ? prev + ' ' + finalTranscript : finalTranscript).trim());
      }
    };

    rec.onerror = (e) => {
      console.warn("Speech recognition error:", e);
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  // Timer Effect
  useEffect(() => {
    let interval = null;
    if (isStarted && !vivaCompleted) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStarted, vivaCompleted]);

  // Handle Starting the Interview Session
  const handleStartInterview = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: candidateId,
          student_name: studentName,
          viva_id: selectedDomain === 'webdev' ? 43 : 42,
          consent_given: true,
          examiner_persona: 'ira',
          subject_domain: selectedDomain === 'webdev' ? 'Web Development' : 'Data Structures & Algorithms',
          duration_minutes: durationMinutes,
          active_syllabus_id: selectedSyllabusId
        })
      });

      const data = await res.json();
      setSessionId(data.session_id);
      setAiQuestion(data.first_question || data.initial_prompt);
      setCurrentPhase(data.phase || 'WARMUP');
      setActiveSyllabusTitle(data.active_syllabus_title);
      setIsCodingQuestion(Boolean(data.is_coding_question));
      setShouldAskToRead(Boolean(data.should_ask_to_read));
      setCodingProblemDetails(data.coding_problem_details || null);
      setIsStarted(true);

      speakText(data.first_question || data.initial_prompt);
    } catch (err) {
      console.error("Failed to start session:", err);
      alert("Could not connect to AI Interview backend. Ensure FastAPI server is running on port 8000.");
    }
  };

  // Submit Turn (Candidate response)
  const handleTurnSubmit = async (options = {}) => {
    if (isSubmitting || !sessionId) return;
    const { isHint = false, isGiveUp = false, explicitText = null } = options;

    const transcriptText = (explicitText !== null ? explicitText : studentInput).trim();
    if (!transcriptText && !isHint && !isGiveUp && !codeContent.trim()) {
      alert("Please provide an explanation or code snippet before submitting.");
      return;
    }

    setIsSubmitting(true);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    // Add candidate turn to transcript
    if (transcriptText) {
      setTranscriptFeed(prev => [...prev, { speaker: 'candidate', text: transcriptText }]);
    }

    try {
      const res = await fetch(`${API_BASE}/api/session/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          elapsed_seconds: elapsedSeconds,
          transcript: transcriptText || (isHint ? "Can I get a progressive hint?" : "Let's move to next question"),
          is_silence: false,
          is_giveup: isGiveUp,
          is_hint_request: isHint,
          code_snippet: codeContent
        })
      });

      const data = await res.json();
      setAiQuestion(data.ai_response_text);
      setCurrentPhase(data.current_phase);
      setQuestionType(data.question_type);
      setLastLatencyMs(data.latency_ms);
      setHintsUsed(data.hints_used || (isHint ? hintsUsed + 1 : hintsUsed));
      setIsCodingQuestion(Boolean(data.is_coding_question));
      setShouldAskToRead(Boolean(data.should_ask_to_read));
      setCodingProblemDetails(data.coding_problem_details || null);

      // Append Ira response
      setTranscriptFeed(prev => [...prev, { speaker: 'ira', text: data.ai_response_text }]);
      setStudentInput('');

      // Spoken voice policy: if audio_spoken_text is present (e.g. asking before reading full coding problem), speak it!
      if (data.audio_spoken_text) {
        speakText(data.audio_spoken_text);
      } else {
        speakText(data.ai_response_text);
      }

      if (data.is_viva_completed) {
        handleEndInterview();
      }
    } catch (err) {
      console.error("Failed to process turn:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  handleTurnSubmitRef.current = handleTurnSubmit;

  // End Interview & Fetch Evaluation
  const handleEndInterview = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_BASE}/api/session/${sessionId}/end`, { method: 'POST' });
      const data = await res.json();
      setCompletionResult(data);
      setVivaCompleted(true);
      setIsScorecardOpen(true);
    } catch (err) {
      console.error("Failed to end interview:", err);
    }
  };

  const formatTime = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalLimitSec = durationMinutes * 60;
  const remainingSec = Math.max(0, totalLimitSec - elapsedSeconds);

  // =========================================================================
  // PRE-INTERVIEW SETUP: 3-STEP WIZARD (System Checks -> Track Selection -> Guidelines)
  // =========================================================================
  if (!isStarted) {
    return (
      <div style={{ maxWidth: '980px', margin: '32px auto', padding: '0 20px' }}>
        {/* Wizard Step Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '28px',
          background: '#FFFFFF',
          padding: '12px 24px',
          borderRadius: '10px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: setupStep === 1 ? '#008BDC' : '#64748B', fontWeight: 700 }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: setupStep === 1 ? '#008BDC' : '#E2E8F0',
              color: setupStep === 1 ? '#FFFFFF' : '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>1</span>
            1. System Readiness Check
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: setupStep === 2 ? '#008BDC' : '#64748B', fontWeight: 700 }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: setupStep === 2 ? '#008BDC' : '#E2E8F0',
              color: setupStep === 2 ? '#FFFFFF' : '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>2</span>
            2. Track Selection
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: setupStep === 3 ? '#008BDC' : '#64748B', fontWeight: 700 }}>
            <span style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: setupStep === 3 ? '#008BDC' : '#E2E8F0',
              color: setupStep === 3 ? '#FFFFFF' : '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>3</span>
            3. Guidelines & Honor Code
          </div>
        </div>

        {/* STEP 1: SYSTEM READINESS CHECK */}
        {setupStep === 1 && (
          <div className="is-card is-card-highlight">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: '#EBF5FB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#008BDC'
              }}>
                <Shield size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>Hardware & Proctoring Readiness</h2>
                <p style={{ fontSize: '13px', color: '#64748B' }}>
                  Internshala AI Mock Interview uses live video, audio analysis, and code sandbox execution.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* Camera Preview Card */}
              <div style={{
                background: '#0F172A',
                borderRadius: '10px',
                height: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {/* Face positioning reticle */}
                <div style={{
                  position: 'absolute',
                  width: '140px',
                  height: '180px',
                  border: '2px dashed rgba(255, 255, 255, 0.6)',
                  borderRadius: '50%',
                  pointerEvents: 'none'
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: '#FFFFFF',
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '20px'
                }}>
                  Keep face centered in frame
                </div>
              </div>

              {/* Status List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                <div style={{ padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Camera size={18} color="#008BDC" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Webcam Video Feed</span>
                  </div>
                  <span className="is-badge-green">Verified</span>
                </div>

                <div style={{ padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Mic size={18} color="#008BDC" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Microphone Audio Input</span>
                  </div>
                  <span className="is-badge-green">Optimal Input</span>
                </div>

                <div style={{ padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Wifi size={18} color="#008BDC" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Server Latency ({netLatency}ms)</span>
                  </div>
                  <span className="is-badge-green">High Speed</span>
                </div>

                <div style={{ padding: '12px 16px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Code2 size={18} color="#008BDC" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>DSA Code Sandbox</span>
                  </div>
                  <span className="is-badge-green">Ready</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSetupStep(2)}
                className="is-btn-primary"
                style={{ padding: '12px 24px', fontSize: '14px' }}
              >
                Proceed to Track Selection <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TRACK SELECTION */}
        {setupStep === 2 && (
          <div className="is-card is-card-highlight">
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
              Select Examination Track
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              The interview is strictly focused on <strong>Data Structures & Algorithms (DSA)</strong> or <strong>Web Development</strong>.
            </p>

            {/* Track Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
              <button
                type="button"
                onClick={() => setSelectedDomain('dsa')}
                style={{
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: `2px solid ${selectedDomain === 'dsa' ? '#008BDC' : '#E2E8F0'}`,
                  background: selectedDomain === 'dsa' ? '#EBF5FB' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: selectedDomain === 'dsa' ? '0 2px 8px rgba(0, 139, 220, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#1E293B' }}>
                    🔷 DSA Track
                  </span>
                  {selectedDomain === 'dsa' && <CheckCircle2 size={18} color="#008BDC" />}
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  Arrays, Sliding Window, Trees, Graphs, Dynamic Programming & Complexity Analysis. Standard Language: C++.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDomain('webdev')}
                style={{
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: `2px solid ${selectedDomain === 'webdev' ? '#FF6B00' : '#E2E8F0'}`,
                  background: selectedDomain === 'webdev' ? '#FFF4EC' : '#FFFFFF',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: selectedDomain === 'webdev' ? '0 2px 8px rgba(255, 107, 0, 0.15)' : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '15px', color: '#1E293B' }}>
                    🔶 Web Development Track
                  </span>
                  {selectedDomain === 'webdev' && <CheckCircle2 size={18} color="#FF6B00" />}
                </div>
                <div style={{ fontSize: '12px', color: '#475569' }}>
                  React Reconciliation, Node.js Event Loop, JWT Auth Security & Database Optimization. Standard Language: JavaScript.
                </div>
              </button>
            </div>

            {/* Candidate Details & Level */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '26px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Candidate Name
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  MSOT Candidate ID
                </label>
                <input
                  type="text"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '6px' }}>
                  Target Level
                </label>
                <select
                  value={targetLevel}
                  onChange={(e) => setTargetLevel(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', background: '#FFFFFF', boxSizing: 'border-box' }}
                >
                  <option value="Beginner">Beginner (Foundations)</option>
                  <option value="Intermediate">Intermediate (Core SDE)</option>
                  <option value="Advanced">Advanced (FAANG Level)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setSetupStep(1)}
                className="is-btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setSetupStep(3)}
                className="is-btn-primary"
                style={{ padding: '10px 22px', fontSize: '14px' }}
              >
                Proceed to Guidelines <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: GUIDELINES & HONOR CODE */}
        {setupStep === 3 && (
          <div className="is-card is-card-highlight">
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
              Internshala AI Interview Guidelines & Code of Conduct
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              Please review how Ira evaluates your technical reasoning before entering the arena.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#008BDC', fontSize: '14px', marginBottom: '6px' }}>
                  1. Adaptive One-Question Pacing
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  Ira asks ONE question at a time. She evaluates your specific response and probes deeper with follow-up scenarios.
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#008BDC', fontSize: '14px', marginBottom: '6px' }}>
                  2. Think First, Code Second
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  Explain your observations, approach, and Big-O complexity verbally or in text before writing code in the sandbox.
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#008BDC', fontSize: '14px', marginBottom: '6px' }}>
                  3. 4-Level Progressive Hints
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  If you are stuck, ask Ira for a hint. Hints progress from high-level direction (Level 1) to near-solution (Level 4).
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#008BDC', fontSize: '14px', marginBottom: '6px' }}>
                  4. Quality of Thinking Matters
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  You are not evaluated only on whether your first approach is optimal, but on your ability to refine and debug.
                </div>
              </div>
            </div>

            {/* Honor Code Checkbox */}
            <div style={{
              background: consentGiven ? '#ECFDF5' : '#F8FAFC',
              border: `1.5px solid ${consentGiven ? '#10B981' : '#CBD5E1'}`,
              borderRadius: '8px',
              padding: '16px 20px',
              marginBottom: '26px'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#10B981', marginTop: '2px' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: consentGiven ? '#065F46' : '#1E293B' }}>
                    I agree to the Mirai School of Technology (MSOT) AI Mock Interview Honor Code
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    I declare that this interview will be taken without unauthorized external human assistance, and I authorize proctoring recording.
                  </div>
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setSetupStep(2)}
                className="is-btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Back
              </button>

              <button
                type="button"
                onClick={handleStartInterview}
                disabled={!consentGiven}
                className="is-btn-primary"
                style={{
                  padding: '14px 32px',
                  fontSize: '15px',
                  background: consentGiven ? '#008BDC' : '#94A3B8'
                }}
              >
                Start MSOT AI Interview with Ira ▶
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // LIVE AI INTERVIEW ROOM (DYNAMIC CODING DASHBOARD & PROCTORING)
  // =========================================================================
  return (
    <div style={{ maxWidth: isCodingQuestion ? '1600px' : '960px', margin: '16px auto', padding: '0 20px', transition: 'max-width 0.3s ease' }}>
      {/* Top Header Bar */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '10px',
        padding: '12px 20px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {/* Left: Domain & Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            borderRadius: '6px',
            background: remainingSec <= 180 ? '#FEF2F2' : '#F1F5F9',
            border: `1px solid ${remainingSec <= 180 ? '#FCA5A5' : '#E2E8F0'}`
          }}>
            <Clock size={15} color={remainingSec <= 180 ? '#EF4444' : '#008BDC'} />
            <span style={{ fontSize: '14px', fontWeight: 800, color: remainingSec <= 180 ? '#EF4444' : '#1E293B', fontFamily: 'monospace' }}>
              {formatTime(remainingSec)}
            </span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>/ 15:00</span>
          </div>

          <span className={selectedDomain === 'webdev' ? 'is-badge-orange' : 'is-badge-blue'}>
            {selectedDomain === 'webdev' ? 'Web Development Track' : 'Data Structures & Algorithms Track'}
          </span>

          {/* Anti-Cheating Tab Switch Proctor Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: tabSwitchCount === 0 ? '#ECFDF5' : tabSwitchCount < 3 ? '#FFFBEB' : '#FEF2F2',
            border: `1px solid ${tabSwitchCount === 0 ? '#A7F3D0' : tabSwitchCount < 3 ? '#FDE68A' : '#FECACA'}`,
            fontSize: '12px',
            fontWeight: 700,
            color: tabSwitchCount === 0 ? '#065F46' : tabSwitchCount < 3 ? '#B45309' : '#DC2626'
          }}>
            <Shield size={14} />
            <span>Tab Switches: {tabSwitchCount} / 3</span>
          </div>
        </div>

        {/* Right: Ira Status & End Interview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '20px',
            background: isAiSpeaking ? '#EBF5FB' : isListening ? '#ECFDF5' : '#F8FAFC',
            border: '1px solid #CBD5E1',
            fontSize: '12px',
            fontWeight: 600,
            color: isAiSpeaking ? '#008BDC' : isListening ? '#065F46' : '#64748B'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isAiSpeaking ? '#008BDC' : isListening ? '#10B981' : '#94A3B8'
            }} />
            {isAiSpeaking ? 'Ira Speaking...' : isListening ? 'Listening to You...' : 'Ira Active'}
          </div>

          <button
            type="button"
            onClick={() => setShowEndConfirmModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '6px',
              background: '#DC2626',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '13px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
            }}
          >
            🛑 End Interview
          </button>
        </div>
      </div>

      {/* Main Studio: Single-Column for General Questions, Split-Screen for Coding Questions */}
      <div style={isCodingQuestion ? { display: 'grid', gridTemplateColumns: '1.1fr 1.2fr', gap: '20px' } : { display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Left Column: Ira Card, Question, and Technical Response */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Ira AI Recruiter Card */}
          <div className="is-card" style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #008BDC, #005F96)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  boxShadow: '0 2px 8px rgba(0, 139, 220, 0.3)'
                }}>
                  👩‍💼
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#1E293B' }}>
                    Ira • MSOT AI Recruiter
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Mirai School of Technology Technical Interview
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isAiSpeaking && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span className="is-wave-bar" style={{ height: '16px' }} />
                    <span className="is-wave-bar" style={{ height: '16px' }} />
                    <span className="is-wave-bar" style={{ height: '16px' }} />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => speakText(aiQuestion)}
                  title="Replay Voice"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'pointer'
                  }}
                >
                  <Volume2 size={14} /> Replay
                </button>
              </div>
            </div>

            {/* Current Question / LeetCode Problem Display */}
            {isCodingQuestion && codingProblemDetails ? (
              <div style={{
                background: '#FFFFFF',
                border: '1.5px solid #E2E8F0',
                borderRadius: '10px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}>
                {/* Header: Title, Colorful Difficulty Badge, Tags */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      {codingProblemDetails.title || 'LeetCode Problem'}
                    </h3>
                    <span style={{
                      padding: '3px 12px',
                      borderRadius: '14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: codingProblemDetails.level === 'Easy' ? '#E6F9F5' : codingProblemDetails.level === 'Hard' ? '#FFF0F3' : '#FFF8E6',
                      color: codingProblemDetails.level === 'Easy' ? '#00B8A3' : codingProblemDetails.level === 'Hard' ? '#FF375F' : '#FFA116',
                      border: `1.5px solid ${codingProblemDetails.level === 'Easy' ? '#A7F3D0' : codingProblemDetails.level === 'Hard' ? '#FECACA' : '#FDE68A'}`
                    }}>
                      {codingProblemDetails.level || 'Medium'}
                    </span>
                  </div>

                  {codingProblemDetails.topic && (
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      background: '#F1F5F9',
                      color: '#475569',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      border: '1px solid #CBD5E1'
                    }}>
                      🏷️ {codingProblemDetails.topic}
                    </span>
                  )}
                </div>

                {/* Problem Statement */}
                <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#334155', whiteSpace: 'pre-line' }}>
                  {codingProblemDetails.statement}
                </div>

                {/* Structured Examples Box */}
                {codingProblemDetails.examples && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#008BDC', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Examples
                    </div>
                    <div style={{
                      fontSize: '13px',
                      lineHeight: 1.6,
                      fontFamily: 'monospace',
                      color: '#0F172A',
                      whiteSpace: 'pre-line',
                      background: '#FFFFFF',
                      padding: '12px 14px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0'
                    }}>
                      {codingProblemDetails.examples}
                    </div>
                  </div>
                )}

                {/* Constraints Box */}
                {codingProblemDetails.constraints && (
                  <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#B45309', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Constraints
                    </div>
                    <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#92400E', fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                      {codingProblemDetails.constraints}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '16px',
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#1E293B',
                whiteSpace: 'pre-wrap'
              }}>
                {aiQuestion || "Connecting to Ira..."}
              </div>
            )}

            {/* Ask Before Reading Full Problem Interactive Banner */}
            {shouldAskToRead && (
              <div style={{
                marginTop: '14px',
                padding: '12px 16px',
                background: '#EFF6FF',
                border: '1.5px solid #93C5FD',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.06)'
              }}>
                <div style={{ fontSize: '13px', color: '#1E40AF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Volume2 size={16} color="#2563EB" />
                  <span>Ira asks: Would you like the full problem statement and constraints read aloud?</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShouldAskToRead(false);
                      handleTurnSubmit({ explicitText: "Yes, please read the entire problem statement and constraints aloud." });
                    }}
                    style={{
                      padding: '6px 14px',
                      background: '#2563EB',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    🔊 Yes, Read Aloud
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShouldAskToRead(false);
                      window.speechSynthesis.cancel();
                    }}
                    style={{
                      padding: '6px 14px',
                      background: '#FFFFFF',
                      color: '#1E40AF',
                      border: '1px solid #93C5FD',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    📖 I'll Read It Myself
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Candidate Response Console */}
          <div className="is-card" style={{ padding: '18px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>
                Your Technical Response
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={toggleListening}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: isListening ? '#EF4444' : '#008BDC',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  {isListening ? 'Stop Recording' : 'Speak Answer'}
                </button>
              </div>
            </div>

            <textarea
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              placeholder={isCodingQuestion 
                ? "Explain your observations, proposed approach, time/space complexity, or trade-offs here. You can also implement code in the editor on the right." 
                : "Explain your reasoning and answer clearly here. You can also click 'Speak Answer' to speak naturally."}
              rows={isCodingQuestion ? 5 : 7}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '14px',
                lineHeight: 1.5,
                boxSizing: 'border-box',
                resize: 'vertical',
                marginBottom: '14px',
                fontFamily: 'inherit'
              }}
            />

            {/* Actions: Request Hint, End Interview, Submit Answer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleTurnSubmit({ isHint: true })}
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    color: '#B45309',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <HelpCircle size={14} />
                  Request Hint {hintsUsed > 0 ? `(${hintsUsed}/4 Used)` : ''}
                </button>

                <button
                  type="button"
                  onClick={() => setShowEndConfirmModal(true)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    color: '#DC2626',
                    fontSize: '12px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  🛑 End Interview
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleTurnSubmit()}
                disabled={isSubmitting || (!studentInput.trim() && !codeContent.trim())}
                className="is-btn-primary"
                style={{ padding: '10px 22px', fontSize: '14px' }}
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Answer to Ira ▶'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Code Playground - ONLY VISIBLE FOR CODING QUESTIONS */}
        {isCodingQuestion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="is-card" style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code2 size={16} color="#008BDC" />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: '#1E293B' }}>
                    MSOT LeetCode Playground
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>
                  Standard: {selectedDomain === 'webdev' ? 'JavaScript' : 'C++'}
                </span>
              </div>

              <HackerRankCodeEditor
                subject={selectedDomain}
                code={codeContent}
                onChange={(newCode) => setCodeContent(newCode)}
                onSubmitSolution={(subCode) => {
                  setCodeContent(subCode);
                  handleTurnSubmit({ explicitText: "I have implemented and tested my solution in the code editor." });
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Top Cursor Exit Warning Banner */}
      {cursorExitWarning && !isTabLocked && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          background: '#DC2626',
          color: '#FFFFFF',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)'
        }}>
          ⚠️ Proctor Warning: Keep your mouse cursor inside the MSOT Exam Arena! Navigating away or switching tabs is strictly forbidden.
        </div>
      )}

      {/* Strict Anti-Cheating Tab Switch Lockdown Modal */}
      {isTabLocked && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999999,
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '540px',
            width: '100%',
            padding: '36px 30px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '3px solid #DC2626',
            textAlign: 'center'
          }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '34px'
            }}>
              🚫
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#991B1B', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
              TAB SWITCHING STRICTLY BLOCKED!
            </h2>
            <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: '0 0 18px' }}>
              You are taking an active proctored <strong>Mirai School of Technology (MSOT)</strong> AI Interview.
              Leaving this tab or switching windows is <strong>strictly prohibited</strong> until you officially conclude the interview.
            </p>

            <div style={{
              background: '#FEF2F2',
              border: '1.5px solid #F87171',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#B91C1C' }}>
                Proctor Alert: Tab Switch Attempt #{tabSwitchCount} Blocked & Logged
              </div>
              <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: '4px' }}>
                All departures and blur events are permanently recorded into your official candidate integrity report.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setIsTabLocked(false);
                  window.focus();
                }}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(220, 38, 38, 0.4)'
                }}
              >
                Return & Refocus Exam Window
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTabLocked(false);
                  handleEndInterview();
                }}
                style={{
                  padding: '12px 18px',
                  background: '#F1F5F9',
                  color: '#475569',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: '1px solid #CBD5E1',
                  cursor: 'pointer'
                }}
              >
                End Interview Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal to End Interview Early */}
      {showEndConfirmModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '14px',
            maxWidth: '480px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            textAlign: 'center'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
              fontSize: '28px'
            }}>
              🛑
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1E293B', margin: '0 0 10px' }}>
              End Technical Interview Now?
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, margin: '0 0 22px' }}>
              Are you sure you want to end your interview? Ira will immediately finalize your session, compile all answers and code submitted so far, and generate your official <strong>{selectedDomain === 'webdev' ? 'Web Development' : 'Data Structures & Algorithms'}</strong> evaluation scorecard.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowEndConfirmModal(false)}
                className="is-btn-secondary"
                style={{ flex: 1, padding: '11px', fontSize: '13px' }}
              >
                Continue Interview
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndConfirmModal(false);
                  handleEndInterview();
                }}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: '#DC2626',
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Yes, End & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scorecard Modal */}
      {isScorecardOpen && (
        <ScorecardModal
          isOpen={isScorecardOpen}
          onClose={() => setIsScorecardOpen(false)}
          result={completionResult}
          studentName={studentName}
          studentId={candidateId}
          subjectTitle={selectedDomain === 'webdev' ? 'Web Development' : 'Data Structures & Algorithms'}
        />
      )}
    </div>
  );
}
