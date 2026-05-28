#!/usr/bin/env bash
# Import OpenArt exports into Evatosorus after local optimization.
#
# Input convention:
#   /home/sylvain_ladoire/projects/developpeur/tmp/openart-evatosorus/
#     tyrannosaurus-rex.jpg|png|webp
#     Tyrannosaurus rex.jpg|png|webp
#     triceratops-horridus.jpg|png|webp
#     tyrannosaurus-rex-1.mp4|mov|webm
#     tyrannosaurus-rex-2.mp4|mov|webm
#     Tyrannosaurus rex.mp4|mov|webm
#     triceratops-1.mp4|mov|webm
#
# Output convention:
#   frontend/public/species-life/<species-id>-openart-20260528.jpg
#   frontend/public/<video-prefix>-openart-20260528b-<slot>.mp4
#
# Requires ffmpeg. Backs up replaced public assets under workspace tmp/.
# After a successful real import, recognized source exports are removed from tmp.

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
MEDIA_VERSION="openart-20260528b"

usage() {
  cat <<EOF
Import OpenArt exports into Evatosorus after local optimization.

Input convention:
  $DEFAULT_IN/
    tyrannosaurus-rex.jpg|png|webp
    Tyrannosaurus rex.jpg|png|webp
    triceratops-horridus.jpg|png|webp
    tyrannosaurus-rex-1.mp4|mov|webm
    tyrannosaurus-rex-2.mp4|mov|webm
    Tyrannosaurus rex.mp4|mov|webm
    triceratops-1.mp4|mov|webm

Output convention:
  frontend/public/species-life/<species-id>-${MEDIA_VERSION}.jpg
  frontend/public/<video-prefix>-${MEDIA_VERSION}-<slot>.mp4

Options:
  --input <dir>       Source exports directory (default: $DEFAULT_IN)
  --dry-run           Show planned imports without writing files
  --crf <n>           H.264 CRF for MP4 (default: $CRF; lower = better/larger)
  --image-width <px>  Max image width (default: $IMAGE_WIDTH)
  --video-width <px>  Max video width (default: $VIDEO_WIDTH)
  --fps <n>           Output video FPS (default: $FPS)
  --version <slug>    Public asset version suffix (default: $MEDIA_VERSION)
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
    --version) MEDIA_VERSION="$2"; shift 2;;
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
  iguanodon-bernissartensis
  carnotaurus-sastrei
  giganotosaurus-carolinii
  deinonychus-antirrhopus
  pachycephalosaurus-wyomingensis
  therizinosaurus-cheloniformis
  argentinosaurus-huinculensis
  mosasaurus-hoffmanni
  pteranodon-longiceps
  archaeopteryx-lithographica
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
  iguanodon
  carnotaurus
  giganotosaurus
  deinonychus
  pachycephalosaurus
  therizinosaurus
  argentinosaurus
  mosasaurus
  pteranodon
  archaeopteryx
)

declare -A SCIENTIFIC_NAMES=(
  [tyrannosaurus-rex]="Tyrannosaurus rex"
  [triceratops-horridus]="Triceratops horridus"
  [velociraptor-mongoliensis]="Velociraptor mongoliensis"
  [brachiosaurus-altithorax]="Brachiosaurus altithorax"
  [stegosaurus-stenops]="Stegosaurus stenops"
  [spinosaurus-aegyptiacus]="Spinosaurus aegyptiacus"
  [ankylosaurus-magniventris]="Ankylosaurus magniventris"
  [parasaurolophus-walkeri]="Parasaurolophus walkeri"
  [allosaurus-fragilis]="Allosaurus fragilis"
  [diplodocus-carnegii]="Diplodocus carnegii"
  [iguanodon-bernissartensis]="Iguanodon bernissartensis"
  [carnotaurus-sastrei]="Carnotaurus sastrei"
  [giganotosaurus-carolinii]="Giganotosaurus carolinii"
  [deinonychus-antirrhopus]="Deinonychus antirrhopus"
  [pachycephalosaurus-wyomingensis]="Pachycephalosaurus wyomingensis"
  [therizinosaurus-cheloniformis]="Therizinosaurus cheloniformis"
  [argentinosaurus-huinculensis]="Argentinosaurus huinculensis"
  [mosasaurus-hoffmanni]="Mosasaurus hoffmanni"
  [pteranodon-longiceps]="Pteranodon longiceps"
  [archaeopteryx-lithographica]="Archaeopteryx lithographica"
)

