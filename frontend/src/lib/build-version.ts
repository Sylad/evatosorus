import { execSync } from 'node:child_process';

/**
 * Version servie, posée dans <meta name="version"> au build : sha court (7) du commit construit.
 * Cloudflare Pages fournit CF_PAGES_COMMIT_SHA ; en local, repli sur git ; sans git, « unknown ».
 * `cadence deliver` vérifie que la page d'accueil contient ce sha : preuve que Pages sert la nouvelle version.
 */
export function buildVersion(env: Record<string, string | undefined> = process.env): string {
  const sha = env.CF_PAGES_COMMIT_SHA?.trim();
  if (sha) return sha.slice(0, 7);
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().slice(0, 7) || 'unknown';
  } catch {
    return 'unknown';
  }
}

export const BUILD_VERSION = buildVersion();
