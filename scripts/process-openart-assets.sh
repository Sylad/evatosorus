#!/usr/bin/env bash
# Import OpenArt exports into Evatosorus after local optimization.
#
# Input convention:
#   /home/sylvain_ladoire/projects/developpeur/tmp/openart-evatosorus/
#     tyrannosaurus-rex.jpg|png|webp
#     triceratops-horridus.jpg|png|webp
#     tyrannosaurus-rex-1.mp4|mov|webm
#     tyrannosaurus-rex-2.mp4|mov|webm
#     triceratops-1.mp4|mov|webm
#
# Output convention:
#   frontend/public/species-life/<species-id>.jpg
#   frontend/public/<video-prefix>-<slot>.mp4
#
# Requires ffmpeg. Backs up replaced public assets under workspace tmp/.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUB="${ROOT}/frontend/public"
DEFAULT_IN="${ROOT}/../tmp/openart-evatosorus"
IN_DIR="$DEFAULT_IN"
DRY_RUN=0
CRF=27
IMAGE_WIDTH=1920
VIDEO_WIDTH=1280
FPS=24

usage() {
  cat <<EOF
Import OpenArt exports into Evatosorus after local optimization.

Input convention:
  $DEFAULT_IN/
    tyrannosaurus-rex.jpg|png|webp
    triceratops-horridus.jpg|png|webp
    tyrannosaurus-rex-1.mp4|mov|webm
    tyrannosaurus-rex-2.mp4|mov|webm
    triceratops-1.mp4|mov|webm

Output convention:
  frontend/public/species-life/<species-id>.jpg
  frontend/public/<video-prefix>-<slot>.mp4

Options:
  --input <dir>       Source exports directory (default: $DEFAULT_IN)
  --dry-run           Show planned imports without writing files
  --crf <n>           H.264 CRF for MP4 (default: $CRF; lower = better/larger)
  --image-width <px>  Max image width (default: $IMAGE_WIDTH)
  --video-width <px>  Max video width (default: $VIDEO_WIDTH)
  --fps <n>           Output video FPS (default: $FPS)
  -h, --help          Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --input) IN_DIR="$2"; shift 2;;
    --dry-run) DRY_RUN=1; shift;;
    --crf) CRF="$2"; shift 2;;
    --image-width) IMAGE_WIDTH="$2"; shift 2;;
    --video-width) VIDEO_WIDTH="$2"; shift 2;;
    --fps) FPS="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown argument: $1" >&2; usage; exit 2;;
  esac
done

if [[ -n "${FFMPEG:-}" && -x "${FFMPEG}" ]]; then
  : # env override
elif command -v ffmpeg >/dev/null 2>&1; then
  FFMPEG="$(command -v ffmpeg)"
elif [[ -x /mnt/e/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe ]]; then
  FFMPEG="/mnt/e/ffmpeg-master-latest-win64-gpl-shared/bin/ffmpeg.exe"
else
  echo "ffmpeg introuvable. Installe ffmpeg ou export FFMPEG=<path>." >&2
  exit 2
fi

if [[ ! -d "$IN_DIR" ]]; then
  echo "Dossier input introuvable: $IN_DIR" >&2
  exit 2
fi

BACKUP="${ROOT}/../tmp/openart-evatosorus-backup-$(date +%Y%m%d-%H%M%S)"

SPECIES_IDS=(
  tyrannosaurus-rex
  triceratops-horridus
  velociraptor-mongoliensis
  brachiosaurus-altithorax
  stegosaurus-stenops
  spinosaurus-aegyptiacus
  ankylosaurus-magniventris
  parasaurolophus-walkeri
  allosaurus-fragilis
  diplodocus-carnegii
)

VIDEO_PREFIXES=(
  tyrannosaurus-rex
  triceratops
  velociraptor
  brachiosaurus
  stegosaurus
  spinosaurus
  ankylosaurus
  parasaurolophus
  allosaurus
  diplodocus
)

find_first() {
  local base="$1"; shift
  local ext path
  for ext in "$@"; do
    for path in \
      "$IN_DIR/${base}.${ext}" \
      "$IN_DIR/species-life/${base}.${ext}" \
      "$IN_DIR/images/${base}.${ext}" \
      "$IN_DIR/videos/${base}.${ext}"; do
      [[ -f "$path" ]] && { printf '%s\n' "$path"; return 0; }
    done
  done
  return 1
}

backup_existing() {
  local dest="$1"
  [[ -f "$dest" ]] || return 0
  mkdir -p "$BACKUP/$(dirname "${dest#$PUB/}")"
  cp "$dest" "$BACKUP/${dest#$PUB/}"
}

human_size() {
  local file="$1"
  awk -v b="$(stat -c%s "$file")" 'BEGIN {
    if (b >= 1048576) printf "%.1f MB", b / 1048576;
    else printf "%.0f KB", b / 1024;
  }'
}

optimize_image() {
  local src="$1" dest="$2"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "image: $(basename "$src") -> ${dest#$PUB/}"
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  backup_existing "$dest"
  local tmp="${dest}.tmp.jpg"
  "$FFMPEG" -y -i "$src" \
    -vf "scale='min(${IMAGE_WIDTH},iw)':-2" \
    -frames:v 1 -q:v 3 "$tmp" >/dev/null 2>&1
  mv "$tmp" "$dest"
  echo "image: $(basename "$src") -> ${dest#$PUB/} ($(human_size "$dest"))"
}

optimize_video() {
  local src="$1" dest="$2"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "video: $(basename "$src") -> ${dest#$PUB/}"
    return 0
  fi
  mkdir -p "$(dirname "$dest")"
  backup_existing "$dest"
  local tmp="${dest}.tmp.mp4"
  "$FFMPEG" -y -i "$src" \
    -vf "fps=${FPS},scale='min(${VIDEO_WIDTH},iw)':-2" \
    -c:v libx264 -preset slow -crf "$CRF" \
    -pix_fmt yuv420p -an -movflags +faststart "$tmp" >/dev/null 2>&1
  if [[ ! -s "$tmp" ]]; then
    rm -f "$tmp"
    echo "video failed: $src" >&2
    return 1
  fi
  mv "$tmp" "$dest"
  echo "video: $(basename "$src") -> ${dest#$PUB/} ($(human_size "$dest"))"
}

echo "Input: $IN_DIR"
echo "ffmpeg: $FFMPEG"
[[ "$DRY_RUN" -eq 0 ]] && echo "Backup: $BACKUP"
echo

imported=0

for id in "${SPECIES_IDS[@]}"; do
  if src="$(find_first "$id" jpg jpeg png webp 2>/dev/null)"; then
    optimize_image "$src" "$PUB/species-life/${id}.jpg"
    imported=$((imported + 1))
  fi
done

for prefix in "${VIDEO_PREFIXES[@]}"; do
  for slot in 1 2; do
    if src="$(find_first "${prefix}-${slot}" mp4 mov webm m4v 2>/dev/null)"; then
      optimize_video "$src" "$PUB/${prefix}-${slot}.mp4"
      imported=$((imported + 1))
    fi
  done
done

echo
if [[ "$imported" -eq 0 ]]; then
  echo "Aucun export reconnu. Verifie les noms dans $IN_DIR."
else
  echo "OK: $imported asset(s) traite(s)."
  [[ "$DRY_RUN" -eq 0 ]] && echo "Backups: $BACKUP"
fi

exit 0
