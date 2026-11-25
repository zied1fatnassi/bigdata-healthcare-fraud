#!/usr/bin/env bash
# 20_run_sql.sh — executes the whole Hive pipeline, layer by layer.
# Each step prints its own row counts; if a step fails you stop there.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HS="hiveserver2"

run() {
  echo
  echo "=============================================================="
  echo "== $1"
  echo "=============================================================="
  docker cp "$ROOT/sql/$2" "$HS:/tmp/$2" >/dev/null
  docker exec -i "$HS" beeline -u "jdbc:hive2://localhost:10000" \
      --silent=true --outputformat=tsv2 -f "/tmp/$2"
}

run "Step 1/4  databases (bronze / silver / gold)"          "00_databases.hql"
run "Step 2/4  bronze: external tables over raw CSV"        "01_bronze_tables.hql"
run "Step 3/4  silver: typed, cleaned, ORC"                 "02_silver_tables.hql"
run "Step 4/4  gold: star schema + ML feature table"        "03_gold_star_schema.hql"

echo
echo "Pipeline OK. KPI queries:"
echo "  docker exec -it hiveserver2 beeline -u 'jdbc:hive2://localhost:10000' --outputformat=table -f /sql/04_kpis_and_export.hql"
