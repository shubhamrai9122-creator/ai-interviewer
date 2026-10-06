import React, { useEffect, useRef } from 'react';

/**
 * SingularityWarp: The cosmic black hole singularity & celestial solar collapse animation
 * extracted and adapted directly from rishiraj38.github.io's fx/doom.js.
 *
 * When the candidate clicks "AI INTERVIEW START", this cinematic experience triggers:
 * 1. Warning siren and red doom flash overlay ("SINGULARITY DETECTED • INITIATING AI VIVA").
 * 2. Gravitational accretion disk, photon ring, rotating hot arcs, event horizon.
 * 3. 1,500 matter particles / star debris pulled spiralling into the central singularity.
 * 4. Total event horizon collapse to pure black ("The Milky Way is collapsed. Launching Neural Interview Arena").
 * 5. Supersonic Big Bang flash with cosmic shockwave rings matter dispersion.
 * 6. Smoothly hands over to the live interview arena upon completion!
 */
export default function SingularityWarp({ onComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = window.innerWidth;
    const H = window.innerHeight;
    const cx = W / 2;
    const cy = H / 2;
    const diag = Math.hypot(W, H);
    const TAU = Math.PI * 2;

    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const ease = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));

    // Timeline in seconds
    const T = {
      go: 0.7,      // Warning siren & initial gravitational pull
      suck: 3.2,    // Matter pulled rapidly into black hole event horizon
      dark: 4.2,    // Total collapse to pure singularity darkness
      bang: 5.2     // Big bang shockwave rings & rebirth into Viva Arena
    };

    // 1,500 matter debris particles spiralling inwards
    const COLORS = ['#FFFFFF', '#9FE6FF', '#FFD9A0', '#B9A6FF', '#FF9E6B', '#F59E0B'];
    const N = W < 700 ? 600 : 1500;
    const spawn = (far) => ({
      a: Math.random() * TAU,
      r: far ? diag * (0.52 + Math.random() * 0.2) : 60 + Math.random() * diag * 0.6,
      s: 0.6 + Math.random() * 2.2,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      k: 0.6 + Math.random() * 0.9,
      out: Math.random()
    });

    const parts = Array.from({ length: N }, () => spawn(false));
    let isCancelled = false;
    const t0 = performance.now();
    let last = t0;

    const frame = (now) => {
      if (isCancelled) return;
      const t = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (t >= T.bang) {
        onComplete();
        return;
      }

      ctx.clearRect(0, 0, W, H);
      const unit = Math.min(W, H) / 900;

      if (t < T.dark) {
        const fall = ease((t - T.go) / (T.suck - T.go)); // 0..1 over the fall
        const R = fall * 130 * unit + Math.pow(ease((fall - 0.8) / 0.2), 2) * diag;

        ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.92, 0.4 + 0.55 * fall)})`;
        ctx.fillRect(0, 0, W, H);

        if (t >= T.go) {
          ctx.lineCap = 'round';
          for (const p of parts) {
            const px = cx + Math.cos(p.a) * p.r;
            const py = cy + Math.sin(p.a) * p.r * 0.82;
            const pull = (70 + 60000 / Math.max(40, p.r)) * p.k * (0.4 + fall * 2.4);
            p.r -= pull * dt;
            p.a += (1.1 + 420 / Math.max(30, p.r)) * dt * (0.5 + fall);
            if (p.r < R * 0.9) {
              Object.assign(p, spawn(true));
              continue;
            }
            const x = cx + Math.cos(p.a) * p.r;
            const y = cy + Math.sin(p.a) * p.r * 0.82;
            ctx.strokeStyle = p.c;
            ctx.globalAlpha = Math.min(1, 0.25 + 140 / p.r);
            ctx.lineWidth = p.s;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
        }

        if (R > 1) {
          // Accretion disk: hot arcs, photon ring, deep cosmic glow
          const eat = ease((fall - 0.8) / 0.2);
          const g = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 3.4);
          g.addColorStop(0, 'rgba(255,240,210,0.98)');
          g.addColorStop(0.12, 'rgba(255,170,70,0.85)');
          g.addColorStop(0.4, 'rgba(210,70,30,0.35)');
          g.addColorStop(1, 'rgba(120,30,90,0)');

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(-0.35 + t * 0.1);
          ctx.scale(1, 0.42 + eat * 0.58);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, R * 3.4, 0, TAU);
          ctx.fill();
          ctx.restore();

          // Rotating relativistic photon arcs
          for (let i = 0; i < 4; i++) {
            const a0 = t * (2.4 + i) + i * 2.1;
            ctx.strokeStyle = `rgba(255,${230 - i * 35},${170 - i * 45},${0.85 - i * 0.15})`;
            ctx.lineWidth = Math.max(1.8, R * (0.09 - i * 0.02));
            ctx.beginPath();
            ctx.arc(cx, cy, R * (1.08 + i * 0.12), a0, a0 + 2.2);
            ctx.stroke();
          }

          // Central absolute event horizon shadow
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, TAU);
          ctx.fill();

          // Luminous event horizon boundary
          ctx.strokeStyle = 'rgba(255,245,225,0.95)';
          ctx.lineWidth = Math.max(1.5, 3.0 * unit);
          ctx.beginPath();
          ctx.arc(cx, cy, R, 0, TAU);
          ctx.stroke();
        }

        // Pure black singularity closure
        const shut = ease((fall - 0.86) / 0.14);
        if (shut > 0) {
          ctx.fillStyle = `rgba(0,0,0,${shut})`;
          ctx.fillRect(0, 0, W, H);
        }
      } else {
        // Big Bang Rebirth into Neural Viva Arena
        const u = (t - T.dark) / (T.bang - T.dark);
        const e = 1 - Math.pow(1 - u, 3);

        ctx.fillStyle = `rgba(0,0,0,${1 - ease(u * 1.6)})`;
        ctx.fillRect(0, 0, W, H);

        const fl = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, e * diag * 0.95));
        fl.addColorStop(0, `rgba(255,255,255,${1 - u})`);
        fl.addColorStop(0.35, `rgba(190,170,255,${(1 - u) * 0.75})`);
        fl.addColorStop(0.7, `rgba(95,216,255,${(1 - u) * 0.35})`);
        fl.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fl;
        ctx.fillRect(0, 0, W, H);

        // Cosmic shockwave rings
        for (let i = 0; i < 4; i++) {
          const rr = e * diag * (0.25 + i * 0.22);
          ctx.strokeStyle = `rgba(255,255,255,${(1 - u) * (0.85 - i * 0.15)})`;
          ctx.lineWidth = (1 - u) * (11 - i * 2) + 0.5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, rr, rr * (0.7 + i * 0.1), i * 0.5, 0, TAU);
          ctx.stroke();
        }

        for (const p of parts) {
          const rr = e * diag * (0.1 + p.out * 0.75);
          const x = cx + Math.cos(p.a) * rr;
          const y = cy + Math.sin(p.a) * rr;
          ctx.globalAlpha = (1 - u) * 0.95;
          ctx.fillStyle = p.c;
          ctx.beginPath();
          ctx.arc(x, y, p.s * (1.6 - u), 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      requestAnimationFrame(frame);
    };

    const animId = requestAnimationFrame(frame);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(animId);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#030712',
        pointerEvents: 'auto',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%'
        }}
      />

      {/* Red Doom Alert Pulse from rishiraj38.github.io */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 180px 40px rgba(255, 20, 20, 0.55)',
          animation: 'doom-flash 0.32s steps(2) infinite'
        }}
      >
        <b
          style={{
            fontFamily: 'var(--mono)',
            fontWeight: 700,
            fontSize: 'clamp(0.9rem, 2.5vw, 1.4rem)',
            letterSpacing: '0.34em',
            color: '#FF5A5A',
            textAlign: 'center',
            padding: '0 16px',
            textShadow: '0 0 20px #FF0000'
          }}
        >
          SINGULARITY DETECTED • INITIATING AI VIVA
        </b>
      </div>

      {/* Center Cinematic Message */}
      <div
        style={{
          position: 'absolute',
          bottom: '12%',
          textAlign: 'center',
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <h3
          style={{
            margin: '0 0 8px 0',
            fontFamily: 'var(--display)',
            fontWeight: 800,
            fontSize: 'clamp(1.4rem, 4vw, 2.6rem)',
            letterSpacing: '-0.02em',
            textTransform: 'uppercase',
            color: '#FFFFFF',
            textShadow: '0 0 24px rgba(255,255,255,0.7)'
          }}
        >
          WARPING TO NEURAL ARENA
        </h3>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--mono)',
            fontSize: 'clamp(0.75rem, 1.5vw, 0.95rem)',
            color: '#94A3B8',
            letterSpacing: '0.12em'
          }}
        >
          Synthesizing DSA & Web Development questions...
        </p>
      </div>

      <style>{`
        @keyframes doom-flash {
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
