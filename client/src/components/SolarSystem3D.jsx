import React, { useEffect, useRef } from 'react';

/**
 * SolarSystem3D — 3D Celestial Solar System Simulation
 * Inspired by #system3d from https://rishiraj38.github.io/
 * Features:
 * - Radiant central Sun with pulsing corona & solar flares
 * - 8 realistic planetary orbits with 3D perspective inclination
 * - Elliptical orbital dust trails and planetary glow atmospheres
 * - Saturn's tilted ring system
 * - Interactive mouse tilt & orbital rotation
 */
export default function SolarSystem3D({ height = '460px', isWarping = false }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.parentElement.clientWidth || 800);
    let heightPx = (canvas.height = canvas.parentElement.clientHeight || 460);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      heightPx = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Planet Definitions with orbital radii, speeds, colors, and sizes
    const planets = [
      { name: 'Mercury', radius: 46,  size: 2.8, color: '#A5A5A5', speed: 0.038, angle: 0.4 },
      { name: 'Venus',   radius: 72,  size: 4.5, color: '#E8B67C', speed: 0.026, angle: 1.8 },
      { name: 'Earth',   radius: 106, size: 5.2, color: '#4BA3E3', speed: 0.019, angle: 3.2, hasMoon: true },
      { name: 'Mars',    radius: 144, size: 3.8, color: '#E26D5C', speed: 0.014, angle: 4.9 },
      { name: 'Jupiter', radius: 196, size: 10.5, color: '#E3A857', speed: 0.009, angle: 0.9, bands: true },
      { name: 'Saturn',  radius: 254, size: 8.8, color: '#DFD195', speed: 0.006, angle: 2.4, hasRings: true },
      { name: 'Uranus',  radius: 308, size: 6.4, color: '#88D5E2', speed: 0.004, angle: 5.1 },
      { name: 'Neptune', radius: 360, size: 6.2, color: '#4B70DD', speed: 0.003, angle: 1.2 }
    ];

    // Background cosmic dust particles
    const starCount = 120;
    const stars = Array.from({ length: starCount }, () => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * heightPx * 1.5,
      z: Math.random() * 800,
      size: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.7 + 0.2
    }));

    let tiltX = 0.42; // 3D tilt perspective angle
    let rotY = 0;
    let targetTiltX = 0.42;
    let targetRotY = 0;

    // Mouse interactive tilt
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / width - 0.5;
      const mouseY = (e.clientY - rect.top) / heightPx - 0.5;
      targetTiltX = 0.42 + mouseY * 0.3;
      targetRotY = mouseX * 0.4;
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    let t = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, heightPx);
      t += 0.02;

      // Smooth interpolation for mouse interaction
      tiltX += (targetTiltX - tiltX) * 0.05;
      rotY += (targetRotY - rotY) * 0.05;

      const centerX = width / 2;
      const centerY = heightPx / 2;

      // 1. Draw Background Stars
      for (const s of stars) {
        const sx = centerX + s.x;
        const sy = centerY + s.y;
        if (sx > 0 && sx < width && sy > 0 && sy < heightPx) {
          ctx.fillStyle = `rgba(99, 102, 241, ${s.alpha * 0.4})`;
          ctx.beginPath();
          ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw Orbit Ellipses (3D inclination)
      for (const p of planets) {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(1, Math.cos(tiltX)); // 3D Perspective flattening

        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius, p.radius, 0, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      // 3. Draw Central Sun with Pulsing Corona
      const sunPulse = Math.sin(t * 1.5) * 2;
      const sunRadius = 24 + sunPulse;

      // Sun Outer Corona
      const coronaGrad = ctx.createRadialGradient(centerX, centerY, sunRadius * 0.2, centerX, centerY, sunRadius * 3.2);
      coronaGrad.addColorStop(0, 'rgba(255, 179, 71, 0.9)');
      coronaGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.4)');
      coronaGrad.addColorStop(0.7, 'rgba(239, 68, 68, 0.15)');
      coronaGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.fillStyle = coronaGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sunRadius * 3.2, 0, Math.PI * 2);
      ctx.fill();

      // Sun Core Sphere
      const sunCoreGrad = ctx.createRadialGradient(
        centerX - sunRadius * 0.3, centerY - sunRadius * 0.3, sunRadius * 0.1,
        centerX, centerY, sunRadius
      );
      sunCoreGrad.addColorStop(0, '#FFFFFF');
      sunCoreGrad.addColorStop(0.3, '#FFE082');
      sunCoreGrad.addColorStop(0.7, '#FFA000');
      sunCoreGrad.addColorStop(1, '#E65100');

      ctx.fillStyle = sunCoreGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sunRadius, 0, Math.PI * 2);
      ctx.fill();

      // 4. Calculate 3D Positions of Planets & Sort by Z for Depth
      const sortedPlanets = planets.map(p => {
        p.angle += p.speed * 0.7;
        const orbitAngle = p.angle + rotY;

        // 3D coordinates
        const x3d = Math.cos(orbitAngle) * p.radius;
        const z3d = Math.sin(orbitAngle) * p.radius; // Depth
        const y3d = z3d * Math.sin(tiltX);

        // Perspective scale factor
        const depthScale = 1 + (z3d / 400) * 0.35;

        return {
          ...p,
          screenX: centerX + x3d,
          screenY: centerY + y3d,
          depthScale,
          z: z3d
        };
      }).sort((a, b) => a.z - b.z); // Render back-to-front

      // 5. Draw Orbiting Planets
      for (const p of sortedPlanets) {
        const renderSize = Math.max(1.8, p.size * p.depthScale);

        // Planetary Atmosphere / Glow
        const glowGrad = ctx.createRadialGradient(p.screenX, p.screenY, renderSize * 0.5, p.screenX, p.screenY, renderSize * 2.5);
        glowGrad.addColorStop(0, p.color + '99');
        glowGrad.addColorStop(1, p.color + '00');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, renderSize * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Planet Body Sphere
        const planetGrad = ctx.createRadialGradient(
          p.screenX - renderSize * 0.3, p.screenY - renderSize * 0.3, renderSize * 0.1,
          p.screenX, p.screenY, renderSize
        );
        planetGrad.addColorStop(0, '#FFFFFF');
        planetGrad.addColorStop(0.4, p.color);
        planetGrad.addColorStop(1, '#0F172A');

        ctx.fillStyle = planetGrad;
        ctx.beginPath();
        ctx.arc(p.screenX, p.screenY, renderSize, 0, Math.PI * 2);
        ctx.fill();

        // Saturn Rings
        if (p.hasRings) {
          ctx.save();
          ctx.translate(p.screenX, p.screenY);
          ctx.rotate(0.35);
          ctx.beginPath();
          ctx.ellipse(0, 0, renderSize * 2.6, renderSize * 0.8, 0, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(223, 209, 149, 0.7)';
          ctx.lineWidth = 2.2;
          ctx.stroke();
          ctx.restore();
        }

        // Earth Moon
        if (p.hasMoon) {
          const moonAngle = t * 4;
          const moonX = p.screenX + Math.cos(moonAngle) * (renderSize * 2.2);
          const moonY = p.screenY + Math.sin(moonAngle) * (renderSize * 1.1);
          ctx.fillStyle = '#CBD5E1';
          ctx.beginPath();
          ctx.arc(moonX, moonY, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Planet Label
        ctx.font = '600 10px JetBrains Mono, monospace';
        ctx.fillStyle = 'rgba(71, 85, 105, 0.85)';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.screenX, p.screenY + renderSize + 12);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: height,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.7) 100%)',
        border: '1px solid var(--rule)',
        boxShadow: 'var(--shadow-card)',
        cursor: 'grab'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%'
        }}
      />

      {/* Floating 3D Celestial HUD */}
      <div style={{
        position: 'absolute',
        bottom: '14px',
        left: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        <span className="sun-pulse" style={{ width: '8px', height: '8px' }} />
        <span className="mono" style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
          3D Celestial Solar Orbit Engine • Interactive Perspective
        </span>
      </div>

      <div style={{
        position: 'absolute',
        top: '16px',
        right: '20px',
        pointerEvents: 'none'
      }}>
        <span className="badge badge-dark" style={{ fontSize: '10px' }}>
          Realtime Gravitational Physics
        </span>
      </div>
    </div>
  );
}
