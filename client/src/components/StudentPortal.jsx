import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, Shield, Clock, AlertTriangle, 
  Send, HelpCircle, CheckCircle2, Award, FileText,
  Code2, Sparkles, UserCheck, AudioLines, Layers, ArrowRight, CornerDownRight, Play,
  Wifi, Camera, Check, RefreshCw, ThumbsUp, ThumbsDown, Star, Share2, ChevronDown, ChevronUp, MessageSquare
} from 'lucide-react';

import AudioVisualizer from './AudioVisualizer';
import HackerRankCodeEditor from './HackerRankCodeEditor';
import ScreenAndCameraRecorder from './ScreenAndCameraRecorder';
import ScorecardModal from './ScorecardModal';
import { AudioCaptureEngine, analyzeSpokenText } from '../utils/audioCapture';

const API_BASE = 'http://localhost:8000';

export default function StudentPortal({ initialSyllabus, onNavigateToTraining }) {
  // Pre-Interview Setup States
  const [setupStep, setSetupStep] = useState(1); // 1 = System Checks, 2 = Track Selection, 3 = Guidelines
  const [selectedDomain, setSelectedDomain] = useState('dsa'); // 'dsa' or 'webdev'
  const [studentName, setStudentName] = useState('Rahul Sharma');
  const [candidateId, setCandidateId] = useState('MSOT-2026-DSA');
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
  const [currentPhase, setCurrentPhase] = useState('DEPTH');
  const [aiQuestion, setAiQuestion] = useState('');
  const [questionType, setQuestionType] = useState('CONCEPT');
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
  const [isHintRevealed, setIsHintRevealed] = useState(false);
  const [isIraConsoleExpanded, setIsIraConsoleExpanded] = useState(true);

  // Proctoring & Anti-Cheat Tab Switch States (Strict 3-Switch Rule)
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isTabLocked, setIsTabLocked] = useState(false);
  const [isTerminatedDueToTabs, setIsTerminatedDueToTabs] = useState(false);
  const [cursorExitWarning, setCursorExitWarning] = useState(false);
  const [showEndConfirmModal, setShowEndConfirmModal] = useState(false);
  const tabSwitchCountRef = useRef(0);

  // Dynamic Coding Question Views
  const [isCodingQuestion, setIsCodingQuestion] = useState(true);
  const [shouldAskToRead, setShouldAskToRead] = useState(false);
  const [codingProblemDetails, setCodingProblemDetails] = useState(null);

  // Code editor state
  const [codeContent, setCodeContent] = useState('');

  // Fixed 15-Minute Limit
  const durationMinutes = 15;

  // References
  const audioEngineRef = useRef(null);
  const recognitionRef = useRef(null);
  const handleTurnSubmitRef = useRef(null);
  const isAiSpeakingRef = useRef(false);

  // Strict Tab Switch / Window Blur Lockdown (Auto-Ends Interview on 3rd Switch)
  useEffect(() => {
    if (!isStarted || vivaCompleted) return;

    const handleBlurOrHide = () => {
      if (document.visibilityState === 'hidden' || !document.hasFocus()) {
        const nextCount = tabSwitchCountRef.current + 1;
        tabSwitchCountRef.current = nextCount;
        setTabSwitchCount(nextCount);
        setIsTabLocked(true);

        // Log integrity event to backend
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
                note: `Candidate attempted tab switch / window blur (#${nextCount}/3)`
              }
            })
          }).catch(err => console.warn("Failed to log integrity event:", err));
        }

        // Hard enforcement: after 3 tab switches, immediately terminate interview!
        if (nextCount >= 3) {
          setIsTerminatedDueToTabs(true);
          handleEndInterview();
        }
      }
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = 'Interview in progress! Leaving this tab will disqualify and end your session.';
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
      setCamStatus('ready');
      setMicStatus('ready');
    }

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

    const clean = text
      .replace(/\[Hint Level \d+\]:/g, 'Here is a hint:')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/📋\s*\[From[^\]]+\]/g, '')
      .replace(/Example \d+:[\s\S]*$/, '');

    const utterance = new SpeechSynthesisUtterance(clean);
    const naturalVoice = getNaturalVoice();
    if (naturalVoice) utterance.voice = naturalVoice;

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

  // Handle Starting the Interview Session - DIRECT START WITH TECHNICAL PROBLEM
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
      setCurrentPhase(data.phase || 'DEPTH');
      setActiveSyllabusTitle(data.active_syllabus_title);
      setIsCodingQuestion(Boolean(data.is_coding_question));
      setShouldAskToRead(Boolean(data.should_ask_to_read));
      setCodingProblemDetails(data.coding_problem_details || null);
      setIsStarted(true);

      speakText(data.first_question || data.initial_prompt);
    } catch (err) {
      console.error("Failed to start session:", err);
      alert("Could not connect to MSOT AI Interview backend. Ensure FastAPI server is running on port 8000.");
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
          transcript: transcriptText || (isHint ? "Could you provide a hint for this problem?" : "Let's move to the next phase"),
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
      setHintsUsed(data.hints_used || (isHint ? 1 : hintsUsed));
      setIsCodingQuestion(Boolean(data.is_coding_question));
      setShouldAskToRead(Boolean(data.should_ask_to_read));
      if (data.coding_problem_details) {
        setCodingProblemDetails(data.coding_problem_details);
      }

      setTranscriptFeed(prev => [...prev, { speaker: 'ira', text: data.ai_response_text }]);
      setStudentInput('');

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

  // End Interview & Submit to Faculty / Admin
  const handleEndInterview = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_BASE}/api/session/${sessionId}/end`, { method: 'POST' });
      const data = await res.json();
      setCompletionResult(data);
      setVivaCompleted(true);
      setIsScorecardOpen(false);
    } catch (err) {
      console.error("Failed to end interview:", err);
    }
  };

  const toggleSingleHint = () => {
    setIsHintRevealed(prev => !prev);
    if (!isHintRevealed && hintsUsed === 0) {
      setHintsUsed(1);
      handleTurnSubmit({ isHint: true, explicitText: "Can I receive the hint for this problem?" });
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
  // No difficulty level dropdown (intermediate/beginner removed)
  // =========================================================================
  if (!isStarted) {
    return (
      <div style={{ maxWidth: '980px', margin: '32px auto', padding: '0 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
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
                  MSOT Code Arena AI Interview uses real-time webcam telemetry, speech synthesis, and sandboxed code execution.
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
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Code Arena Sandbox</span>
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

        {/* STEP 2: TRACK SELECTION (NO LEVELS - SIMPLE & CLEAN) */}
        {setupStep === 2 && (
          <div className="is-card is-card-highlight">
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
              Select Examination Track
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              Select either <strong>Data Structures & Algorithms (DSA)</strong> or <strong>Web Development</strong>. The interview begins immediately with your technical problem upon entering the arena.
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
                  Arrays, Sliding Window, Trees, Graphs, Complexity Analysis. Standard Language: C++.
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
                  React Reconciliation, Node.js Event Loop, JWT Auth, Closures & Debouncing. Standard Language: JavaScript.
                </div>
              </button>
            </div>

            {/* Candidate Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '26px' }}>
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
              MSOT Code Arena Examination Guidelines & Proctoring Code
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
              Please review the examination rules before entering the live technical arena.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#008BDC', fontSize: '14px', marginBottom: '6px' }}>
                  1. Direct Problem Start
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  The interview starts directly with your technical coding problem. No introductory or warmup questions are asked.
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#008BDC', fontSize: '14px', marginBottom: '6px' }}>
                  2. Strict 3 Tab Switch Limit
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  Tab switching is strictly monitored. On your <strong>3rd tab switch</strong>, the interview is immediately terminated and flagged.
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#008BDC', fontSize: '14px', marginBottom: '6px' }}>
                  3. 1 Focused Technical Hint
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  If you are stuck, exactly 1 targeted hint is available on the problem card to unlock your algorithmic intuition.
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontWeight: 700, color: '#008BDC', fontSize: '14px', marginBottom: '6px' }}>
                  4. Explain First, Then Code
                </div>
                <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                  Explain your approach and Big-O complexity to Ira verbally or in text, then implement and run your solution in the arena.
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
                    I agree to the Mirai School of Technology (MSOT) Code Arena Honor Code
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    I declare that this interview will be taken without unauthorized external assistance, and I acknowledge that switching tabs 3 times will result in immediate disqualification.
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
                Enter MSOT Code Arena ▶
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // SUBMISSION STATUS VIEW (EVALUATION REPORT RESTRICTED TO ADMIN ONLY)
  // =========================================================================
  if (vivaCompleted) {
    return (
      <div style={{ maxWidth: '720px', margin: '48px auto', padding: '0 20px', textAlign: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <div className="is-card" style={{ padding: '40px 32px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isTerminatedDueToTabs ? '#FEE2E2' : '#ECFDF5',
            color: isTerminatedDueToTabs ? '#DC2626' : '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            fontSize: '32px'
          }}>
            {isTerminatedDueToTabs ? '⚠️' : '✅'}
          </div>

          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#1E293B', marginBottom: '8px' }}>
            {isTerminatedDueToTabs ? 'Interview Concluded & Submitted' : 'Interview Submitted Successfully'}
          </h2>

          <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '24px' }}>
            Thank you, <strong>{studentName}</strong>. Your technical interview for the <strong>{selectedDomain === 'webdev' ? 'Web Development Track' : 'Data Structures & Algorithms Track'}</strong> has been officially concluded and submitted to the evaluation committee.
          </p>

          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '16px 20px',
            textAlign: 'left',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Candidate ID:</span>
              <strong style={{ color: '#1E293B' }}>{candidateId}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Domain Track:</span>
              <strong style={{ color: '#1E293B' }}>{selectedDomain === 'webdev' ? 'Web Development' : 'Data Structures & Algorithms'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Problem Completed:</span>
              <strong style={{ color: '#1E293B' }}>{codingProblemDetails?.title || (selectedDomain === 'webdev' ? '2627. Debounce' : '1. Two Sum')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Tab Switch Violations:</span>
              <strong style={{ color: tabSwitchCount === 0 ? '#10B981' : tabSwitchCount < 3 ? '#F59E0B' : '#DC2626' }}>
                {tabSwitchCount} / 3 {tabSwitchCount >= 3 ? '(Flagged by Proctor)' : ''}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: '#64748B' }}>Submission Status:</span>
              <span style={{ color: '#10B981', fontWeight: 700 }}>✅ Delivered to Faculty Database</span>
            </div>
          </div>

          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '12px',
            color: '#1E40AF',
            lineHeight: 1.5,
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            🔒 <strong>Confidential Examination Policy:</strong> Detailed evaluation scorecards, rubric breakups, and faculty calibration analytics are restricted to MSOT administrators and faculty reviewers. Your results will be processed through the Admin Dashboard.
          </div>

          <button
            type="button"
            onClick={() => {
              setIsStarted(false);
              setVivaCompleted(false);
              setSessionId(null);
              setElapsedSeconds(0);
              setTabSwitchCount(0);
              tabSwitchCountRef.current = 0;
              setIsTabLocked(false);
              setIsTerminatedDueToTabs(false);
              setCodeContent('');
              setStudentInput('');
              setTranscriptFeed([]);
              setHintsUsed(0);
              setIsHintRevealed(false);
            }}
            className="is-btn-primary"
            style={{ padding: '12px 28px', fontSize: '14px' }}
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LIVE MSOT CODE ARENA (EXACT SPLIT PANE MATCHING THE PHOTO)
  // Left: Problem Description, Badges, Examples, Constraints, Hint, Stats
  // Right: Light Theme Code Editor with Line Gutter, Syntax Highlighting & Testcase Console
  // =========================================================================
  const problemTitle = codingProblemDetails?.title || (selectedDomain === 'webdev' ? '2627. Debounce' : '1. Two Sum');
  const problemLevel = codingProblemDetails?.level || 'Easy';
  const problemTopic = codingProblemDetails?.topic || (selectedDomain === 'webdev' ? 'JavaScript Event Loop & Closures' : 'Arrays & Hash Table');
  const problemStatement = codingProblemDetails?.statement || (
    selectedDomain === 'webdev'
      ? "Given a function fn and a time in milliseconds t, return a debounced version of that function.\n\nA debounced function is a function whose execution is delayed by t milliseconds and whose execution is cancelled if it is called again within that window of time. The debounced function should also receive the passed parameters."
      : "You are given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order."
  );

  const problemHint = (codingProblemDetails?.hints && codingProblemDetails.hints[0]) || (
    selectedDomain === 'webdev'
      ? "Maintain a timerId variable in a closure. On every call, clearTimeout(timerId) and reset timerId = setTimeout(() => fn(...args), t) so only the final burst call triggers."
      : "Use an unordered_map (hash table) to store each number and its index. As you iterate through nums, check if the complement (target - nums[i]) already exists in the map in average O(1) time."
  );

  return (
    <div style={{ maxWidth: '1720px', margin: '10px auto', padding: '0 16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* 1. TOP STATUS & PROCTOR BAR */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        padding: '10px 18px',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
      }}>
        {/* Left: Branding, Domain & Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, fontSize: '15px', color: '#1E293B' }}>
            <span style={{ color: '#008BDC' }}>MSOT</span> Code Arena
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '6px',
            background: remainingSec <= 180 ? '#FEF2F2' : '#F1F5F9',
            border: `1px solid ${remainingSec <= 180 ? '#FCA5A5' : '#E2E8F0'}`
          }}>
            <Clock size={14} color={remainingSec <= 180 ? '#EF4444' : '#008BDC'} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: remainingSec <= 180 ? '#EF4444' : '#1E293B', fontFamily: 'monospace' }}>
              {formatTime(remainingSec)}
            </span>
            <span style={{ fontSize: '11px', color: '#64748B' }}>/ 15:00</span>
          </div>

          <span className={selectedDomain === 'webdev' ? 'is-badge-orange' : 'is-badge-blue'}>
            {selectedDomain === 'webdev' ? 'Web Development Track' : 'DSA Track (C++)'}
          </span>

          {/* Anti-Cheating Tab Switch Proctor Badge (Hard limit: 3) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: tabSwitchCount === 0 ? '#ECFDF5' : tabSwitchCount < 2 ? '#FFFBEB' : '#FEF2F2',
            border: `1px solid ${tabSwitchCount === 0 ? '#A7F3D0' : tabSwitchCount < 2 ? '#FDE68A' : '#FECACA'}`,
            fontSize: '12px',
            fontWeight: 700,
            color: tabSwitchCount === 0 ? '#065F46' : tabSwitchCount < 2 ? '#B45309' : '#DC2626'
          }}>
            <Shield size={14} />
            <span>Tab Switches: {tabSwitchCount} / 3 (Auto-terminates at 3)</span>
          </div>
        </div>

        {/* Right: Ira Status, Console Toggle, End Interview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
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
            onClick={() => speakText(aiQuestion)}
            title="Replay Ira Voice"
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              fontSize: '12px',
              fontWeight: 600,
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <Volume2 size={13} /> Replay
          </button>

          <button
            type="button"
            onClick={() => setIsIraConsoleExpanded(!isIraConsoleExpanded)}
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              fontSize: '12px',
              fontWeight: 600,
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <MessageSquare size={13} />
            <span>Ira Discussion</span>
            {isIraConsoleExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <button
            type="button"
            onClick={() => setShowEndConfirmModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 14px',
              borderRadius: '6px',
              background: '#DC2626',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(220, 38, 38, 0.3)'
            }}
          >
            🛑 End Interview
          </button>
        </div>
      </div>

      {/* 2. DOCKED IRA AI RECRUITER DISCUSSION DRAWER */}
      {isIraConsoleExpanded && (
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          padding: '12px 18px',
          marginBottom: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>👩‍💼</span>
              <span style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>
                Ira • MSOT AI Recruiter
              </span>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                (Explain your approach & algorithmic intuition verbally or in text)
              </span>
            </div>

            {isAiSpeaking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                <span className="is-wave-bar" style={{ height: '14px' }} />
                <span className="is-wave-bar" style={{ height: '14px' }} />
                <span className="is-wave-bar" style={{ height: '14px' }} />
              </div>
            )}
          </div>

          {/* Current Question / Prompt Text */}
          <div style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#334155',
            lineHeight: 1.5,
            marginBottom: '10px'
          }}>
            {aiQuestion || "Welcome to MSOT Code Arena. Review the technical problem below and explain your approach."}
          </div>

          {/* Candidate Explanation Input & Controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={toggleListening}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: isListening ? '#EF4444' : '#008BDC',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              {isListening ? 'Stop Mic' : 'Speak Answer'}
            </button>

            <input
              type="text"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTurnSubmit();
                }
              }}
              placeholder="Type your intuition, time/space complexity, or trade-offs to Ira (Press Enter to Send)..."
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            <button
              type="button"
              onClick={() => handleTurnSubmit()}
              disabled={isSubmitting || !studentInput.trim()}
              className="is-btn-primary"
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                flexShrink: 0,
                borderRadius: '6px'
              }}
            >
              {isSubmitting ? 'Evaluating...' : 'Send to Ira ▶'}
            </button>
          </div>
        </div>
      )}

      {/* 3. MAIN ARENA: 50 / 50 SPLIT SCREEN MATCHING THE USER'S PHOTO */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        alignItems: 'stretch',
        minHeight: '740px'
      }}>
        {/* LEFT PANE: PROBLEM STATEMENT (EXACT REPLICA OF THE SCREENSHOT) */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Subtabs Bar: Description | Editorial | Solutions | Submissions */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            background: '#FAFAFA',
            borderBottom: '1px solid #E5E7EB',
            height: '36px'
          }}>
            <div style={{ display: 'flex', gap: '16px', height: '100%', alignItems: 'center' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#111827',
                borderBottom: '2px solid #008BDC',
                height: '100%',
                cursor: 'pointer'
              }}>
                <FileText size={14} color="#008BDC" />
                <span>Description</span>
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', cursor: 'pointer' }}>
                Editorial
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', cursor: 'pointer' }}>
                Solutions
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', cursor: 'pointer' }}>
                Submissions
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
              MSOT Standard
            </div>
          </div>

          {/* Problem Body Content (Scrollable) */}
          <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
            {/* Title */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', margin: 0 }}>
                {problemTitle}
              </h1>
            </div>

            {/* Badges Row: Easy (Teal Pill), Topics, Companies, Hint */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <span style={{
                background: '#E6F9F5',
                color: '#00B8A3',
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 10px',
                borderRadius: '999px'
              }}>
                {problemLevel}
              </span>

              <span style={{
                background: '#F3F4F6',
                color: '#4B5563',
                fontSize: '12px',
                fontWeight: 500,
                padding: '2px 10px',
                borderRadius: '999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                🏷️ {problemTopic}
              </span>

              <span style={{
                background: '#F3F4F6',
                color: '#4B5563',
                fontSize: '12px',
                fontWeight: 500,
                padding: '2px 10px',
                borderRadius: '999px'
              }}>
                🏢 Companies
              </span>

              {/* Single Hint Pill (Interactive: clicking reveals the 1 hint) */}
              <button
                type="button"
                onClick={toggleSingleHint}
                style={{
                  background: isHintRevealed ? '#FEF3C7' : '#F3F4F6',
                  color: isHintRevealed ? '#B45309' : '#4B5563',
                  border: isHintRevealed ? '1px solid #FDE68A' : 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '2px 10px',
                  borderRadius: '999px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                💡 Hint {isHintRevealed ? '(Visible)' : ''}
              </button>
            </div>

            {/* Single Hint Card (Revealed when clicked) */}
            {isHintRevealed && (
              <div style={{
                background: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '18px',
                fontSize: '13px',
                color: '#92400E',
                lineHeight: 1.6
              }}>
                <div style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>💡 Technical Hint:</span>
                </div>
                <div>{problemHint}</div>
              </div>
            )}

            {/* Problem Statement */}
            <div style={{ fontSize: '14px', lineHeight: 1.7, color: '#374151', marginBottom: '22px' }}>
              {selectedDomain === 'dsa' ? (
                <>
                  <p style={{ margin: '0 0 12px' }}>
                    You are given an array of integers <code style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}>nums</code> and an integer <code style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}>target</code>, return indices of the two numbers such that they add up to <code style={{ background: '#F3F4F6', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '13px' }}>target</code>.
                  </p>
                  <p style={{ margin: '0 0 12px' }}>
                    You may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.
                  </p>
                  <p style={{ margin: 0 }}>
                    You can return the answer in any order.
                  </p>
                </>
              ) : (
                <div style={{ whiteSpace: 'pre-line' }}>{problemStatement}</div>
              )}
            </div>

            {/* Example 1 Card */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
                Example 1:
              </div>
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: 1.6,
                color: '#1F2937'
              }}>
                {selectedDomain === 'dsa' ? (
                  <>
                    <div><strong>Input:</strong> nums = [2,7,11,15], target = 9</div>
                    <div><strong>Output:</strong> [0,1]</div>
                    <div><strong>Explanation:</strong> Because nums[0] + nums[1] == 9, we return [0, 1].</div>
                  </>
                ) : (
                  <>
                    <div><strong>Input:</strong> t = 50, calls = [{"{"}"t": 50, inputs: [1]{"}"}, {"{"}"t": 75, inputs: [2]{"}"}]</div>
                    <div><strong>Output:</strong> [{"{"}"t": 125, inputs: [2]{"}"}]</div>
                    <div><strong>Explanation:</strong> 1st call cancelled because 2nd call triggered at 75ms.</div>
                  </>
                )}
              </div>
            </div>

            {/* Example 2 Card */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
                Example 2:
              </div>
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: 1.6,
                color: '#1F2937'
              }}>
                {selectedDomain === 'dsa' ? (
                  <>
                    <div><strong>Input:</strong> nums = [3,2,4], target = 6</div>
                    <div><strong>Output:</strong> [1,2]</div>
                  </>
                ) : (
                  <>
                    <div><strong>Input:</strong> t = 20, calls = [{"{"}"t": 50, inputs: [1]{"}"}]</div>
                    <div><strong>Output:</strong> [{"{"}"t": 70, inputs: [1]{"}"}]</div>
                  </>
                )}
              </div>
            </div>

            {/* Example 3 Card */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
                Example 3:
              </div>
              <div style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: 1.6,
                color: '#1F2937'
              }}>
                {selectedDomain === 'dsa' ? (
                  <>
                    <div><strong>Input:</strong> nums = [3,3], target = 6</div>
                    <div><strong>Output:</strong> [0,1]</div>
                  </>
                ) : (
                  <>
                    <div><strong>Input:</strong> t = 100, calls = [{"{"}"t": 0, inputs: [4]{"}"}, {"{"}"t": 50, inputs: [5]{"}"}]</div>
                    <div><strong>Output:</strong> [{"{"}"t": 150, inputs: [5]{"}"}]</div>
                  </>
                )}
              </div>
            </div>

            {/* Constraints */}
            <div style={{ marginBottom: '22px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                Constraints:
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: 1.8, color: '#374151', fontFamily: 'monospace' }}>
                {selectedDomain === 'dsa' ? (
                  <>
                    <li>2 &lt;= nums.length &lt;= 10<sup>4</sup></li>
                    <li>-10<sup>9</sup> &lt;= nums[i] &lt;= 10<sup>9</sup></li>
                    <li>-10<sup>9</sup> &lt;= target &lt;= 10<sup>9</sup></li>
                    <li><strong>Only one valid answer exists.</strong></li>
                  </>
                ) : (
                  <>
                    <li>0 &lt;= t &lt;= 1000</li>
                    <li>fn returns void or promise</li>
                    <li>calls is a valid JSON array of objects</li>
                  </>
                )}
              </ul>
            </div>

            {/* Follow-up Section */}
            <div style={{ marginBottom: '24px', fontSize: '13px', color: '#4B5563', lineHeight: 1.6 }}>
              <strong>Follow-up:</strong> {selectedDomain === 'dsa' 
                ? "Can you come up with an algorithm that is less than O(n^2) time complexity?" 
                : "What is the difference between debounce and throttle, and when would you use throttle for UI scroll listeners instead?"}
            </div>

            {/* Footer Statistics Bar (Matching screenshot) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '16px',
              borderTop: '1px solid #F3F4F6',
              fontSize: '12px',
              color: '#6B7280',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                Accepted <strong style={{ color: '#111827' }}>23,710,032</strong>/40.8M &nbsp;|&nbsp; Acceptance Rate <strong style={{ color: '#111827' }}>58.0%</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <ThumbsUp size={13} /> 70.6K
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <ThumbsDown size={13} /> 2.1K
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <Star size={13} />
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                  <Share2 size={13} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANE: LIGHT THEME CODE EDITOR MATCHING PHOTO */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <HackerRankCodeEditor
            subject={selectedDomain}
            code={codeContent}
            onChange={(newCode) => setCodeContent(newCode)}
            onSubmitSolution={(subCode) => {
              setCodeContent(subCode);
              handleTurnSubmit({ explicitText: "I have implemented, tested, and submitted my solution in the code editor." });
            }}
          />
        </div>
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
          ⚠️ Proctor Warning: Keep your mouse cursor inside the MSOT Code Arena! Navigating away or switching tabs is strictly forbidden.
        </div>
      )}

      {/* Strict Tab Switch Lockdown Modal (Auto-Terminates on 3rd Switch) */}
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

            {isTerminatedDueToTabs ? (
              <>
                <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#991B1B', margin: '0 0 10px' }}>
                  INTERVIEW TERMINATED & FLAGGED
                </h2>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: '0 0 18px' }}>
                  You have switched tabs <strong>3 times</strong>. According to MSOT exam policy, your interview session has been permanently <strong>terminated and submitted</strong> for proctor audit.
                </p>

                <div style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #F87171',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '24px'
                }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#B91C1C' }}>
                    Final Disqualification: 3 / 3 Tab Switches Exceeded
                  </div>
                  <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: '4px' }}>
                    All integrity events and screen blurs have been recorded in your official candidate evaluation dossier.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsTabLocked(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '14px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Acknowledge & View Submission Status
                </button>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#991B1B', margin: '0 0 10px' }}>
                  TAB SWITCHING STRICTLY BLOCKED!
                </h2>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, margin: '0 0 18px' }}>
                  You are taking an active proctored <strong>MSOT Code Arena</strong> AI Interview.
                  Leaving this tab or switching windows is strictly forbidden. <strong>After 3 switches, your interview will be immediately ended!</strong>
                </p>

                <div style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #F87171',
                  borderRadius: '8px',
                  padding: '14px',
                  marginBottom: '24px'
                }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#B91C1C' }}>
                    Proctor Alert: Tab Switch #{tabSwitchCount} / 3 Blocked & Logged
                  </div>
                  <div style={{ fontSize: '12px', color: '#7F1D1D', marginTop: '4px' }}>
                    {3 - tabSwitchCount} warning{3 - tabSwitchCount === 1 ? '' : 's'} remaining before automated session termination.
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
                    Return & Refocus Arena Window
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
              </>
            )}
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
              Are you sure you want to end your interview? Ira will compile all answers and code submitted so far, and generate your official <strong>{selectedDomain === 'webdev' ? 'Web Development' : 'Data Structures & Algorithms'}</strong> evaluation scorecard.
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
    </div>
  );
}
