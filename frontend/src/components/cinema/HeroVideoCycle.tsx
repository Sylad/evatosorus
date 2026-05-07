import { useEffect, useRef, useState } from 'react';

const VIDEOS = ['/hero-trex-1.mp4', '/hero-trex-2.mp4', '/hero-trex-3.mp4'];
const PHASE_MS = 25_000;
const FADE_MS = 2500;

// Three MP4 generated on openart.ai stacked absolute, cross-fade every 25s.
// preload='auto' on the first video so it starts immediately ; the other
// two preload metadata only and load opportunistically in the background.
// Total bandwidth on first paint stays around 12 MB instead of 40.
export function HeroVideoCycle() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = (performance.now() - start) % (PHASE_MS * VIDEOS.length);
      setActive(Math.floor(elapsed / PHASE_MS));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Bump preload to 'auto' on the next video ~5s before its turn to avoid
  // the cross-fade landing on a still-loading frame.
  useEffect(() => {
    const next = (active + 1) % VIDEOS.length;
    const v = refs.current[next];
    if (v && v.preload !== 'auto') {
      v.preload = 'auto';
      v.load();
    }
  }, [active]);

  return (
    <>
      <div className="hero-video-stack" aria-hidden="true">
        {VIDEOS.map((src, i) => (
          <video
            key={src}
            ref={(el) => { refs.current[i] = el; }}
            autoPlay
            loop
            muted
            playsInline
            preload={i === 0 ? 'auto' : 'metadata'}
            poster="/hero-trex.jpg"
            style={{ opacity: i === active ? 1 : 0 }}
          >
            <source src={src} type="video/mp4" />
          </video>
        ))}
      </div>
      <style>{`
        .hero-video-stack {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: #0d0a06;
        }
        .hero-video-stack video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: opacity ${FADE_MS}ms ease-in-out;
          will-change: opacity;
          filter: saturate(1.05) contrast(1.02);
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-video-stack video { transition: opacity 600ms ease-in-out; }
        }
      `}</style>
    </>
  );
}