declare -A VIDEO_SPECIES_IDS=(
  [tyrannosaurus-rex]="tyrannosaurus-rex"
  [triceratops]="triceratops-horridus"
  [velociraptor]="velociraptor-mongoliensis"
  [brachiosaurus]="brachiosaurus-altithorax"
  [stegosaurus]="stegosaurus-stenops"
  [spinosaurus]="spinosaurus-aegyptiacus"
  [ankylosaurus]="ankylosaurus-magniventris"
  [parasaurolophus]="parasaurolophus-walkeri"
  [allosaurus]="allosaurus-fragilis"
  [diplodocus]="diplodocus-carnegii"
  [iguanodon]="iguanodon-bernissartensis"
  [carnotaurus]="carnotaurus-sastrei"
  [giganotosaurus]="giganotosaurus-carolinii"
  [deinonychus]="deinonychus-antirrhopus"
  [pachycephalosaurus]="pachycephalosaurus-wyomingensis"
  [therizinosaurus]="therizinosaurus-cheloniformis"
  [argentinosaurus]="argentinosaurus-huinculensis"
  [mosasaurus]="mosasaurus-hoffmanni"
  [pteranodon]="pteranodon-longiceps"
  [archaeopteryx]="archaeopteryx-lithographica"
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

find_first_any_base() {
  local ext_count="$1"; shift
  local exts=()
  local i
  for ((i = 0; i < ext_count; i++)); do
    exts+=("$1")
    shift
  done
  local base src
  for base in "$@"; do
    if src="$(find_first "$base" "${exts[@]}" 2>/dev/null)"; then
      printf '%s\n' "$src"
      return 0
    fi
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
echo "Version: $MEDIA_VERSION"
[[ "$DRY_RUN" -eq 0 ]] && echo "Backup: $BACKUP"
echo

imported=0
imported_sources=()

remember_source() {
  local src="$1"
  local existing
  for existing in "${imported_sources[@]}"; do
    [[ "$existing" == "$src" ]] && return 0
  done
  imported_sources+=("$src")
}

for id in "${SPECIES_IDS[@]}"; do
  if src="$(find_first_any_base 4 jpg jpeg png webp "$id" "${SCIENTIFIC_NAMES[$id]}" 2>/dev/null)"; then
    optimize_image "$src" "$PUB/species-life/${id}-${MEDIA_VERSION}.jpg"
    [[ "$DRY_RUN" -eq 0 ]] && remember_source "$src"
    imported=$((imported + 1))
  fi
done

for prefix in "${VIDEO_PREFIXES[@]}"; do
  species_id="${VIDEO_SPECIES_IDS[$prefix]}"
  imported_slot_1=0
  imported_slot_2=0
  for slot in 1 2; do
    if src="$(find_first_any_base 4 mp4 mov webm m4v "${prefix}-${slot}" "${species_id}-${slot}" "${SCIENTIFIC_NAMES[$species_id]}-${slot}" 2>/dev/null)"; then
      optimize_video "$src" "$PUB/${prefix}-${MEDIA_VERSION}-${slot}.mp4"
      [[ "$DRY_RUN" -eq 0 ]] && remember_source "$src"
      imported=$((imported + 1))
      if [[ "$slot" -eq 1 ]]; then
        imported_slot_1=1
      else
        imported_slot_2=1
      fi
    fi
  done
  if src="$(find_first_any_base 4 mp4 mov webm m4v "$prefix" "$species_id" "${SCIENTIFIC_NAMES[$species_id]}" 2>/dev/null)"; then
    target_slot=1
    if [[ -f "$PUB/${prefix}-${MEDIA_VERSION}-1.mp4" || "$imported_slot_1" -eq 1 ]]; then
      target_slot=2
    fi
    if [[ "$target_slot" -eq 2 && "$imported_slot_2" -eq 1 ]]; then
      echo "video skip: $(basename "$src") deja couvert par un export -2 explicite"
    else
      optimize_video "$src" "$PUB/${prefix}-${MEDIA_VERSION}-${target_slot}.mp4"
      [[ "$DRY_RUN" -eq 0 ]] && remember_source "$src"
      imported=$((imported + 1))
    fi
  fi
done

cleanup_imported_sources() {
  [[ "$DRY_RUN" -eq 0 ]] || return 0
  [[ "${#imported_sources[@]}" -gt 0 ]] || return 0

  local src cleaned=0
  for src in "${imported_sources[@]}"; do
    rm -f -- "$src" "$src:Zone.Identifier"
    cleaned=$((cleaned + 1))
  done

  find "$IN_DIR" -mindepth 1 -maxdepth 2 -type f -name '*:Zone.Identifier' -delete
  find "$IN_DIR" -mindepth 1 -maxdepth 2 -type d -empty -delete
  echo "Nettoyage input: $cleaned export(s) source supprime(s)."
}

echo
if [[ "$imported" -eq 0 ]]; then
  echo "Aucun export reconnu. Verifie les noms dans $IN_DIR."
else
  echo "OK: $imported asset(s) traite(s)."
  [[ "$DRY_RUN" -eq 0 ]] && echo "Backups: $BACKUP"
  cleanup_imported_sources
fi

exit 0
