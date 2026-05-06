import { useEffect, useState } from 'react';

type Phase = {
  id: string;
  label: string;
  bg: string;
};

// Three phases — Trias, Jurassique, Crétacé — cycle on a 75-second loop.
// Each phase is a layered radial gradient evoking that period's mood ;
// real paleo-art photographs (Wikimedia Commons, public domain) will
// replace these in a later pass once the import script lands.
const PHASES: Phase[] = [
  {
    id: 'trias',
    label: 'Trias — 252 à 201 Ma',
    bg:
      'radial-gradient(ellipse at 20% 30%, rgba(199, 81, 49, 0.55) 0%, transparent 55%),' +
      'radial-gradient(ellipse at 80% 70%, rgba(212, 165, 94, 0.40) 0%, transparent 60%),' +
      'radial-gradient(ellipse at 50% 100%, rgba(13, 10, 6, 0.95) 0%, transparent 70%),' +
      'linear-gradient(180deg, #1a0f08 0%, #0d0a06 100%)',
  },
  {
    id: 'jurassique',
    label: 'Jurassique — 201 à 145 Ma',
    bg:
      'radial-gradient(ellipse at 70% 25%, rgba(94, 143, 110, 0.45) 0%, transparent 60%),' +
      'radial-gradient(ellipse at 25% 80%, rgba(212, 165, 94, 0.35) 0%, transparent 60%),' +
      'radial-gradient(ellipse at 50% 50%, rgba(255, 200, 121, 0.18) 0%, transparent 65%),' +
      'linear-gradient(180deg, #0f1a12 0%, #0a0f08 100%)',
  },
  {
    id: 'cretace',
    label: 'Crétacé — 145 à 66 Ma',
    bg:
      'radial-gradient(ellipse at 50% 0%, rgba(255, 200, 121, 0.45) 0%, transparent 55%),' +
      'radial-gradient(ellipse at 15% 60%, rgba(199, 81, 49, 0.40) 0%, transparent 55%),' +
      'radial-gradient(ellipse at 85% 90%, rgba(13, 10, 6, 0.85) 0%, transparent 65%),' +
      'linear-gradient(180deg, #1a0d06 0%, #0d0604 100%)',
  },
];

const CYCLE_MS = 75_000;
const PHASE_MS = CYCLE_MS / PHASES.length;

export function CycleBackdrop() {
  const [active, setActive] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState(PHASES[0].label);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = () => {
      const elapsed = (performance.now() - start) % CYCLE_MS;
      const i = Math.floor(elapsed / PHASE_MS);
      setActive(i);
      setPhaseLabel(PHASES[i].label);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <>
      <div aria-hidden="true" className="cycle-root">
        {PHASES.map((p, i) => (
          <div
            key={p.id}
            className="cycle-layer"
            style={{
              background: p.bg,
              opacity: i === active ? 1 : 0,
            }}
          />
        ))}
      </div>
      <div className="cycle-label">{phaseLabel}</div>
      <style>{`
        .cycle-root {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }
        .cycle-layer {
          position: absolute;
          inset: 0;
          transition: opacity 4500ms ease-in-out;
          will-change: opacity;
        }
        .cycle-label {
          position: fixed;
          left: 50%;
          bottom: 1.5rem;
          transform: translateX(-50%);
          z-index: 20;
          font-family: 'Cinzel', serif;
          font-size: 0.78rem;
          letter-spacing: 0.32em;
          color: rgba(212, 165, 94, 0.65);
          text-shadow: 0 0 8px rgba(13, 10, 6, 0.85);
          pointer-events: none;
          user-select: none;
          text-transform: uppercase;
        }
        @media (prefers-reduced-motion: reduce) {
          .cycle-layer { transition: opacity 600ms ease-in-out; }
        }
      `}</style>
    </>
  );
}
