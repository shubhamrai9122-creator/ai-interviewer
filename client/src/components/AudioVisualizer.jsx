import React, { useRef, useEffect } from 'react';

export default function AudioVisualizer({
  frequencyData = [],
  volume = 0,
  isSpeaking = false,
  isAiSpeaking = false,
  label = 'Voice Frequency Spectrum'
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // If AI is speaking, render synthetic examiner wave
    if (isAiSpeaking) {
      const time = Date.now() * 0.005;
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#6366f1');
      gradient.addColorStop(0.5, '#06b6d4');
      gradient.addColorStop(1, '#a855f7');

      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * 0.05 + time) * 16 * Math.sin(x * 0.02 + time * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      return;
    }

    // If Student is speaking or has frequency data
    if (frequencyData && frequencyData.length > 0) {
      const barCount = 32;
      const barWidth = (width / barCount) - 2;
      const step = Math.floor(frequencyData.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = frequencyData[i * step] || 0;
        const percent = val / 255;
        const barHeight = Math.max(4, percent * height * 0.9);
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Gradient based on energy
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        if (val > 180) {
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(1, '#f43f5e'); // high peak
        } else if (val > 90) {
          gradient.addColorStop(0, '#6366f1');
          gradient.addColorStop(1, '#06b6d4');
        } else {
          gradient.addColorStop(0, '#312e81');
          gradient.addColorStop(1, '#6366f1');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 3);
        ctx.fill();
      }
      return;
    }

    // Idle state: subtle glowing baseline
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }, [frequencyData, volume, isSpeaking, isAiSpeaking]);

  return (
    <div style={{
      background: 'rgba(6, 9, 19, 0.85)',
      borderRadius: 'var(--radius-md)',
      padding: '14px 18px',
      border: '1px solid var(--border-subtle)',
      position: 'relative'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isAiSpeaking ? 'var(--cyan)' : (isSpeaking ? 'var(--emerald)' : 'var(--text-dim)'),
            boxShadow: (isSpeaking || isAiSpeaking) ? '0 0 10px currentColor' : 'none'
          }} />
          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>
            {isAiSpeaking ? 'AI Examiner Voice Output' : isSpeaking ? 'Student Live Voice Capture' : label}
          </span>
        </div>
        <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
          {isAiSpeaking ? 'Neural TTS Active' : `${volume}% RMS Audio Level`}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={420}
        height={54}
        style={{
          width: '100%',
          height: '54px',
          display: 'block'
        }}
      />
    </div>
  );
}
