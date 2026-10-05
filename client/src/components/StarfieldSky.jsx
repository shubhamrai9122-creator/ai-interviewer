import React, { useEffect, useRef } from 'react';

export default function StarfieldSky() {
  const canvasRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate stars
    const starCount = Math.floor((width * height) / 4500);
    const stars = Array.from({ length: Math.min(220, Math.max(80, starCount)) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.7 + 0.2,
      speed: Math.random() * 0.008 + 0.003,
      phase: Math.random() * Math.PI * 2
    }));

    let t = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      t += 0.02;

      for (const star of stars) {
        star.phase += star.speed;
        const currentAlpha = Math.max(0.1, star.alpha + Math.sin(star.phase) * 0.35);

        ctx.fillStyle = `rgba(238, 236, 255, ${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Subtle cross flare on brightest stars
        if (star.size > 1.4 && currentAlpha > 0.6) {
          ctx.strokeStyle = `rgba(95, 216, 255, ${currentAlpha * 0.4})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(star.x - 3, star.y);
          ctx.lineTo(star.x + 3, star.y);
          ctx.moveTo(star.x, star.y - 3);
          ctx.lineTo(star.x, star.y + 3);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Mouse glow follower
    const handleMouseMove = (e) => {
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        glowRef.current.style.opacity = '1';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      {/* Fixed Universe & Starfield */}
      <div className="sky">
        <canvas ref={canvasRef} />
        {/* Nebulae drifting */}
        <div className="neb neb-a" />
        <div className="neb neb-b" />
        <div className="neb neb-c" />
      </div>

      {/* Interactive Cursor Glow */}
      <div ref={glowRef} className="cursor-glow" />
    </>
  );
}
