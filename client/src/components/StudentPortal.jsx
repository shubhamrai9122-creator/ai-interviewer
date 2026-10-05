import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, Shield, Clock, AlertTriangle, 
  Send, HelpCircle, FastForward, CheckCircle2, Award, FileText,
  Settings, Code2, Sparkles, UserCheck, AudioLines
} from 'lucide-react';

import AudioVisualizer from './AudioVisualizer';
import CodeWhiteboard from './CodeWhiteboard';
import WebcamProctor from './WebcamProctor';
import VoiceSettingsModal from './VoiceSettingsModal';
import ResumeQuestionGeneratorModal from './ResumeQuestionGeneratorModal';
import ScorecardModal from './ScorecardModal';
import { AudioCaptureEngine, analyzeSpokenText } from '../utils/audioCapture';

const API_BASE = 'http://localhost:8000';

export default function StudentPortal() {
  // Session setup state
  const [studentId, setStudentId] = useState('STU001');
  const [studentName, setStudentName] = useState('Rahul Sharma');
  const [subjectDomain, setSubjectDomain] = useState('CS302: Data Structures & Algorithms');
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

  // Voice Settings & Personas
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('aria');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [sttEngine, setSttEngine] = useState('hybrid');
  const [speechRate, setSpeechRate] = useState(1.0);

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

  // Integrity & tab switch alerts
  const [tabSwitchAlert, setTabSwitchAlert] = useState(false);

  // References
  const audioEngineRef = useRef(null);
  const recognitionRef = useRef(null);

  // Helper to find sweet, natural female voice in browser
  const getSweetFemaleVoice = () => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const preferred = [
      'Samantha', 'Victoria', 'Karen', 'Tessa', 'Moira', 'Fiona',
      'Google UK English Female', 'Google US English', 'Microsoft Zira',
      'en-US-Standard-C', 'en-US-Standard-E'
    ];

    for (const name of preferred) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }

    const femaleVoice = voices.find(v => (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('girl')) && v.lang.startsWith('en'));
    if (femaleVoice) return femaleVoice;

    return voices.find(v => v.lang.startsWith('en')) || voices[0];
  };

  // Pre-load voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    // Fetch initial viva config to get duration
    fetch(`${API_BASE}/api/vivas`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const v = data[0];
          if (v.duration_minutes !== undefined) {
            setDurationMinutes(v.duration_minutes);
          }
        }
      })
      .catch(err => console.error('Failed to load viva details:', err));
  }, []);

  // Text-To-Speech with Persona configuration
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      if (selectedPersona === 'aria' || selectedPersona === 'priya' || selectedPersona === 'eleanor') {
        const v = getSweetFemaleVoice();
        if (v) utterance.voice = v;
      }

      if (selectedPersona === 'aria') {
        utterance.rate = speechRate * 0.95; // Sweet, gentle cadence
        utterance.pitch = 1.12;              // Pleasant, warm melodic pitch
      } else if (selectedPersona === 'alex') {
        utterance.rate = speechRate * 1.05;
        utterance.pitch = 0.95;
      } else if (selectedPersona === 'priya') {
        utterance.rate = speechRate * 0.96;
        utterance.pitch = 1.05;
      } else {
        utterance.rate = speechRate * 0.98;
        utterance.pitch = 1.0;
      }

      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Timer effect: increments every 1 second, respects dynamic / unlimited duration
  useEffect(() => {
    let timer;
    if (isStarted && !vivaCompleted) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (durationMinutes > 0 && next >= durationMinutes * 60) {
            handleEndViva(next);
            return durationMinutes * 60;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, vivaCompleted, durationMinutes]);

  // Tab switch detection
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

  // Update acoustic metrics on text input changes
  useEffect(() => {
    if (studentInput) {
      const turnDuration = speechTurnStartSec ? Math.max(2, elapsedSeconds - speechTurnStartSec) : 5;
      const metrics = analyzeSpokenText(studentInput, turnDuration);
      setAcousticMetrics(metrics);
    }
  }, [studentInput, elapsedSeconds, speechTurnStartSec]);

  // Voice Catching Engine Start / Stop
  const toggleVoiceCapture = async () => {
    if (isListening) {
      // Stop recording
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (audioEngineRef.current) {
        try { await audioEngineRef.current.stop(); } catch (e) {}
      }
      setIsListening(false);
      setIsSpeakingLive(false);
      setAudioVolume(0);
      setSilenceNotice(null);
      return;
    }

    try {
      setSpeechTurnStartSec(elapsedSeconds);
      setSilenceNotice(null);

      // 1. Initialize Web Audio API Analyser & MediaRecorder
      const engine = new AudioCaptureEngine({
        onVolumeChange: ({ volume, frequencyData }) => {
          setAudioVolume(volume);
          setFrequencyData(frequencyData);
        },
        onSpeakingChange: (speaking) => {
          setIsSpeakingLive(speaking);
          if (speaking) {
            setSilenceNotice(null);
          }
        },
        onSilenceDetected: ({ silenceDurationSec }) => {
          if (studentInput.trim().length > 10) {
            setSilenceNotice(`Sustained silence (${silenceDurationSec}s). Click 'Submit Answer' when ready.`);
          }
        },
        silenceThresholdSec: 3.0,
        dbThreshold: -42
      });

      await engine.start();
      audioEngineRef.current = engine;

      // 2. Initialize Web Speech Recognition for instant streaming text
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
          // If user still recording, restart recognition
          if (audioEngineRef.current && audioEngineRef.current.isRecording) {
            try { recognition.start(); } catch (err) {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsListening(true);
    } catch (err) {
      alert('Microphone access failed: ' + err.message + '. You may type your response.');
      setIsListening(false);
    }
  };

  // Start Viva Session
  const handleStartViva = async () => {
    if (!consentGiven) {
      alert('Please check the consent box to unlock and begin the exam.');
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
          consent_given: true,
          examiner_persona: selectedPersona,
          subject_domain: subjectDomain,
          duration_minutes: durationMinutes
        })
      });
      const data = await res.json();
      setSessionId(data.session_id);
      if (data.duration_minutes !== undefined) {
        setDurationMinutes(data.duration_minutes);
      }
      setIsStarted(true);
      setAiQuestion(data.initial_prompt);
      setCurrentPhase(data.phase);
      setTranscriptFeed([{
        speaker: 'AI Examiner',
        text: data.initial_prompt,
        time: '00:00',
        persona: selectedPersona
      }]);
      speakText(data.initial_prompt);
    } catch (err) {
      alert('Failed to connect to Viva Server: ' + err.message);
    }
  };

  // Submit Answer Turn
  const handleTurnSubmit = async ({ isGiveup = false, isHintReq = false } = {}) => {
    if (!sessionId) return;

    let audioBlob = null;
    if (audioEngineRef.current) {
      try {
        audioBlob = await audioEngineRef.current.stop();
      } catch (e) {}
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    setIsListening(false);
    setIsSpeakingLive(false);
    setAudioVolume(0);
    setSilenceNotice(null);

    const answerText = isGiveup ? "I don't know the exact answer to this, can we move to the next topic?" :
                       isHintReq ? "Could you give me a small hint on this concept?" :
                       studentInput.trim();

    if (!answerText && !isGiveup && !isHintReq && !codeContent.trim()) return;

    setIsSubmitting(true);
    const answerSec = elapsedSeconds;

    // Optional: Upload audio turn to backend if blob exists
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

    // Append student answer to feed
    setTranscriptFeed(prev => [
      ...prev,
      {
        speaker: studentName,
        text: answerText,
        time: formatTime(answerSec),
        codeSnippet: codeContent ? codeContent : null,
        audioUrl: recordedAudioUrl,
        wpm: acousticMetrics.wpm,
        fillers: acousticMetrics.totalFillers,
        fluency: acousticMetrics.fluencyScore
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

      // Auto-open whiteboard if question type is APPLIED or DEBUGGING
      if (['APPLIED', 'DEBUGGING'].includes(data.question_type)) {
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

  const getPhaseBadge = (phase) => {
    switch (phase) {
      case 'WARMUP': return <span className="badge badge-blue">Warm-up & Audio Check</span>;
      case 'FUNDAMENTALS': return <span className="badge badge-purple">Fundamentals Probing</span>;
      case 'DEPTH': return <span className="badge badge-cyan">Depth & Reasoning</span>;
      case 'APPLIED': return <span className="badge badge-amber">Applied Engineering</span>;
      case 'WRAPUP': return <span className="badge badge-rose">Wrap-up & Evaluation</span>;
      default: return <span className="badge badge-emerald">Scoring Phase</span>;
    }
  };

  // 1. Pre-Viva Check-in Screen
  if (!isStarted) {
    return (
      <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }}>
        <div className="glass-panel" style={{ padding: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(236, 72, 153, 0.4)'
              }}>
                <Shield size={28} color="#fff" />
              </div>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: '800' }}>AI Technical Viva Check-in</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                  Next-Gen Oral Examination • Natural Voice AI Examiner & Topic Tree Probing
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsResumeModalOpen(true)}
                className="btn btn-secondary"
                style={{ fontSize: '12px' }}
              >
                <Sparkles size={14} color="var(--purple)" />
                Generate from Resume / JD
              </button>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="btn btn-secondary"
                style={{ fontSize: '12px' }}
              >
                <Settings size={14} />
                Voice Settings
              </button>
            </div>
          </div>

          {/* Consent Checkbox - Controls Entry Box Activation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '20px',
            background: consentGiven ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
            border: `1.5px solid ${consentGiven ? 'rgba(16, 185, 129, 0.4)' : 'rgba(99, 102, 241, 0.3)'}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
            transition: 'all 0.3s ease'
          }}>
            <label htmlFor="consent" style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer', flex: 1 }}>
              <input
                type="checkbox"
                id="consent"
                checked={consentGiven}
                onChange={e => setConsentGiven(e.target.checked)}
                style={{ marginTop: '3px', width: '22px', height: '22px', accentColor: '#10b981', cursor: 'pointer' }}
              />
              <div>
                <span style={{ fontSize: '15px', fontWeight: '700', color: consentGiven ? '#34d399' : '#fff' }}>
                  {consentGiven ? 'Academic Consent Acknowledged' : 'Click to Agree & Unlock Entry Box'}
                </span>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                  I consent to audio stream recording, timestamped AI transcription, and proctoring telemetry for post-exam faculty evaluation.
                </p>
              </div>
            </label>
            <span className={`badge ${consentGiven ? 'badge-emerald' : 'badge-amber'}`} style={{ whiteSpace: 'nowrap' }}>
              {consentGiven ? 'Unlocked' : 'Entry Locked'}
            </span>
          </div>

          {/* Entry Box: Turned OFF until consent checkbox is clicked */}
          {!consentGiven ? (
            <div style={{
              textAlign: 'center',
              padding: '36px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '24px'
            }}>
              <Shield size={36} color="var(--primary-light)" style={{ marginBottom: '12px', opacity: 0.8 }} />
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px' }}>Entry Box is Locked</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto' }}>
                Please select the check button above to activate the candidate entry box and begin your viva examination. No password login needed!
              </p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
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

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                  Exam Domain / Syllabus
                </label>
                <input
                  className="input-field"
                  value={subjectDomain}
                  onChange={e => setSubjectDomain(e.target.value)}
                  placeholder="e.g. CS302: Data Structures & Algorithms"
                />
              </div>

              {/* Examiner Persona Badge */}
              <div style={{
                background: 'rgba(236, 72, 153, 0.08)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ec4899' }} />
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                      Assigned Voice: {selectedPersona === 'aria' ? 'Aria (Sweet & Friendly AI Interviewer)' : selectedPersona === 'alex' ? 'Alex Sterling (FAANG Architect)' : selectedPersona === 'priya' ? 'Prof. Priya Nair (Socratic Mentor)' : 'Dr. Eleanor Vance (Academic Lead)'}
                    </span>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                      High-Fidelity Voice Synthesis • Speech Speed: {speechRate}x
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  Change Voice
                </button>
              </div>

              {/* Duration & Topic Tree Configuration */}
              <div style={{
                background: 'rgba(11, 17, 32, 0.6)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '18px 20px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <Clock size={16} color="var(--cyan)" />
                    Exam Duration: {durationMinutes === 0 ? 'Unlimited Mode (Admin Configured)' : `${durationMinutes} Minutes (Admin Configured)`}
                  </h3>
                  <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                    {durationMinutes === 0 ? 'Adaptive Question Trees' : `${durationMinutes}m Scheduled`}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', margin: 0, lineHeight: '1.5' }}>
                  {durationMinutes === 0
                    ? 'Faculty has set duration to open-ended. The AI interviewer will ask questions through branching topic trees until evaluation is complete.'
                    : `Duration is set by faculty/admin (${durationMinutes} minutes). Questions follow structured topic trees with follow-ups and hints.`}
                </p>
              </div>

              {/* Action button */}
              <button
                onClick={handleStartViva}
                disabled={!studentName.trim() || !studentId.trim()}
                className="btn btn-primary"
                style={{ width: '100%', padding: '16px', fontSize: '16px', background: 'linear-gradient(135deg, #6366f1, #ec4899)' }}
              >
                Launch Adaptive Viva Room
              </button>
            </div>
          )}
        </div>

        {/* Settings & Question Generator Modals */}
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

        <ResumeQuestionGeneratorModal
          isOpen={isResumeModalOpen}
          onClose={() => setIsResumeModalOpen(false)}
          onQuestionsApplied={(questions, role) => {
            setSubjectDomain(role);
          }}
        />
      </div>
    );
  }

  // 2. Active Viva Room Interface
  return (
    <div style={{ maxWidth: '1440px', margin: '20px auto', padding: '0 24px' }}>
      {/* Top Session Progress Bar */}
      <div className="glass-panel" style={{ padding: '14px 24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="mono" style={{ fontSize: '20px', fontWeight: '800', color: 'var(--primary-light)' }}>
              {formatTime(elapsedSeconds)}
            </span>
            <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
              {durationMinutes === 0 ? '/ Unlimited' : `/ ${formatTime(durationMinutes * 60)}`}
            </span>
            {getPhaseBadge(currentPhase)}
          </div>

          {/* Dynamic Progress Bar */}
          <div style={{ flex: 1, maxWidth: '400px', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{
              width: durationMinutes > 0 ? `${Math.min(100, (elapsedSeconds / (durationMinutes * 60)) * 100)}%` : '100%',
              height: '100%',
              background: durationMinutes > 0 ? 'linear-gradient(90deg, var(--primary), var(--cyan))' : 'linear-gradient(90deg, #ec4899, #8b5cf6)',
              borderRadius: '999px',
              transition: 'width 1s linear'
            }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowCodePad(!showCodePad)}
              className={`btn ${showCodePad ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <Code2 size={14} />
              {showCodePad ? 'Hide Code Pad' : 'Open Code Pad'}
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              <Settings size={14} />
              Voice Settings
            </button>

            <button
              onClick={() => handleEndViva()}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Wrap-up Early
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switch Alert */}
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

      {/* Silence countdown banner */}
      {silenceNotice && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid var(--amber)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          color: '#fef3c7'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} color="var(--amber)" />
            <span>{silenceNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => handleTurnSubmit()}
            className="btn btn-primary"
            style={{ fontSize: '11px', padding: '4px 10px', height: '26px' }}
          >
            Submit Now
          </button>
        </div>
      )}

      {/* Main Layout Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showCodePad ? '1fr 1fr 1fr' : '1.25fr 1fr',
        gap: '20px'
      }}>
        {/* Left Column: Examiner Audio & Current Question Card */}
        <div>
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-purple">{questionType} PROBE</span>
                {lastLatencyMs && (
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--emerald)' }}>
                    ⚡ TTFT: {lastLatencyMs}ms
                  </span>
                )}
              </div>

              {isAiSpeaking && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Volume2 size={16} color="var(--cyan)" />
                  <span style={{ fontSize: '12px', color: 'var(--cyan)', fontWeight: '600' }}>
                    AI Speaking ({selectedPersona})...
                  </span>
                </div>
              )}
            </div>

            {/* Audio Visualizer */}
            <div style={{ marginBottom: '16px' }}>
              <AudioVisualizer
                frequencyData={frequencyData}
                volume={audioVolume}
                isSpeaking={isSpeakingLive}
                isAiSpeaking={isAiSpeaking}
                label="Voice Spectrum"
              />
            </div>

            {/* AI Question Text */}
            <h3 style={{ fontSize: '17px', fontWeight: '700', lineHeight: '1.5', color: '#fff', marginBottom: '16px' }}>
              "{aiQuestion}"
            </h3>

            {/* Acoustic Intelligence Metrics Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '8px 12px',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '11px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AudioLines size={14} color="var(--cyan)" />
                <span style={{ color: 'var(--text-muted)' }}>Pacing:</span>
                <span style={{ fontWeight: '700', color: '#fff' }}>{acousticMetrics.wpm} WPM</span>
                <span style={{ color: 'var(--emerald)' }}>({acousticMetrics.wpmStatus})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Fillers: </span>
                  <span style={{ fontWeight: '700', color: acousticMetrics.totalFillers > 3 ? 'var(--amber)' : '#fff' }}>
                    {acousticMetrics.totalFillers}
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Fluency: </span>
                  <span style={{ fontWeight: '700', color: 'var(--cyan)' }}>
                    {acousticMetrics.fluencyScore}%
                  </span>
                </div>
              </div>
            </div>

            {/* Candidate Answer Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Click 'Capture Voice' to answer aloud (English / Hinglish), or type your explanation here..."
                value={studentInput}
                onChange={e => setStudentInput(e.target.value)}
                style={{ resize: 'vertical' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={toggleVoiceCapture}
                  className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  {isListening ? 'Stop Mic & Hold' : 'Capture Voice (Microphone)'}
                </button>

                <button
                  type="button"
                  onClick={() => handleTurnSubmit()}
                  disabled={isSubmitting || (!studentInput.trim() && !codeContent.trim())}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <Send size={16} />
                  {isSubmitting ? 'Processing Turn...' : 'Submit Spoken Answer'}
                </button>
              </div>

              {/* Quick Pedagogical Actions */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => handleTurnSubmit({ isHintReq: true })}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', flex: 1, padding: '7px' }}
                >
                  <HelpCircle size={14} color="var(--amber)" />
                  Request Socratic Hint
                </button>

                <button
                  type="button"
                  onClick={() => handleTurnSubmit({ isGiveup: true })}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', flex: 1, padding: '7px' }}
                >
                  <FastForward size={14} color="var(--cyan)" />
                  I Don't Know / Skip Topic
                </button>
              </div>
            </div>
          </div>

          {/* AI Webcam Proctoring Box */}
          <WebcamProctor isActive={isStarted && !vivaCompleted} />
        </div>

        {/* Middle Column (Optional Split): Interactive Code Whiteboard */}
        {showCodePad && (
          <div style={{ height: '640px' }}>
            <CodeWhiteboard
              code={codeContent}
              onChange={setCodeContent}
            />
          </div>
        )}

        {/* Right Column: Live Timestamped Transcript Stream */}
        <div>
          <div className="glass-panel" style={{ padding: '20px', height: '640px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '700' }}>Live Auditable Transcript</h4>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                {transcriptFeed.length} Turns Logged
              </span>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '6px' }}>
              {transcriptFeed.map((item, idx) => (
                <div key={idx} style={{
                  padding: '12px 14px',
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

                  <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#e2e8f0', marginBottom: item.codeSnippet ? '8px' : '0' }}>
                    {item.text}
                  </p>

                  {/* If candidate submitted code */}
                  {item.codeSnippet && (
                    <div style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '8px',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: '#38bdf8',
                      overflowX: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {item.codeSnippet}
                    </div>
                  )}

                  {/* Acoustic telemetry badges */}
                  {item.speaker !== 'AI Examiner' && item.wpm && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '10px', color: 'var(--text-dim)' }}>
                      <span>⚡ {item.wpm} WPM</span>
                      <span>• Fillers: {item.fillers}</span>
                      <span>• Fluency: {item.fluency}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
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

      {/* Scorecard Modal on Completion */}
      <ScorecardModal
        isOpen={isScorecardOpen}
        onClose={() => setIsScorecardOpen(false)}
        result={completionResult}
        studentName={studentName}
        studentId={studentId}
        subjectTitle={subjectDomain}
      />
    </div>
  );
}
