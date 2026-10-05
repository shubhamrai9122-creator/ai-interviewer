import React, { useState } from 'react';
import { Settings, Volume2, Mic, Check, X, Sparkles, UserCheck } from 'lucide-react';

export default function VoiceSettingsModal({
  isOpen = false,
  onClose = () => {},
  selectedPersona = 'grok_sweet',
  onSelectPersona = () => {},
  sttEngine = 'hybrid',
  onSelectSttEngine = () => {},
  speechRate = 1.0,
  onChangeSpeechRate = () => {}
}) {
  const [testingVoice, setTestingVoice] = useState(false);
  const [activeTestId, setActiveTestId] = useState(null);

  if (!isOpen) return null;

  // Strictly sweet young female voices - Zero male voices allowed
  const personas = [
    {
      id: 'grok_sweet',
      name: 'Grok Sweet AI',
      tag: '✨ Grok Sweet Young Voice (Default)',
      desc: 'Bright, melodic, enthusiastic young female cadence with crystal tone.',
      rate: 0.98,
      pitch: 1.22,
      preview: "Hi! I'm your Grok AI interviewer. Let's explore your DSA and Web Development expertise together! You've got this!"
    },
    {
      id: 'aria',
      name: 'Aria Sweet',
      tag: '🌸 Warm & Cheerful Girl Voice',
      desc: 'Gentle, warm, encouraging sweet voice with smooth natural cadence.',
      rate: 0.95,
      pitch: 1.18,
      preview: "Hello! I'm Aria. Take a gentle breath, make yourself comfortable, and let's have a wonderful technical viva."
    },
    {
      id: 'maya',
      name: 'Maya Young Lead',
      tag: '⚡ Youthful Full-Stack Lead',
      desc: 'Crisp, articulate, cheerful young female software engineer.',
      rate: 0.97,
      pitch: 1.15,
      preview: "Hey there! Ready to dive into some exciting data structures, React Virtual DOM, and web systems? Let's begin!"
    },
    {
      id: 'zara',
      name: 'Zara Socratic',
      tag: '💎 Sweet Socratic Guide',
      desc: 'Patient, supportive, encouraging sweet tone for deep reasoning.',
      rate: 0.94,
      pitch: 1.16,
      preview: "Welcome! Whenever you're ready, let's explore your algorithmic solutions and technical reasoning step by step."
    }
  ];

  const getSweetFemaleVoice = () => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || !voices.length) return null;
    const preferred = [
      'Samantha', 'Victoria', 'Karen', 'Tessa', 'Moira',
      'Google UK English Female', 'Google US English', 'Microsoft Zira', 'Microsoft Jenny'
    ];
    for (const name of preferred) {
      const match = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }
    const female = voices.find(v => (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('girl')) && v.lang.startsWith('en'));
    return female || voices.find(v => v.lang.startsWith('en')) || voices[0];
  };

  const handleTestVoice = (personaId) => {
    if (!('speechSynthesis' in window)) return;
    setTestingVoice(true);
    setActiveTestId(personaId);
    window.speechSynthesis.cancel();

    const targetPersona = personas.find(p => p.id === personaId) || personas[0];
    const utter = new SpeechSynthesisUtterance(targetPersona.preview);
    const v = getSweetFemaleVoice();
    if (v) utter.voice = v;

    utter.pitch = targetPersona.pitch;
    utter.rate = speechRate * targetPersona.rate;

    utter.onend = () => {
      setTestingVoice(false);
      setActiveTestId(null);
    };
    utter.onerror = () => {
      setTestingVoice(false);
      setActiveTestId(null);
    };
    window.speechSynthesis.speak(utter);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--rule)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-elevated)',
        padding: '28px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(245, 158, 11, 0.3)'
            }}>
              <Volume2 size={18} color="#D97706" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                Sweet Voice & Speech Settings
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Select your preferred sweet young female interviewer persona (Zero male voices)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '8px', borderRadius: '50%' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Personas Grid */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px' }}>
            Interviewer Persona (Sweet Female Voices)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {personas.map(p => {
              const isSelected = selectedPersona === p.id;
              const isPlayingThis = activeTestId === p.id && testingVoice;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPersona(p.id)}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${isSelected ? 'var(--nebula)' : 'var(--rule)'}`,
                    background: isSelected ? '#F5F3FF' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'var(--shadow-sm)',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontSize: '14px', color: 'var(--ink)' }}>
                      {p.name}
                    </span>
                    {isSelected && (
                      <span className="badge badge-purple" style={{ fontSize: '10px' }}>
                        <Check size={12} /> Active
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--nebula)', marginBottom: '6px' }}>
                    {p.tag}
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--ink-secondary)', marginBottom: '12px', lineHeight: '1.4' }}>
                    {p.desc}
                  </p>

                  {/* Test button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestVoice(p.id);
                    }}
                    className={`btn ${isPlayingThis ? 'btn-accent' : 'btn-secondary'}`}
                    style={{ fontSize: '11px', padding: '5px 12px', width: '100%', borderRadius: '8px' }}
                  >
                    <Volume2 size={13} />
                    {isPlayingThis ? 'Speaking Preview...' : 'Test Sweet Voice'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Speech Rate Slider */}
        <div style={{ marginBottom: '24px', padding: '16px', borderRadius: 'var(--radius-md)', background: '#F8FAFC', border: '1px solid var(--rule)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
              Sweet Speech Cadence (Pace)
            </label>
            <span className="mono" style={{ fontSize: '12px', color: 'var(--nebula)', fontWeight: 700 }}>
              {speechRate.toFixed(2)}x
            </span>
          </div>
          <input
            type="range"
            min="0.8"
            max="1.3"
            step="0.05"
            value={speechRate}
            onChange={(e) => onChangeSpeechRate(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--nebula)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--muted)', marginTop: '4px' }}>
            <span>Gentle (0.8x)</span>
            <span>Natural (1.0x)</span>
            <span>Energetic (1.3x)</span>
          </div>
        </div>

        {/* STT Engine */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '8px' }}>
            Speech-To-Text Voice Catching
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => onSelectSttEngine('hybrid')}
              className={`btn ${sttEngine === 'hybrid' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '10px', borderRadius: '10px' }}
            >
              <Sparkles size={14} />
              Hybrid Web Speech + Whisper
            </button>
            <button
              onClick={() => onSelectSttEngine('webspeech')}
              className={`btn ${sttEngine === 'webspeech' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '10px', borderRadius: '10px' }}
            >
              <Mic size={14} />
              Web Speech API (Realtime)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--rule)', paddingTop: '16px' }}>
          <button onClick={onClose} className="btn btn-primary" style={{ padding: '8px 24px' }}>
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}
