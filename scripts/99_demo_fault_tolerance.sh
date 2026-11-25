#!/usr/bin/env bash
# 99_demo_fault_tolerance.sh — the 90-second live demo that proves
# replication actually works. Run it in front of the professor.
set -uo pipefail
NN=namenode

echo "################  BEFORE  ################"
docker exec "$NN" hdfs dfsadmin -report | grep -E "Live datanodes|Name:|DFS Used%" | head -8
docker exec "$NN" hdfs fsck /data/bronze/train_outpatient/part-000.csv -files -blocks | tail -5

echo
echo "################  KILL datanode2  ################"
docker stop datanode2 >/dev/null
sleep 12
docker exec "$NN" hdfs dfsadmin -report | grep -E "Live datanodes|Dead datanodes" | head -4
echo "-- fsck: the file is still COMPLETE because a second replica exists --"
docker exec "$NN" hdfs fsck /data/bronze/train_outpatient/part-000.csv -files -blocks | tail -5

echo
echo "################  READ THE FILE ANYWAY  ################"
docker exec "$NN" hdfs dfs -cat /data/bronze/train_outpatient/part-000.csv | head -2
echo "-> the read succeeded with a DataNode down. That is HDFS fault tolerance."

echo
echo "################  BRING IT BACK  ################"
docker start datanode2 >/dev/null
sleep 20
docker exec "$NN" hdfs dfsadmin -report | grep -E "Live datanodes" | head -2
echo "Under-replicated blocks should return to 0 within a minute:"
docker exec "$NN" hdfs fsck / | grep -E "Under-replicated|Missing blocks" | head -3
