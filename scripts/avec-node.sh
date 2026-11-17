#!/usr/bin/env bash
# Lance une commande avec la Node demandée par .nvmrc (racine du dépôt), via nvm.
# Astro 7 refuse Node < 22.23.4 et la Node par défaut de la machine peut être plus ancienne :
# les commandes de la porte (cadence.yaml) passent par ce lanceur.
#   scripts/avec-node.sh npx astro build
set -euo pipefail
racine="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
version="$(tr -d '[:space:]' < "$racine/.nvmrc")"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # nvm.sh n'est pas écrit pour set -u.
  set +u
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh" --no-use
  if ! nvm use --silent "$version" >/dev/null; then
    echo "avec-node : Node $version (.nvmrc) non installée — nvm install $version" >&2
    exit 1
  fi
  set -u
fi
# Sans nvm (Cloudflare Pages, CI) : la Node du PATH est gardée ; Astro dit lui-même si elle est trop ancienne.
exec "$@"
