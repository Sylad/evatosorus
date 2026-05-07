#!/usr/bin/env bash
# Re-encode tous les MP4 > 5 MB dans frontend/public/ pour le web :
# H.264 CRF 26 + downscale 1280px max + strip audio + faststart.
#
# Usage :
#   ./scripts/optimize-mp4.sh                # scan public/, ré-encode > 5 MB
#   ./scripts/optimize-mp4.sh --force        # ré-encode même les < 5 MB
#   ./scripts/optimize-mp4.sh --crf 22       # qualité ++, fichiers ×2
#   ./scripts/optimize-mp4.sh path/to/file.mp4   # un seul fichier
#
# Cherche ffmpeg dans cet ordre :
#   1. $FFMPEG (env var)
#   2. ffmpeg sur le PATH
#   3. /mnt/e/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe (WSL → Windows)
#
# Toujours backup l'original en .orig dans /tmp/mp4-bak-<timestamp>/ avant
# remplacement, au cas où la qualité te déplait.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUB="${ROOT}/frontend/public"
BAK="/tmp/mp4-bak-$(date +%Y%m%d-%H%M%S)"

# Defaults
CRF=26
SIZE_THRESHOLD_MB=5
FORCE=0
TARGETS=()

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=1; shift;;
    --crf) CRF="$2"; shift 2;;
    --threshold) SIZE_THRESHOLD_MB="$2"; shift 2;;
    -h|--help)
      sed -n '2,/^set/p' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *) TARGETS+=("$1"); shift;;
  esac
done

# Locate ffmpeg
if [[ -n "${FFMPEG:-}" && -x "${FFMPEG}" ]]; then
  : # use env
elif command -v ffmpeg >/dev/null 2>&1; then
  FFMPEG="$(command -v ffmpeg)"
elif [[ -x /mnt/e/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe ]]; then
  FFMPEG="/mnt/e/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe"
else
  echo "❌ ffmpeg introuvable. Installe ffmpeg ou export FFMPEG=<path>" >&2
  exit 2
fi

echo "▶ ffmpeg : $FFMPEG"
echo "▶ CRF $CRF, threshold ${SIZE_THRESHOLD_MB} MB"

# Build the file list
if [[ ${#TARGETS[@]} -eq 0 ]]; then
  mapfile -t FILES < <(find "$PUB" -type f -name "*.mp4")
else
  FILES=("${TARGETS[@]}")
fi

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "Aucun MP4 trouvé." >&2
  exit 0
fi

mkdir -p "$BAK"
echo "▶ Backups originaux dans : $BAK"
echo

total_before=0
total_after=0
encoded=0
skipped=0

for src in "${FILES[@]}"; do
  if [[ ! -f "$src" ]]; then
    echo "  ⚠ skip (introuvable) : $src"
    continue
  fi

  before=$(stat -c%s "$src")
  before_mb=$((before / 1024 / 1024))

  if [[ "$FORCE" -eq 0 && "$before_mb" -lt "$SIZE_THRESHOLD_MB" ]]; then
    printf "  ✓ skip (< %sM) : %s (%sM)\n" "$SIZE_THRESHOLD_MB" "$(basename "$src")" "$before_mb"
    skipped=$((skipped + 1))
    continue
  fi

  bak="$BAK/$(basename "$src")"
  cp "$src" "$bak"

  tmp="${src}.tmp.mp4"
  "$FFMPEG" -y -i "$src" \
    -c:v libx264 -crf "$CRF" -preset slow \
    -vf "scale='min(1280,iw)':-2" \
    -an -movflags +faststart -pix_fmt yuv420p \
    "$tmp" 2>/dev/null

  if [[ ! -s "$tmp" ]]; then
    echo "  ❌ encode failed : $src"
    rm -f "$tmp"
    continue
  fi

  after=$(stat -c%s "$tmp")
  after_mb=$((after / 1024 / 1024))
  total_before=$((total_before + before))
  total_after=$((total_after + after))

  if [[ "$after" -ge "$before" ]]; then
    printf "  ✓ skip (déjà optimal) : %s (%sM, encode=%sM)\n" \
      "$(basename "$src")" "$before_mb" "$after_mb"
    rm "$tmp"
    skipped=$((skipped + 1))
    continue
  fi

  pct=$(awk "BEGIN{printf \"%.0f\", (1-$after/$before)*100}")
  printf "  ✂ %s : %sM → %sM (-%s%%)\n" \
    "$(basename "$src")" "$before_mb" "$after_mb" "$pct"

  mv "$tmp" "$src"
  encoded=$((encoded + 1))
done

echo
echo "═══════════════════════════════════════"
if [[ "$encoded" -gt 0 ]]; then
  before_mb=$((total_before / 1024 / 1024))
  after_mb=$((total_after / 1024 / 1024))
  pct=$(awk "BEGIN{printf \"%.0f\", (1-$total_after/$total_before)*100}")
  echo "✅ $encoded fichier(s) ré-encodé(s) : ${before_mb}M → ${after_mb}M (-${pct}%)"
fi
[[ "$skipped" -gt 0 ]] && echo "✓ $skipped fichier(s) skippé(s)"
echo "▶ Backups originaux : $BAK (à supprimer manuellement quand validé)"
