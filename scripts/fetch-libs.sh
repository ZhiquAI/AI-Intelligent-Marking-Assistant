#!/usr/bin/env bash
set -euo pipefail

# Fetch third-party libraries into libs/ for MV3 offline use.
# Pinned versions to ensure repeatable builds.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB_DIR="${ROOT_DIR}/libs"
mkdir -p "${LIB_DIR}"

echo "Downloading libraries into ${LIB_DIR} ..."

fetch() {
  local url="$1"
  local out="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$out"
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$url" -O "$out"
  else
    echo "Error: curl or wget is required." >&2
    exit 1
  fi
  echo "OK  $(basename "$out")"
}

# html2canvas v1.4.1
fetch "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js" \
      "${LIB_DIR}/html2canvas.min.js"

# lucide UMD (pin a version)
fetch "https://unpkg.com/lucide@0.451.0/dist/umd/lucide.min.js" \
      "${LIB_DIR}/lucide.min.js"

# Chart.js v4.4.0 UMD
fetch "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js" \
      "${LIB_DIR}/chart.umd.min.js"

# jsPDF v2.5.1 UMD
fetch "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" \
      "${LIB_DIR}/jspdf.umd.min.js"

# pdf.js v3.11.174
fetch "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" \
      "${LIB_DIR}/pdf.min.js"

# Tesseract.js v4.0.2
fetch "https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/tesseract.min.js" \
      "${LIB_DIR}/tesseract.min.js"

# SheetJS (xlsx) v0.18.5 full
fetch "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js" \
      "${LIB_DIR}/xlsx.full.min.js"

echo "All libraries downloaded successfully."

