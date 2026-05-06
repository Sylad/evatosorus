import { useEffect, useRef } from 'react';

// Lightweight particle field — amber dust motes drifting upward, evoking
// volcanic ash / pollen in the mesozoic atmosphere. Uses 2D canvas (not
// R3F) to keep the landing fast and Cloudflare-friendly. R3F is reserved
// for the species 3D viewer page.
const PARTICLE_COUNT = 90;

type Mote = {
  x: number;
  y: number;
  vy: number;
  vx: number;
  r: number;
  alpha: number;
  hue: number;
};

export function DustField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const motes: Mote[] = Array.from({ length: PARTICLE_COUNT }, () => spawn(width, height, true));

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      for (const m of motes) {
        m.y += m.vy;
        m.x += m.vx;
        m.alpha += (Math.random() - 0.5) * 0.005;
        m.alpha = Math.max(0.05, Math.min(0.55, m.alpha));
        if (m.y < -10 || m.x < -20 || m.x > width + 20) {
          Object.assign(m, spawn(width, height, false));
        }
        ctx.beginPath();
        const grad = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 4);
        grad.addColorStop(0, `hsla(${m.hue}, 70%, 70%, ${m.alpha})`);
        grad.addColorStop(1, `hsla(${m.hue}, 70%, 70%, 0)`);
        ctx.fillStyle = grad;
        ctx.arc(m.x, m.y, m.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        mixBlendMode: 'screen',
      }}
    />
  );
}

function spawn(width: number, height: number, scattered: boolean): Mote {
  return {
    x: Math.random() * width,
    y: scattered ? Math.random() * height : height + Math.random() * 50,
    vy: -(0.15 + Math.random() * 0.4),
    vx: (Math.random() - 0.5) * 0.18,
    r: 0.6 + Math.random() * 1.4,
    alpha: 0.15 + Math.random() * 0.35,
    hue: 30 + Math.random() * 25, // amber to gold
  };
}
