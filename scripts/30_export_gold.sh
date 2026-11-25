#!/usr/bin/env bash
# 30_export_gold.sh — Gold tables (Hive/HDFS) -> CSV files on your disk,
# ready to be imported in Power BI.
#
# Two ways are provided because beeline can be chatty on some images:
#   A) beeline --outputformat=csv2  (one file per query, headers included)
#   B) INSERT OVERWRITE DIRECTORY + hdfs dfs -get  (if A writes junk)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/data/gold"
mkdir -p "$OUT"

query() { # query <table> <select>
  local table="$1" sql="$2"
  docker exec -i hiveserver2 beeline -u "jdbc:hive2://localhost:10000" \
      --silent=true --outputformat=csv2 --showHeader=true \
      -e "$sql" 2>/dev/null > "$OUT/$table.csv"
  printf '  %-28s %6s rows\n' "$table.csv" "$(( $(wc -l < "$OUT/$table.csv") - 1 ))"
}

echo "== Exporting Gold tables with beeline (method A)"
query "fact_claims" "SELECT claim_id,bene_id,provider,claim_date_key,claim_start,reimbursed,deductible_paid,los_days,n_physicians,admit_diagnosis,diagnosis_group,has_deductible,claim_type FROM gold.fact_claims"
query "dim_provider" "SELECT * FROM gold.dim_provider"
query "dim_beneficiary" "SELECT * FROM gold.dim_beneficiary"
query "dim_date" "SELECT * FROM gold.dim_date"
query "fact_provider_features" "SELECT * FROM gold.fact_provider_features"

# Method B (uncomment if method A produced empty files)
# docker exec -i hiveserver2 beeline -u "jdbc:hive2://localhost:10000" --silent=true -f /sql/04_kpis_and_export.hql
# for t in fact_claims dim_provider dim_beneficiary dim_date fact_provider_features; do
#   docker exec hiveserver2 hdfs dfs -getmerge "/data/gold/export/$t" "$OUT/$t.csv"
# done

echo
echo "== ML outputs already produced by the Python pipeline"
ls -1 "$OUT" 2>/dev/null | sed 's/^/  /'
echo
echo "Next: import these CSVs in Power BI (see powerbi/POWERBI_BUILD.md)"
