import React, { useState, useEffect, useRef } from 'react';
import { 
  GitBranch, Shield, Sparkles, Send, Mic, MicOff, Volume2, 
  CheckCircle2, AlertTriangle, ArrowRight, CornerDownRight, 
  Terminal, Award, Layers, Zap, Clock, RotateCcw, ExternalLink,
  Code2, Check, X, BookOpen, AlertCircle
} from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import CodeWhiteboard from './CodeWhiteboard';
import VoiceSettingsModal from './VoiceSettingsModal';

const API_BASE = 'http://localhost:8000';

export default function ProjectInterviewer() {
  // Ingest / Setup state
  const [repoUrl, setRepoUrl] = useState('https://github.com/shubhamrai9122-creator/ai-interviewer');
  const [projectName, setProjectName] = useState('MSOT AI Technical Viva Platform');
  const [projectDescription, setProjectDescription] = useState('Real-time AI oral examination platform with natural sweet voice catching, dynamic decision tree probing, and acoustic telemetry.');
  const [targetRole, setTargetRole] = useState('Staff Backend Engineer');
  const [interviewMode, setInterviewMode] = useState('standard'); // quick, standard, deep
  const [sampleTemplates, setSampleTemplates] = useState([]);
  const [isIngesting, setIsIngesting] = useState(false);

  // Active Defense State
  const [isStarted, setIsStarted] = useState(false);
  const [probes, setProbes] = useState([]);
  const [currentProbeIndex, setCurrentProbeIndex] = useState(0);
  const [studentInput, setStudentInput] = useState('');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [evaluating, setEvaluating] = useState(false);

  // Completed turns & verdicts history
  const [turnHistory, setTurnHistory] = useState([]);
  const [latestVerdict, setLatestVerdict] = useState(null);
  const [readinessScore, setReadinessScore] = useState(0);
  const [showCodePad, setShowCodePad] = useState(false);
  const [codeContent, setCodeContent] = useState('');

  // Audio Telemetry
  const [audioVolume, setAudioVolume] = useState(0);
  const [speechTurnStartSec, setSpeechTurnStartSec] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState('aria');
  const [speechRate, setSpeechRate] = useState(1.0);

  const recognitionRef = useRef(null);

  // Fetch sample templates on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/project/templates`)
      .then(res => res.json())
      .then(data => setSampleTemplates(data))
      .catch(err => console.error('Error loading templates:', err));
  }, []);

  // Timer
  useEffect(() => {
    let timer;
    if (isStarted && !latestVerdict?.isComplete) {
      timer = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isStarted, latestVerdict]);

  // Sweet female voice helper
  const getSweetFemaleVoice = () => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;
    const preferred = [
      'Samantha', 'Victoria', 'Karen', 'Tessa', 'Moira', 'Fiona',
      'Google UK English Female', 'Google US English', 'Microsoft Zira'
    ];
    for (const name of preferred) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }
    const female = voices.find(v => (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('girl')) && v.lang.startsWith('en'));
    return female || voices.find(v => v.lang.startsWith('en')) || voices[0];
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const v = getSweetFemaleVoice();
      if (v) utterance.voice = v;
      utterance.pitch = 1.12; // Sweet, warm melodic pitch
      utterance.rate = speechRate * 0.95; // Friendly cadence

      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      utterance.onerror = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Toggle voice capture
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      setAudioVolume(0);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type your defense!');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
        setSpeechTurnStartSec(Date.now());
        setAudioVolume(65);
      };

      rec.onresult = (e) => {
        let transcript = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          transcript += e.results[i][0].transcript;
        }
        setStudentInput(transcript);
        setAudioVolume(Math.min(95, 45 + transcript.length % 50));
      };

      rec.onerror = () => {
        setIsListening(false);
        setAudioVolume(0);
      };

      rec.onend = () => {
        setIsListening(false);
        setAudioVolume(0);
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      alert('Microphone error: ' + err.message);
      setIsListening(false);
    }
  };

  // Ingest repository and generate 8 load-bearing probes
  const handleIngestProject = async () => {
    setIsIngesting(true);
    try {
      const res = await fetch(`${API_BASE}/api/project/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: repoUrl.trim() || null,
          project_name: projectName.trim(),
          project_description: projectDescription.trim(),
          target_role: targetRole,
          interview_mode: interviewMode,
          code_snippets: codeContent || null
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.probes?.length > 0) {
        setProbes(data.probes);
        setCurrentProbeIndex(0);
        setIsStarted(true);
        setTurnHistory([]);
        setLatestVerdict(null);
        setReadinessScore(0);
        setElapsedSeconds(0);

        // Sweet intro from Aria
        const firstQ = data.probes[0];
        const introGreeting = (
          `Hi! I'm Aria, your skeptical staff interviewer today. I've finished profiling your repository for ${projectName}. ` +
          `Let's see if you can defend the load-bearing decisions in this codebase cold. ` +
          `Here is Question 1 from ${firstQ.category_title}: ${firstQ.question_text}`
        );
        speakText(introGreeting);
      } else {
        alert('Could not generate probes for this project. Please check repo details.');
      }
    } catch (err) {
      alert('Ingestion error: ' + err.message);
    } finally {
      setIsIngesting(false);
    }
  };

  // Submit Answer & receive 🟢 Solid / 🟡 Shaky / 🔴 Couldn't Defend verdict
  const handleSubmitDefense = async (isSkip = false) => {
    if (!isStarted || currentProbeIndex >= probes.length) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setAudioVolume(0);
    }

    const currentQ = probes[currentProbeIndex];
    const answerText = isSkip ? "I cannot defend this specific implementation detail cold." : studentInput.trim();

    if (!answerText && !codeContent.trim()) {
      alert('Please speak or type your technical defense before submitting.');
      return;
    }

    setEvaluating(true);
    try {
      const res = await fetch(`${API_BASE}/api/project/verdict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: currentQ.question_text,
          answer_transcript: answerText + (codeContent ? ` [Code snippet submitted: ${codeContent}]` : ''),
          expected_concepts: currentQ.expected_concepts || [],
          target_role: targetRole
        })
      });
      const verdictData = await res.json();

      const newTurn = {
        probe: currentQ,
        answer: answerText,
        codeSnippet: codeContent || null,
        verdict: verdictData.verdict,
        verdictBadge: verdictData.verdict_badge,
        verdictDesc: verdictData.verdict_desc,
        score: verdictData.score,
        coachingCard: verdictData.coaching_card,
        timeSec: elapsedSeconds
      };

      const updatedHistory = [...turnHistory, newTurn];
      setTurnHistory(updatedHistory);
      setLatestVerdict(newTurn);

      // Compute overall readiness score
      const totalScore = updatedHistory.reduce((acc, t) => acc + t.score, 0);
      const avg = Math.round(totalScore / updatedHistory.length);
      setReadinessScore(avg);

      // Spoken feedback from Aria
      const spokenFeedback = (
        `Verdict: ${verdictData.verdict_badge}. ${verdictData.coaching_card.what_was_good} ` +
        `Moving to the next architectural probe.`
      );
      speakText(spokenFeedback);

      // Reset turn input
      setStudentInput('');
      setCodeContent('');

      // Advance to next probe or complete
      if (currentProbeIndex + 1 < probes.length) {
        setCurrentProbeIndex(prev => prev + 1);
      } else {
        setLatestVerdict(prev => ({ ...prev, isComplete: true }));
      }
    } catch (err) {
      alert('Verdict evaluation error: ' + err.message);
    } finally {
      setEvaluating(false);
    }
  };

  const formatTime = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Setup & Ingest Hero Screen (Inspired by rishiraj38 & interview-my-project)
  if (!isStarted) {
    return (
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px' }}>
        {/* Eyebrow & Hero Header */}
        <div style={{ marginBottom: '32px' }}>
          <div className="eyebrow" style={{ marginBottom: '14px' }}>
            <span>GROUNDED MOCK INTERVIEW FOR YOUR PORTFOLIO CODEBASE</span>
          </div>

          <h1 style={{
            fontFamily: 'var(--display)',
            fontWeight: 800,
            fontSize: 'clamp(2.2rem, 5vw, 4.4rem)',
            letterSpacing: '-0.04em',
            lineHeight: 1.05,
            textTransform: 'uppercase',
            marginBottom: '18px'
          }} className="sheen-text">
            VIBE CODED IT?<br />
            DEFEND EVERY DECISION COLD.
          </h1>

          <p style={{
            fontSize: 'clamp(1.05rem, 1.8vw, 1.35rem)',
            color: 'var(--muted)',
            maxWidth: '68ch',
            lineHeight: 1.5,
            marginBottom: '28px'
          }}>
            An AI interviewer for <strong style={{ color: 'var(--ink)' }}>YOUR</strong> repository. It reads your codebase and agent session logs,
            asks the questions a sharp Staff Engineer would ask, and grills you with the 8 load-bearing probes until you can defend every decision cold.
          </p>

          {/* 3 Fact Badges (from rishiraj38 style) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            borderTop: '1px solid var(--rule)',
            borderBottom: '1px solid var(--rule)',
            paddingBlock: '18px',
            marginBottom: '36px'
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '28px', color: 'var(--sun)' }}>8</span>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--muted)' }}>Probe Categories (Why-This, Load-Bearing Wall, Edge Cases)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '28px', color: 'var(--ice)' }}>3</span>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--muted)' }}>Staff Defense Tiers (🟢 Solid, 🟡 Shaky, 🔴 Couldn't Defend)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '28px', color: 'var(--aurora)' }}>100%</span>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--muted)' }}>Grounded Instant Coaching with Model Answers</span>
            </div>
          </div>
        </div>

        {/* Scrolling Ticker Belts (from rishiraj38 style) */}
        <div className="belts">
          <div className="belt">
            <span className="belt-pill"><Layers size={14} color="var(--sun)" /> 🏛️ The "Why This" Architecture Defense</span>
            <span className="belt-pill"><Shield size={14} color="var(--rose)" /> 🧱 The Load-Bearing Wall Single Point of Failure</span>
            <span className="belt-pill"><Zap size={14} color="var(--ice)" /> ⚡ Concurrent Race Conditions & Partial Writes</span>
            <span className="belt-pill"><Award size={14} color="var(--aurora)" /> 🛡️ The Tech Stack Defense vs Alternatives</span>
            <span className="belt-pill"><Clock size={14} color="var(--nebula)" /> 📈 100x Traffic Spikes & Heap Saturation</span>
            <span className="belt-pill"><GitBranch size={14} color="var(--ice)" /> 🌊 Cold End-to-End Data Flow Trace</span>
            <span className="belt-pill"><Terminal size={14} color="var(--sun)" /> 🤖 Defending Claude Code & Cursor Generated Logic</span>
          </div>
        </div>

        {/* Ingest Card */}
        <div className="glass-panel" style={{ padding: '36px', position: 'relative', overflow: 'hidden' }}>
          {/* Celestial Orb (from rishiraj38 design) */}
          <div className="orb" style={{ '--orb-color': 'var(--nebula)' }} />

          <div style={{ maxWidth: '820px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="eyebrow">STEP 1: INGEST YOUR CODEBASE</span>
            </div>
            <h3 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '22px', marginBottom: '10px' }}>
              Provide Your Repository or Project Context
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
              Paste any public GitHub repository URL, or select from built-in high-scale portfolio architectures below.
            </p>

            {/* Quick Template Picker */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--ice)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                Instant Portfolio Templates (1-Click Test):
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {sampleTemplates.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setProjectName(tpl.name);
                      setRepoUrl(tpl.repo_url);
                      setProjectDescription(tpl.description);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 14px' }}
                  >
                    <span>{tpl.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ingestion Form */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '18px' }}>
              <div>
                <label style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  GitHub Repository URL
                </label>
                <input
                  className="input-field mono"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  placeholder="e.g. https://github.com/username/project"
                />
              </div>

              <div>
                <label style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Project Name / Identifier
                </label>
                <input
                  className="input-field"
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="e.g. Distributed Key-Value Store"
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                Architecture & Tech Stack Summary
              </label>
              <textarea
                className="input-field"
                rows={2}
                value={projectDescription}
                onChange={e => setProjectDescription(e.target.value)}
                placeholder="Mention core components: e.g. FastAPI, PostgreSQL, Kafka, React, Redis caching..."
              />
            </div>

            {/* Mode & Target Role Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '28px' }}>
              <div>
                <label style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Target Role Calibration
                </label>
                <select
                  className="input-field"
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                >
                  <option value="Staff Backend Engineer">Staff Backend / Systems Engineer (Default)</option>
                  <option value="Frontend Lead / Architect">Frontend & UI Systems Architect</option>
                  <option value="Technical Product Manager">Technical Product Manager (Scope & Metrics)</option>
                  <option value="Machine Learning Engineer">ML / AI Systems Engineer (Data Provenance & Evals)</option>
                </select>
              </div>

              <div>
                <label style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                  Interview Depth Mode
                </label>
                <select
                  className="input-field"
                  value={interviewMode}
                  onChange={e => setInterviewMode(e.target.value)}
                >
                  <option value="quick">Quick (5 Load-Bearing Probes)</option>
                  <option value="standard">Standard (8 Full-Taxonomy Probes)</option>
                  <option value="deep">Deep Dive (12 Probes + Complete Data Flow Trace)</option>
                </select>
              </div>
            </div>

            {/* Launch Action */}
            <button
              onClick={handleIngestProject}
              disabled={isIngesting || !projectName.trim()}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '15px',
                fontFamily: 'var(--display)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(120deg, var(--nebula), #2563eb)'
              }}
            >
              {isIngesting ? (
                <>
                  <Sparkles size={18} className="animate-spin" />
                  Profiling Codebase & Deriving Load-Bearing Probes...
                </>
              ) : (
                <>
                  <Code2 size={18} color="var(--ice)" />
                  Ingest Codebase & Begin Skeptical Mock Defense
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Active Defense Room Interface
  const currentQ = probes[currentProbeIndex] || {};
  const isInterviewFinished = latestVerdict?.isComplete;

  return (
    <div style={{ maxWidth: '1440px', margin: '24px auto', padding: '0 24px' }}>
      {/* Session Progress Header */}
      <div className="glass-panel" style={{ padding: '16px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span className="sun-pulse" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-purple">{targetRole}</span>
                <span className="mono" style={{ fontSize: '13px', color: 'var(--ice)' }}>{projectName}</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                Probe {currentProbeIndex + 1} of {probes.length} • {currentQ.category_title}
              </div>
            </div>
          </div>

          {/* Readiness Score & Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Readiness Score</div>
              <div style={{
                fontFamily: 'var(--display)',
                fontWeight: 800,
                fontSize: '22px',
                color: readinessScore >= 80 ? 'var(--aurora)' : readinessScore >= 50 ? 'var(--sun)' : 'var(--ice)'
              }}>
                {readinessScore} <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>/ 100</span>
              </div>
            </div>

            <div style={{
              padding: '8px 16px',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--rule)',
              fontFamily: 'var(--mono)',
              fontSize: '14px',
              color: 'var(--sun)'
            }}>
              ⏱️ {formatTime(elapsedSeconds)}
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', marginTop: '14px', overflow: 'hidden' }}>
          <div style={{
            width: `${((currentProbeIndex + 1) / probes.length) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--nebula), var(--ice), var(--sun))',
            borderRadius: '999px',
            transition: 'width 0.4s ease'
          }} />
        </div>
      </div>

      {/* Main Grid: Probe & Answer Studio */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Left Column: Current Question & Candidate Response Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Active Probe Card */}
          <div className="glass-panel" style={{ padding: '28px', borderLeft: '4px solid var(--ice)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-blue">{currentQ.category_title}</span>
                <span className="badge badge-purple">{currentQ.question_type}</span>
                <span className="badge badge-amber">Diff {currentQ.difficulty}/5</span>
              </div>
              <button
                onClick={() => speakText(currentQ.question_text)}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                <Volume2 size={13} color="var(--ice)" />
                Hear Aria
              </button>
            </div>

            <h3 style={{
              fontFamily: 'var(--body)',
              fontSize: '18px',
              fontWeight: 700,
              lineHeight: 1.45,
              color: '#fff',
              marginBottom: '16px'
            }}>
              "{currentQ.question_text}"
            </h3>

            <div style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(95, 216, 255, 0.06)',
              border: '1px solid rgba(95, 216, 255, 0.2)',
              fontSize: '12px',
              color: 'var(--ice)'
            }}>
              <strong>Staff Benchmark Concepts:</strong> {currentQ.expected_concepts?.join(', ')}
            </div>
          </div>

          {/* Answer Input Studio */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <label style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Terminal size={14} color="var(--sun)" />
                Your Technical Defense (Voice or Text)
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCodePad(!showCodePad)}
                  className={`btn ${showCodePad ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '11px', padding: '4px 10px' }}
                >
                  <Code2 size={12} />
                  {showCodePad ? 'Hide Code' : '+ Add Code Snippet'}
                </button>
              </div>
            </div>

            {/* Code Whiteboard Pad if open */}
            {showCodePad && (
              <div style={{ marginBottom: '14px' }}>
                <CodeWhiteboard code={codeContent} setCode={setCodeContent} />
              </div>
            )}

            {/* Transcript Textarea */}
            <textarea
              className="input-field"
              rows={5}
              value={studentInput}
              onChange={e => setStudentInput(e.target.value)}
              placeholder="Speak via microphone or type your technical explanation cold... Explain load-bearing trade-offs, failure modes, and concurrency invariants."
              style={{ fontSize: '14px', lineHeight: 1.5, marginBottom: '14px' }}
            />

            {/* Audio Waveform when speaking */}
            {isListening && (
              <div style={{ marginBottom: '14px' }}>
                <AudioVisualizer volume={audioVolume} isSpeaking={isListening} />
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={toggleListening}
                className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                style={{ fontSize: '13px' }}
              >
                {isListening ? <MicOff size={15} /> : <Mic size={15} color="var(--ice)" />}
                {isListening ? 'Stop Mic' : 'Speak Defense (Mic)'}
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSubmitDefense(true)}
                  disabled={evaluating}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  Skip Question
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmitDefense(false)}
                  disabled={evaluating || (!studentInput.trim() && !codeContent.trim())}
                  className="btn btn-primary"
                  style={{ fontSize: '13px' }}
                >
                  {evaluating ? (
                    <>
                      <Sparkles size={15} className="animate-spin" />
                      Evaluating Defense...
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Submit Defense
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Grounded Coaching Cards & Verdicts History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Latest Verdict Banner if available */}
          {latestVerdict ? (
            <div className={`coaching-card ${latestVerdict.verdict.toLowerCase().replace('_', '-')}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: '16px' }}>
                  {latestVerdict.verdictBadge}
                </span>
                <span className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sun)' }}>
                  Score: {latestVerdict.score}/100
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                {latestVerdict.verdictDesc}
              </p>

              {/* What was good */}
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--rule)', paddingTop: '8px' }}>
                <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--aurora)', fontWeight: 700, marginBottom: '2px' }}>
                  ✓ WHAT YOU DEFENDED WELL:
                </div>
                <div style={{ fontSize: '12.5px', color: '#e2e8f0' }}>
                  {latestVerdict.coachingCard.what_was_good}
                </div>
              </div>

              {/* What was missing */}
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--rule)', paddingTop: '8px' }}>
                <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--rose)', fontWeight: 700, marginBottom: '2px' }}>
                  ✕ WHAT A STAFF INTERVIEWER NOTICED WAS MISSING:
                </div>
                <div style={{ fontSize: '12.5px', color: '#fca5a5' }}>
                  {latestVerdict.coachingCard.what_was_missing}
                </div>
              </div>

              {/* Staff Engineer Model Answer */}
              <div style={{ marginTop: '8px', borderTop: '1px solid var(--rule)', paddingTop: '8px', background: 'rgba(95, 216, 255, 0.04)', padding: '8px', borderRadius: '6px' }}>
                <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--ice)', fontWeight: 700, marginBottom: '2px' }}>
                  💎 STAFF-ENGINEER MODEL DEFENSE:
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink)', fontStyle: 'italic' }}>
                  "{latestVerdict.coachingCard.staff_engineer_answer}"
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Award size={24} color="var(--ice)" />
              </div>
              <h4 style={{ fontFamily: 'var(--display)', fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
                Awaiting First Defense
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Speak or type your answer to receive an instant Staff Engineer verdict: 🟢 Solid, 🟡 Shaky, or 🔴 Couldn't Defend, along with grounded coaching.
              </p>
            </div>
          )}

          {/* Defense History Log */}
          <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
            <h4 style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={14} color="var(--sun)" />
              Interview Defense Log ({turnHistory.length} Answered)
            </h4>

            {turnHistory.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                No completed probes yet. Answer above to start logging defense records.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                {turnHistory.map((t, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--rule)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--ice)' }}>Probe #{idx + 1}</span>
                      <span className="badge" style={{ fontSize: '10px' }}>{t.verdictBadge}</span>
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>
                      {t.probe.question_text.slice(0, 80)}...
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Score: <strong>{t.score}/100</strong> • {formatTime(t.timeSec)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
