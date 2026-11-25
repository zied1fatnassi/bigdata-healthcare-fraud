#!/usr/bin/env bash
# 10_ingest_hdfs.sh — raw CSVs -> HDFS landing zone (/data/bronze/...)
#
# The compose file mounts ../data/raw read-only inside the namenode container
# at /data/raw, so nothing is copied twice on disk.
#
# Usage: ./scripts/10_ingest_hdfs.sh [blocksize]
#        ./scripts/10_ingest_hdfs.sh 16m   # small blocks, to SHOW block splitting
set -euo pipefail

BLOCK="${1:-128m}"

NN=namenode
hdfs() { docker exec "$NN" hdfs dfs "$@"; }

echo "== 1. Creating the HDFS layout"
docker exec "$NN" hdfs dfs -mkdir -p \
  /data/bronze/train_labels /data/bronze/test_labels \
  /data/bronze/train_beneficiary /data/bronze/test_beneficiary \
  /data/bronze/train_inpatient /data/bronze/test_inpatient \
  /data/bronze/train_outpatient /data/bronze/test_outpatient \
  /data/bronze/length_of_stay \
  /data/silver /data/gold /data/gold/export

echo "== 2. Uploading the 8 Kaggle files + the LengthOfStay benchmark"
# -Ddfs.blocksize is a per-upload override: perfect for demonstrating that
# HDFS slices files, instead of relying on the default 128 MB.
put() { docker exec "$NN" hdfs dfs -Ddfs.blocksize="$BLOCK" -put -f "/data/raw/$1" "$2"; }

put "Train-1542865627584.csv"                 /data/bronze/train_labels/part-000.csv
put "Test-1542969243754.csv"                  /data/bronze/test_labels/part-000.csv
put "Train_Beneficiarydata-1542865627584.csv" /data/bronze/train_beneficiary/part-000.csv
put "Test_Beneficiarydata-1542969243754.csv"  /data/bronze/test_beneficiary/part-000.csv
put "Train_Inpatientdata-1542865627584.csv"   /data/bronze/train_inpatient/part-000.csv
put "Test_Inpatientdata-1542969243754.csv"    /data/bronze/test_inpatient/part-000.csv
put "Train_Outpatientdata-1542865627584.csv"  /data/bronze/train_outpatient/part-000.csv
put "Test_Outpatientdata-1542969243754.csv"   /data/bronze/test_outpatient/part-000.csv
put "LengthOfStay.csv"                        /data/bronze/length_of_stay/part-000.csv

echo "== 3. What HDFS actually stores"
hdfs -ls -h /data/bronze/train_outpatient
hdfs -du -h /data/bronze

echo "== 4. Block map of the biggest file (this is your slide 3 screenshot)"
docker exec "$NN" hdfs fsck /data/bronze/train_outpatient/part-000.csv -files -blocks

echo "== 5. Aggregate cluster status"
docker exec "$NN" hdfs dfsadmin -report | head -30

echo
echo "Done. Bronze layer = $(docker exec "$NN" hdfs dfs -du -s -h /data/bronze | awk '{print $1}')"
