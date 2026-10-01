/**
 * Pause des animations de l'accueil (WCAG 2.2.2) : vidéo de fond, crâne SMIL,
 * poussière, pulsation du logo. Choix mémorisé dans localStorage ; le bouton
 * (MotionToggle.astro) diffuse le changement par un événement window que les
 * îlots React écoutent. En prefers-reduced-motion, tout est figé d'office.
 */
export const MOTION_KEY = 'evato-motion-paused';
export const MOTION_EVENT = 'evato:motion';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Pause demandée par le visiteur (bouton), indépendamment du mouvement réduit. */
export function isUserPaused(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setUserPaused(paused: boolean): void {
  try {
    localStorage.setItem(MOTION_KEY, String(paused));
  } catch {
    /* stockage indisponible : la pause vaut pour la page en cours */
  }
  window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: { paused } }));
}

export function onMotionChange(cb: (paused: boolean) => void): () => void {
  const handler = (e: Event) => cb(Boolean((e as CustomEvent<{ paused: boolean }>).detail?.paused));
  window.addEventListener(MOTION_EVENT, handler);
  return () => window.removeEventListener(MOTION_EVENT, handler);
}
