#!/usr/bin/env bash
# 50_build_docs.sh — GUIDE.md  ->  GUIDE.pdf + GUIDE.docx (+ README.pdf)
# Uses the pandoc binary shipped by pypandoc-binary and the weasyprint engine
# already installed on this machine. No LaTeX, no sudo.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
BIN="$ROOT/.venv/bin"

PANDOC=$("$BIN/python" -c "import pypandoc; print(pypandoc.get_pandoc_path())")
echo "pandoc: $PANDOC"

# WeasyPrint may live in the venv (if you `pip install weasyprint`) or in
# ~/.local/bin (this machine). Resolve it instead of assuming.
WEASY=""
for c in "$BIN/weasyprint" "$(command -v weasyprint || true)" "$HOME/.local/bin/weasyprint"; do
  [ -n "$c" ] && [ -x "$c" ] && WEASY="$c" && break
done
if [ -z "$WEASY" ]; then
  echo "weasyprint not found. Install it:  ./.venv/bin/pip install weasyprint" >&2
  exit 1
fi
echo "weasyprint: $WEASY"

COMMON=(--standalone --toc --toc-depth=2 --resource-path="$ROOT")

# --- PDF (WeasyPrint: good CSS support, no LaTeX needed) ---
"$PANDOC" GUIDE.md -o GUIDE.pdf \
  "${COMMON[@]}" \
  --css=docs/print.css \
  --pdf-engine="$WEASY"
echo "  built GUIDE.pdf  ($(du -h GUIDE.pdf | cut -f1))"

# --- Word ---
"$PANDOC" GUIDE.md -o GUIDE.docx \
  --toc --toc-depth=2
echo "  built GUIDE.docx ($(du -h GUIDE.docx | cut -f1))"

# --- README as a one-page PDF, handy to print with the report ---
"$PANDOC" README.md -o README.pdf --standalone --css=docs/print.css \
  --pdf-engine="$WEASY" --metadata title="Healthcare Fraud BI — README" 2>/dev/null || true
[ -f README.pdf ] && echo "  built README.pdf"

echo
echo "Done. Files in $ROOT:"
ls -1 GUIDE.pdf GUIDE.docx README.pdf 2>/dev/null | sed 's/^/  /'
