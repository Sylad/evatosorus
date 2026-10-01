import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Ambiance sonore : le bouton n'existe que si le fichier existe.
 * Décidé au build — tant que `public/audio/evato-ambient.mp3` n'est pas déposé, l'URL renvoie
 * la page HTML de repli (MediaError 4) et le bouton ne ferait rien. Ne jamais livrer de faux
 * fichier pour le faire apparaître : déposer le vrai clip suffit, le bouton revient au build suivant.
 * Le build se lance depuis `frontend/` (Cloudflare Pages : `cd frontend && npm run build`).
 */
export const AMBIENT_AUDIO_SRC = '/audio/evato-ambient.mp3';

export function hasAmbientAudio(publicDir: string = join(process.cwd(), 'public')): boolean {
  return existsSync(join(publicDir, AMBIENT_AUDIO_SRC));
}

export const HAS_AMBIENT_AUDIO = hasAmbientAudio();
