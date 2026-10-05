import React, { useState } from 'react';
import { Settings, Volume2, Mic, Check, X, Sparkles, UserCheck } from 'lucide-react';

export default function VoiceSettingsModal({
  isOpen = false,
  onClose = () => {},
  selectedPersona = 'aria',
  onSelectPersona = () => {},
  sttEngine = 'hybrid',
  onSelectSttEngine = () => {},
  speechRate = 1.0,
  onChangeSpeechRate = () => {}
}) {
  const [testingVoice, setTestingVoice] = useState(false);

  if (!isOpen) return null;

  const personas = [
    {
      id: 'aria',
      name: 'Aria',
      tag: '✨ Sweet & Friendly Voice (Default)',
      desc: 'Warm, pleasant, encouraging girl voice with gentle cadence.',
      rate: 0.95,
      pitch: 1.12
    },
    {
      id: 'eleanor',
      name: 'Dr. Eleanor Vance',
      tag: '🎓 Principal Academic Lead',
      desc: 'Measured, deep-reasoning, socratic examiner.',
      rate: 0.98,
      pitch: 1.0
    },
    {
      id: 'alex',
      name: 'Alex Sterling',
      tag: '⚡ FAANG Systems Architect',
      desc: 'Fast-paced, trade-off focused, edge-case probing.',
      rate: 1.05,
      pitch: 0.95
    },
    {
      id: 'priya',
      name: 'Prof. Priya Nair',
      tag: '🌱 Empathetic Socratic Mentor',
      desc: 'Supportive, patient, concepts and structure.',
      rate: 0.96,
      pitch: 1.05
    }
  ];

  const getSweetFemaleVoice = () => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;
    const preferred = ['Samantha', 'Victoria', 'Karen', 'Tessa', 'Moira', 'Google UK English Female', 'Google US English', 'Microsoft Zira'];
    for (const name of preferred) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }
    const female = voices.find(v => v.name.toLowerCase().includes('female') && v.lang.startsWith('en'));
    return female || voices.find(v => v.lang.startsWith('en')) || voices[0];
  };

  const handleTestVoice = (personaId) => {
    if (!('speechSynthesis' in window)) return;
    setTestingVoice(true);
    window.speechSynthesis.cancel();

    const sampleTexts = {
      aria: "Hi there! I'm Aria, your interviewer. I'm really happy to meet you today! Take a breath, and let's explore your projects together.",
      eleanor: "Greetings candidate. I will assess your core algorithmic principles and depth of reasoning today.",
      alex: "Hey there! Let's dive into system trade-offs and edge cases for high-scale applications.",
      priya: "Welcome to your viva examination. Take a breath and explain your technical thought process clearly."
    };

    const utter = new SpeechSynthesisUtterance(sampleTexts[personaId] || sampleTexts.aria);
    if (personaId === 'aria' || personaId === 'eleanor' || personaId === 'priya') {
      const v = getSweetFemaleVoice();
      if (v) utter.voice = v;
    }
    if (personaId === 'aria') {
      utter.pitch = 1.12;
      utter.rate = speechRate * 0.95;
    } else {
      utter.rate = speechRate;
    }
    utter.onend = () => setTestingVoice(false);
    utter.onerror = () => setTestingVoice(false);
    window.speechSynthesis.speak(utter);
  };

  return (
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
        maxWidth: '560px',
        width: '100%',
        padding: '28px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} color="var(--primary-light)" />
            <h3 style={{ fontSize: '18px', fontWeight: '800' }}>Voice & Acoustic Technology Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '4px', borderRadius: '50%', width: '28px', height: '28px' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Section 1: Examiner Personas */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
            AI Examiner Voice Persona
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {personas.map((p) => (
              <div
                key={p.id}
                onClick={() => onSelectPersona(p.id)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${selectedPersona === p.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  background: selectedPersona === p.id ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{p.name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--cyan)' }}>{p.tag}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{p.desc}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestVoice(p.id);
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    <Volume2 size={12} />
                    Sample
                  </button>
                  {selectedPersona === p.id && (
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Check size={12} color="#fff" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Speech-to-Text Pipeline */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: '10px' }}>
            Speech-To-Text (Voice-Catching) Technology
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              onClick={() => onSelectSttEngine('hybrid')}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${sttEngine === 'hybrid' ? 'var(--cyan)' : 'var(--border-subtle)'}`,
                background: sttEngine === 'hybrid' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Sparkles size={14} color="var(--cyan)" />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>Hybrid Whisper STT</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Real-time interim streaming + Whisper AI post-processing for technical jargon.
              </div>
            </div>

            <div
              onClick={() => onSelectSttEngine('webspeech')}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${sttEngine === 'webspeech' ? 'var(--cyan)' : 'var(--border-subtle)'}`,
                background: sttEngine === 'webspeech' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Mic size={14} color="var(--primary-light)" />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>Local Web Speech</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                Runs completely client-side. Zero external server transcription latency.
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Speech Cadence */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Examiner Speech Rate
            </label>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--primary-light)' }}>
              {speechRate}x
            </span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.3"
            step="0.05"
            value={speechRate}
            onChange={(e) => onChangeSpeechRate(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--primary)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
            <span>0.8x (Deliberate)</span>
            <span>1.0x (Standard)</span>
            <span>1.3x (Brisk)</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 20px' }}>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
