#!/usr/bin/env bash
# Archivo de prueba del tema: Bash
set -euo pipefail

ARCHIVE_DIR="${HOME}/bureau/archive"
readonly MAX_RETRIES=3

seal_sector() {
  local sector="$1"
  local attempt=0
  while (( attempt < MAX_RETRIES )); do
    if mkdir -p "${ARCHIVE_DIR}/${sector}"; then
      echo "Sector ${sector} sellado (intento $((attempt + 1)))"
      return 0
    fi
    attempt=$((attempt + 1))
  done
  echo "No se pudo sellar ${sector}" >&2
  return 1
}

for sector in research maintenance; do
  seal_sector "$sector" || exit 1
done
