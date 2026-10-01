import { useEffect, useRef, useState } from 'react';
import { isUserPaused, onMotionChange } from '../../lib/motion';

// 5 vidéos pour la landing — ambiances variées (jungle, orage, volcanique,
// crépuscule, T-Rex hero). Loop total 125s. Les vidéos 2/3 sont réservées aux
// pages /films et /about, et 6/7/9 aux bandeaux de pages internes.
const VIDEOS = [
  '/hero-trex-1.mp4',
  '/hero-trex-4.mp4',
  '/hero-trex-5.mp4',
  '/hero-trex-8.mp4',
  '/hero-trex-10.mp4',
];
const PHASE_MS = 25_000;
const FADE_MS = 2500;
// La vidéo suivante n'est montée (et téléchargée) que peu avant son tour.
const PRELOAD_LEAD_MS = 6_000;
// Image fixe (1600 px, ~180 Ko) : affichée sous les vidéos le temps qu'elles
// démarrent, et seule en mouvement réduit.
const POSTER = '/hero-trex-poster.jpg';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Fond vidéo de l'accueil, une seule vidéo à la fois :
// - la vidéo active est la seule qui joue ;
// - la suivante est montée en preload="auto" PRELOAD_LEAD_MS avant son tour,
//   pour que le fondu ne tombe pas sur une image en cours de chargement ;
// - la précédente reste montée le temps du fondu (FADE_MS), puis est retirée ;
// - en prefers-reduced-motion : l'image fixe seule, aucune vidéo demandée ;
// - bouton Pause : la vidéo active se fige, le cycle s'arrête.
// Avant : 5 <video> montées d'emblée (2 en preload auto, 3 en metadata qui
// finissaient par tout télécharger) et un poster de 2,2 Mo, soit 11,5 Mo.
export function HeroVideoCycle() {
  const [reduced] = useState(reducedMotion);
  // Bouton Pause (MotionToggle) : la vidéo active se fige sur son image, le
  // cycle s'arrête. Pause mémorisée au chargement : image fixe, aucune vidéo
  // demandée tant que le visiteur ne relance pas.
  const [paused, setPaused] = useState(isUserPaused);
  const [started, setStarted] = useState(() => !isUserPaused());
  const running = !reduced && !paused;
  useEffect(() => onMotionChange(setPaused), []);
  useEffect(() => {
    if (running) setStarted(true);
  }, [running]);
  const [active, setActive] = useState(0);
  const [warm, setWarm] = useState(false);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [ready, setReady] = useState<ReadonlySet<number>>(new Set());
  const refs = useRef<(HTMLVideoElement | null)[]>([]);
  const elapsedRef = useRef(0);
  const switchingRef = useRef(false);

  // Minuterie de phase : reprend là où elle s'était arrêtée.
  useEffect(() => {
    if (!running) return;
    const start = performance.now();
    const remaining = Math.max(0, PHASE_MS - elapsedRef.current);
    const tWarm = window.setTimeout(() => setWarm(true), Math.max(0, remaining - PRELOAD_LEAD_MS));
    const tSwitch = window.setTimeout(() => {
      switchingRef.current = true;
      setLeaving(active);
      setActive((active + 1) % VIDEOS.length);
      setWarm(false);
    }, remaining);
    return () => {
      window.clearTimeout(tWarm);
      window.clearTimeout(tSwitch);
      elapsedRef.current = switchingRef.current ? 0 : elapsedRef.current + (performance.now() - start);
      switchingRef.current = false;
    };
  }, [active, running]);

  // La précédente quitte le DOM une fois le fondu terminé.
  useEffect(() => {
    if (leaving === null) return;
    const t = window.setTimeout(() => setLeaving(null), FADE_MS);
    return () => window.clearTimeout(t);
  }, [leaving]);

  // Seule la vidéo active joue.
  useEffect(() => {
    const v = refs.current[active];
    if (!v) return;
    if (running) v.play().catch(() => {});
    else v.pause();
  }, [active, running]);

  const next = (active + 1) % VIDEOS.length;
  const mounted = (i: number) => !reduced && (started || running) && (i === active || i === leaving || (warm && i === next));

  return (
    <>
      <div className="hero-video-stack" aria-hidden="true">
        <img className="hero-poster" src={POSTER} alt="" decoding="async" fetchPriority="high" />
        {VIDEOS.map((src, i) =>
          mounted(i) ? (
            <video
              key={src}
              ref={(el) => { refs.current[i] = el; }}
              loop
              muted
              playsInline
              preload="auto"
              onPlaying={() => setReady((r) => (r.has(i) ? r : new Set(r).add(i)))}
              style={{ opacity: i === active && ready.has(i) ? 1 : 0 }}
            >
              <source src={src} type="video/mp4" />
            </video>
          ) : null,
        )}
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
        .hero-video-stack video,
        .hero-video-stack .hero-poster {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: saturate(1.05) contrast(1.02);
        }
        .hero-video-stack video {
          transition: opacity ${FADE_MS}ms ease-in-out;
          will-change: opacity;
        }
      `}</style>
    </>
  );
}
