#!/usr/bin/env bash
# 40_run_ml.sh — the three ML paradigms, on the same Gold data as the cluster.
# This runs on your laptop (no Hadoop needed): pandas + scikit-learn.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="$ROOT/.venv/bin/python"
cd "$ROOT/ml"

echo "== 1/3 Supervised classification : provider fraud"
"$PY" 02_classification.py | tee "$ROOT/reports/classification_stdout.txt" | tail -20

echo
echo "== 2/3 Supervised regression : length of stay"
"$PY" 03_regression_los.py | tee "$ROOT/reports/regression_stdout.txt" | tail -20

echo
echo "== 3/3 Unsupervised clustering : patient risk profiles"
"$PY" 04_clustering.py | tee "$ROOT/reports/clustering_stdout.txt" | tail -20

echo
echo "All metric files:"
ls -1 "$ROOT/reports"
