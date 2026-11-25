# Healthcare Provider Fraud & Hospital Stay BI
### Projet Big Data / Machine Learning / Business Intelligence — Hadoop · Hive · scikit-learn · Power BI

A reproducible pipeline that turns the Kaggle **Healthcare Provider Fraud Detection**
dataset into (1) a Hive star schema on HDFS, (2) three machine-learning models and
(3) an interactive Power BI dashboard for insurance investigators.

**Start here → [`GUIDE.md`](GUIDE.md)** (full step-by-step, in English, with a ready
French project description in §18). PDF: `GUIDE.pdf`. Word: `GUIDE.docx`.

---

## What is inside

```
bigdata-healthcare-fraud/
├── GUIDE.md                  the step-by-step guide (main deliverable)
├── GUIDE.pdf / GUIDE.docx    same content, printable / editable
├── data/raw/                 9 Kaggle CSVs (unzipped, untouched)
├── data/gold/                ML outputs (risk scores, LOS predictions, clusters)
├── docker/
│   ├── docker-compose.yml    namenode + 2 datanodes + YARN + Hive (Postgres metastore)
│   ├── hadoop.env            block 128 MB, replication 2, YARN memory
│   └── hive.env              HiveServer2, warehouse on HDFS, MapReduce engine
├── sql/
│   ├── 00_databases.hql      bronze / silver / gold
│   ├── 01_bronze_tables.hql  9 external tables over raw CSV
│   ├── 02_silver_tables.hql  typing, cleaning, LOS derivation, ORC
│   ├── 03_gold_star_schema.hql  fact/dim + ML feature table + quality gates
│   └── 04_kpis_and_export.hql   6 KPI queries + CSV export
├── ml/
│   ├── common.py             loading + silver cleaning (mirrors the Hive logic)
│   ├── 02_classification.py  fraud / not fraud  (70/15/15, threshold tuned on val)
│   ├── 03_regression_los.py  length of stay, Medicare + Microsoft datasets
│   └── 04_clustering.py      K-Means patient profiles, k by silhouette
├── powerbi/
│   ├── POWERBI_BUILD.md      model, 4 pages, what-if, publishing
│   ├── DAX_measures.md       every measure, copy-paste ready
│   └── theme_healthfraud.json
├── scripts/                  check · ingest · sql · export · ml · fault-tolerance demo
├── reports/                  verified metrics (json) + data profile
└── Makefile                  make check | up | ingest | sql | export | ml | fault
```

## Verified results (measured, not estimated)

| Task | Metric | Value |
|---|---|---|
| Fraud classification (812 test providers) | ROC-AUC / F1 @ seuil 0.85 | **0.949 / 0.662** |
| Length of stay, real Medicare claims (40 474) | MAE / R² | **3.21 days / 0.225** |
| Length of stay, Microsoft benchmark (100 000) | MAE / R² | **0.42 days / 0.916** |
| Patient clustering (138 556 patients) | k / silhouette | **3 / 0.551** |

Data profile: 558 211 claims · $556 543 140 reimbursed · 5 410 providers
(506 fraudulent = 9.35 %) · 138 556 patients.

## Quick start

```bash
cd ~/bigdata-healthcare-fraud
make check          # docker / RAM / ports / datasets
make up             # cluster (first run pulls ~2 GB of images)
make ingest         # raw CSV -> HDFS /data/bronze
make sql            # bronze -> silver -> gold
make export         # gold -> data/gold/*.csv
make ml             # the three models
make fault          # live replication demo: kill a datanode, keep reading
```

Requirements: Docker engine + compose plugin, 8 GB of free RAM, and a Windows
machine (or VM) for Power BI Desktop. Python is already set up in `.venv`.
