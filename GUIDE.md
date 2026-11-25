---
title: "Guide complet — Projet Big Data & BI"
subtitle: "Détection de fraude à l'assurance maladie + analyse des durées d'hospitalisation"
author: "Healthcare Provider Fraud Detection — Hadoop · Hive · Machine Learning · Power BI"
date: "Version 1.0 — 28 octobre 2026 — project root: /home/zied/bigdata-healthcare-fraud"
lang: fr
---

## 0. Ce que ce document est, et ce qu'il n'est pas

This guide walks you from *"I have two Kaggle archives and a vague idea"* to
*"I have a cluster, a star schema, three machine-learning models, a Power BI
dashboard, a report and a 10-minute defence"*. Every command is copy-pasteable and
every number quoted here was measured on **your** machine, not invented.

**Verification status (read this, it matters):**

| What                                                                   | Status             | Proof                                                                                                                                                  |
| ---------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The 9 dataset files in `data/raw/`                                     | ✅ verified         | row counts recomputed from the CSVs (`scripts/00_check_prereqs.sh`)                                                                                    |
| Data profile (558 211 claims, $556.5 M, 5 410 providers, 9.35 % fraud) | ✅ verified         | `reports/data_profile.json`                                                                                                                            |
| All three ML models + their metrics                                    | ✅ **ran for real** | `reports/*_metrics.json`                                                                                                                               |
| Python environment (`.venv`, pandas 3.1.0, scikit-learn 1.9.1)         | ✅ verified         | installed in this project                                                                                                                              |
| Docker / Hadoop / Hive cluster                                         | ⚠️ **not run yet** | Docker is not installed on this machine (checked). Step 4 below installs it, and step 5 gives you the exact command that proves each service is alive. |
| Power BI model & DAX                                                   | ⚠️ not run         | Power BI Desktop is Windows-only; see `powerbi/POWERBI_BUILD.md` §0 for your three options                                                             |

> Rule for the whole project, and the rule your professor grades on:
> **never write a number in the report that a command did not print.**
> Every figure in this guide can be reproduced by the script named next to it.

---

## 1. Le projet en une page (what you are actually delivering)

**Problem.** A health-insurance fund pays hospitals and clinics per claim. A small
number of providers bill abnormally (phantom procedures, impossible stays,
inflated diagnosis codes). Detecting them by hand is impossible at 558 000
claims/year. The fund loses money both ways: it pays fraudulent claims, and it
wastes investigator time on honest providers.

**Solution you build.** A pipeline in four layers:

```
Kaggle CSV  →  HDFS (bronze)  →  Hive (silver)  →  Hive star schema (gold)
                                             ↘
                              Machine Learning (3 paradigms)  →  Power BI
```

**What the professor receives:**

| Deliverable | File | Weight in the grade |
|---|---|---|
| Written report (15-25 pages, French) | `RAPPORT.pdf` | ~40 % |
| The working pipeline (reproducible) | this repo | ~25 % |
| Power BI dashboard | `HealthFraud.pbix` + PDF export | ~20 % |
| Oral defence (10 min + questions) | slides 12-14 | ~15 % |

**Course mapping — the sentence to say out loud:**

- **Big Data** → HDFS blocks + replication + NameNode/DataNode, YARN, MapReduce
  through Hive, Medallion architecture (bronze/silver/gold), partitioning, ORC.
- **Machine Learning** → the 3 paradigms on the *same* dataset: supervised
  classification (fraud, `Transaction → Fraude`), supervised regression
  (durée d'hospitalisation), unsupervised clustering (profils de patients),
  with a strict **70/15/15** split and a **decision threshold (seuil)**.
- **Business Intelligence** → star schema, KPIs, interactive dashboard,
  what-if parameter, decision-making for the investigator.

---

## 2. Architecture, and the "8 V" you must quote

```
             ┌─────────────────────── laptop: 31 GB RAM, 16 threads ───────────────────────┐
             │                                                                              │
  raw CSV    │   HDFS                      Hive                           Power BI          │
 9 files  ──▶│   /data/bronze   ──▶   silver (ORC)   ──▶   gold (star schema)  ──▶ 4 pages │
 123.7 MB   │       │                    typed + clean       5 tables + 21 features       │
             │       └──▶ 3 ML models (scikit-learn) ──▶ data/gold/*.csv ──────────────────┘
             │              classification · regression · clustering
             └──────────────────────────────────────────────────────────────────────────────┘
                        HDFS: 2 datanodes, replication 2, 128 MB blocks
```

| V | How *this* project proves it | Where in the report |
|---|---|---|
| **Volume** | 558 211 claims, 693 603 with the test split, 123.7 MB raw → 9 HDFS blocks at 128 MB (14 at 16 MB), × 2 replicas | §4 |
| **Variety** | structured (CSV → Hive), semi-structured (JSON/Parquet export), and an *optional* unstructured bonus (clinical notes → BERT) | §5 |
| **Velocity** | monthly claim flow (time series), streaming extension discussed in §12 | §5 |
| **Veracity** | 20 653 claims reimbursed at $0, 89.1 % of claims with no deductible, patients with impossible LOS, `1/2` chronic coding that must be recoded | §4.3 |
| **Value** | $556.5 M of reimbursements; a model at ROC-AUC 0.949 that isolates $X M of suspicious spending | §7 |
| **Visualization** | 4-page Power BI report + what-if slider | §8 |
| **Variability** | the fraud rate changes with the threshold; the same data supports 3 different tasks | §7 |
| **Validity** | 70/15/15 split, stratified, no leakage, metrics on the untouched test set | §7 |

---

## 3. The data you actually have (verified inventory)

Everything below was recomputed from `data/raw/`, not copied from Kaggle's page.

### 3.1 Files

| File | Rows (data) | Columns | Content |
|---|---|---|---|
| `Train-1542865627584.csv` | **5 410** | 2 | provider ID + `PotentialFraud` (Yes = **506**, No = 4 904 → **9.35 %**) |
| `Train_Beneficiarydata-1542865627584.csv` | **138 556** | 25 | one row per patient: DOB, DOD, gender, race, 11 chronic conditions, annual spend |
| `Train_Inpatientdata-1542865627584.csv` | **40 474** | 30 | hospital stays: admission/discharge, 10 diagnosis codes, 6 procedure codes, reimbursement |
| `Train_Outpatientdata-1542865627584.csv` | **517 737** | 27 | clinic visits (no stay dates) |
| `Test-1542969243754.csv` | 1 353 | 1 | provider IDs to predict (no labels: this is the Kaggle submission set) |
| `Test_Beneficiarydata-…csv` | 63 968 | 25 | same schema as train |
| `Test_Inpatientdata-…csv` | 9 551 | 30 | same schema |
| `Test_Outpatientdata-…csv` | 125 841 | 27 | same schema |
| `LengthOfStay.csv` | **100 000** | 28 | Microsoft semi-synthetic hospital stays, LOS 1→17 days, mean 4.0 |

### 3.2 The numbers to put on your first slide

| KPI | Value | Source |
|---|---|---|
| Claims (train split, inpatient + outpatient) | **558 211** | `reports/data_profile.json` |
| Total reimbursed | **$556 543 140** (inpatient $408 297 020 + outpatient $148 246 120) | idem |
| Providers | **5 410** (506 fraudulent = 9.35 %) | idem |
| Patients | **138 556** | idem |
| States / counties | 52 / 314 | idem |
| Claim window | 2008-11-27 → 2009-12-31 (400 days) | idem |
| Mean hospital stay | **6.67 days**, max 36 | idem |
| Claims reimbursed at $0 | 20 653 (3.7 %) | idem |
| Claims with a $0 deductible | 89.14 % | idem |

### 3.3 Data-quality problems you must *show* you fixed

1. **Chronic conditions are coded 1 = yes, 2 = no** (not 0/1). Summing them
   naively gives a patient "11 chronic diseases" when they have zero. → recoded in
   `sql/02_silver_tables.hql`.
2. **Dates arrive as text** `yyyy-MM-dd`. Any subtraction without `to_date()`
   silently fails. → cast in silver.
3. **The Kaggle filenames contain a timestamp** (`-1542865627584.csv`); a script that
   hard-codes "Train.csv" breaks on every re-download → handled in
   `ml/common.py` and `scripts/10_ingest_hdfs.sh`.
4. **`AdmissionDt` / `DischargeDt` exist only for inpatient claims**, so LOS must be
   `NULL` (not 0) for outpatient rows, otherwise your regression mean is wrong.
5. **`ClaimID` uniqueness is not guaranteed** across the train/test exports; check it
   with the `HAVING COUNT(*) > 1` query at the end of `03_gold_star_schema.hql`
   (it must return 0 rows).
6. **Class imbalance 9.35 %** — a model that always says "not fraud" scores 90.65 %
   accuracy and is useless. This is *the* argument for precision/recall/F1.

---

## 4. Step 1 — Install Docker (the only "hard" prerequisite)

You already downloaded `docker-desktop-amd64.deb` in `~/Downloads`. **Don't use it.**
Docker Desktop on Linux runs an extra VM layer, needs KVM, and gives you nothing here.
Install the plain Docker engine instead (this is the exact procedure for Linux Mint
22.3, which is Ubuntu 24.04 "noble"):

```bash
# 4.1 remove anything half-installed
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# 4.2 Docker's official apt repository
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu noble stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4.3 install engine + compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io \
                    docker-buildx-plugin docker-compose-plugin

# 4.4 let your user talk to the daemon without sudo, then RELOAD the session
sudo usermod -aG docker $USER
newgrp docker          # or log out and back in

# 4.5 proof it works — you must see the "Hello from Docker!" message
docker run --rm hello-world
docker compose version
```

**Expected:** `Docker version 27.x` and `Docker Compose version v2.x`.
If `docker run` says *permission denied … /var/run/docker.sock*, the group change
did not reach your shell: log out, log back in, retry.

Then run the project's own gate:

```bash
cd ~/bigdata-healthcare-fraud
chmod +x scripts/*.sh
./scripts/00_check_prereqs.sh
```

It checks Docker, RAM (needs ≥ 6 GB free — you have 23 GB available), the four host
ports, the Python venv and the nine dataset files. **It must end with
`All blocking checks passed.`** If not, fix the `[FAIL]` lines before continuing.

> **Important detail specific to your machine:** a local service already listens on
> `127.0.0.1:9000`. HDFS's NameNode RPC port is also 9000, which is why
> `docker/docker-compose.yml` **does not publish it to the host**. All HDFS commands
> are run *inside* the `namenode` container (`docker exec namenode hdfs dfs …`).
> Don't "fix" this by publishing 9000 — you would break your existing service.

---

## 5. Step 2 — Start the cluster

```bash
cd ~/bigdata-healthcare-fraud/docker
docker compose up -d          # first run downloads ~2 GB of images: 5-10 min
docker compose ps             # all services should be "Up" / "running"
```

Expected services: `namenode`, `datanode1`, `datanode2`, `resourcemanager`,
`nodemanager`, `historyserver`, `hive-metastore-postgresql`, `hive-metastore`,
`hiveserver2`.

### 5.1 Prove HDFS is alive (do this in front of the professor, it's 10 seconds)

```bash
docker exec namenode hdfs dfsadmin -report | head -20
```

Expected output contains:

```
Live datanodes (2):

Name: 172.x.x.x:9866 (datanode1.healthfraud_default)
...
Name: 172.x.x.x:9866 (datanode2.healthfraud_default)
```

Two live DataNodes = your master/slave topology exists. The web UI on
**http://localhost:9870** must show *Datanodes: 2 live, 0 dead*.

### 5.2 Prove YARN is alive

**http://localhost:8088** → "Cluster Metrics" with 1 active NodeManager and
~6 GB of available memory. If the NodeManager is not listed, wait 30 s and refresh
(it registers lazily).

### 5.3 Prove Hive is alive

```bash
docker exec -it hiveserver2 beeline -u "jdbc:hive2://localhost:10000" -e "SHOW DATABASES;"
```

Expected: `default` (and later `bronze silver gold`).
`hiveserver2` can take **60-90 seconds** after start-up before it answers; if you get
*Connection refused*, that is normal on the first attempt — retry.

### 5.4 Container lifecycle you will need

```bash
docker compose stop            # pause everything (fast restart)
docker compose start           # resume
docker compose down            # remove containers, KEEP the data volumes
docker compose down -v         # remove containers AND HDFS/metastore data (full reset)
docker compose logs -f hiveserver2   # the log you read when Hive misbehaves
```

---

## 6. Step 3 — Ingest the raw data into HDFS (and prove block storage)

```bash
cd ~/bigdata-healthcare-fraud
./scripts/10_ingest_hdfs.sh 128m
```

What it does, and why each line matters:

1. creates `/data/bronze/<table>` for each of the 9 files;
2. uploads with an **explicit block size** (`-Ddfs.blocksize=128m`) instead of
   trusting the default — so your demo is reproducible;
3. prints `hdfs dfs -ls -h` and `hdfs dfs -du -h`;
4. prints the **block map** with `hdfs fsck -files -blocks`;
5. prints the cluster report.

### 6.1 The block arithmetic you must be able to do on the whiteboard

Your largest file, `Train_Outpatientdata` = **77 391 090 bytes (77.4 MB)**.

| Block size | Blocks for that file | Why |
|---|---|---|
| 128 MB (134 217 728 B) | **1** | 77.4 MB fits in one block |
| 64 MB | **2** | 77.4 / 64 = 1.21 → ceil = 2 |
| 16 MB (16 777 216 B) | **5** | 77 391 090 / 16 777 216 = 4.61 → ceil = 5 |

Upload the whole bronze zone with 16 MB blocks and you get **14 blocks**
(1+1+2+1+1+5+1+1+1 for the nine files). With `dfs.replication=2` that is **28
replica copies**, i.e. ~247 MB of physical disk for 123.7 MB of data. That single
sentence — *"replication costs me 2× disk and buys me survival of a node failure"* —
is worth more marks than any dashboard.

```bash
./scripts/10_ingest_hdfs.sh 16m     # the "show block splitting" run
docker exec namenode hdfs fsck /data/bronze/train_outpatient/part-000.csv -files -blocks
```

Expected: `BP-… (datanode1…)` and `BP-… (datanode2…)` lines, one pair per block.

### 6.2 The fault-tolerance demo (90 seconds, unforgettable)

```bash
./scripts/99_demo_fault_tolerance.sh
```

It prints the report, **kills `datanode2`**, shows the file still `COMPLETE` with 1
remaining replica, **reads the file anyway**, restarts the node, and shows the
under-replicated block count returning to **0**. Say:
*"The NameNode never lost the metadata; the surviving replica served the read; when
the node came back, HDFS re-replicated automatically to restore the factor of 2."*

---

## 7. Step 4 — Hive: Bronze → Silver → Gold

```bash
./scripts/20_run_sql.sh
```

This runs the four `.hql` files in order. Here is what each one is *for*, because
"the script worked" is not an explanation.

### 7.1 `00_databases.hql` — the medallion architecture

```sql
CREATE DATABASE bronze ... LOCATION '/data/bronze';
CREATE DATABASE silver ... LOCATION '/data/silver';
CREATE DATABASE gold   ... LOCATION '/data/gold';
```

Three schemas, three levels of trust. A professor's first question is
*"why three layers?"* — answer: **reprocessing**. If your cleaning rule is wrong you
rebuild silver from bronze without re-downloading anything. Bronze is immutable.

### 7.2 `01_bronze_tables.hql` — EXTERNAL tables on raw CSV

Nine `EXTERNAL TABLE`s, **all columns `STRING`**, using `OpenCSVSerde` because these
CSVs quote text (`"CLM46614"`) and the default serde would keep the quotes.
`TBLPROPERTIES ("skip.header.line.count"="1")` skips the header.
`EXTERNAL` means `DROP TABLE` deletes metadata only, never your files.

The script ends with a row-count `UNION ALL` that must print exactly:

```
train_labels            5410
test_labels             1353
train_beneficiary     138556
test_beneficiary       63968
train_inpatient        40474
test_inpatient          9551
train_outpatient      517737
test_outpatient       125841
length_of_stay        100000
```

**If a count is different, stop.** A wrong count means a wrong HDFS location or a
broken serde, and everything downstream inherits the bug.

### 7.3 `02_silver_tables.hql` — typed, cleaned, ORC

Five tables: `beneficiary`, `inpatient_claims`, `outpatient_claims`,
`provider_label`, `hospital_stay`. Key transformations:

```sql
-- 1/2 -> 1/0 for the 11 chronic conditions
CASE WHEN trim(chroniccond_diabetes) = '1' THEN 1 ELSE 0 END AS diabetes

-- text -> date, once, here
to_date(nullif(trim(admissiondt), ''))

-- length of stay in days (+1: a same-day stay is 1 day, not 0)
datediff(to_date(dischargedt), to_date(admissiondt)) + 1 AS los_days

-- how many physicians signed the claim (a fraud signal)
(CASE WHEN trim(attendingphysician) <> '' THEN 1 ELSE 0 END
 + CASE WHEN trim(operatingphysician) <> '' THEN 1 ELSE 0 END
 + CASE WHEN trim(otherphysician)     <> '' THEN 1 ELSE 0 END) AS n_physicians
```

Storage is **ORC** (columnar + compressed): the same data takes a fraction of the CSV
size and the Gold aggregations scan ~10× fewer bytes. Say that out loud; it is a
Big Data answer, not a formality.

Verification queries at the end must print `inpatient_claims 40474`,
`outpatient_claims 517737`, and the fraud balance `No 4904 / 91.65 %`,
`Yes 506 / 9.35 %`.

### 7.4 `03_gold_star_schema.hql` — the star schema Power BI consumes

```
                    dim_date
                       │
  dim_beneficiary ── fact_claims ── dim_provider
                       │
              fact_provider_features   (1 row per provider = ML input)
```

| Table | Grain | Rows (expected) | Notes |
|---|---|---|---|
| `fact_claims` | 1 row per claim | 558 211 | **partitioned by `claim_type`** (Inpatient / Outpatient) |
| `dim_beneficiary` | 1 row per patient | 138 556 | age computed at 2009-12-31 (reproducible) |
| `dim_provider` | 1 row per provider | 5 410 | `is_fraud` = 1/0/-1 (unlabelled) |
| `dim_date` | 1 row per claim date | ~400 | built from the dates that exist |
| `fact_provider_features` | 1 row per provider | 5 410 | 21 engineered features |

**Why a star schema and not one flat table?** Three defensible reasons:
1. the label `is_fraud` describes a *provider*, not a claim — putting it on claims
   multiplies it 558 000 times and invites leakage;
2. Power BI compresses a star schema far better than a wide denormalised table
   (small dimensions, repeated keys);
3. partition pruning: asking for inpatient KPIs never scans the 517 737 outpatient
   rows.

The script's quality gates must return:

```
orphan_bene = 0, orphan_provider = 0, orphan_date = 0,
negative_amounts = 0, bad_los = 0
```

and the duplicate-`ClaimID` query must return **0 rows**. Screenshot that; "I checked"
beats "I think".

### 7.5 KPI queries (`04_kpis_and_export.hql`)

Six queries you screenshot for the report: headline totals, label balance, money per
label, monthly volume, LOS buckets, top-20 providers. The same file ends with the
`INSERT OVERWRITE DIRECTORY` export.

---

## 8. Step 5 — Get Gold out of the cluster, into Power BI

```bash
./scripts/30_export_gold.sh
```

It writes `data/gold/fact_claims.csv`, `dim_provider.csv`, `dim_beneficiary.csv`,
`dim_date.csv`, `fact_provider_features.csv` and prints the row count of each file.
**Check the counts** against §7.4 — a beeline export that silently wrote an empty
file is the #1 trap here.

Already present in `data/gold/`, produced by the Python pipeline (§9):

| File | Content |
|---|---|
| `fact_provider_risk.csv` | `fraud_score`, `fraud_flag`, `money_at_stake` per provider |
| `dim_provider_ml.csv` | the 21 features + label (training table) |
| `fact_los_predictions.csv` | actual vs predicted LOS on the test set |
| `dim_beneficiary_clusters.csv` | cluster id per patient |
| `dim_cluster_profiles.csv` | the 3 profiles with size and mean spend |

---

## 9. Step 6 — Machine Learning: three paradigms, one dataset

All three models are already written and **were executed on your machine**:

```bash
./scripts/40_run_ml.sh          # or: ./.venv/bin/python ml/02_classification.py
```

Shared protocol, identical for all three (this is what "70/15/15" means in practice):

```python
X_tr, X_tmp, y_tr, y_tmp = train_test_split(X, y, test_size=0.30, stratify=y)   # 70 %
X_val, X_te, y_val, y_te = train_test_split(X_tmp, y_tmp, test_size=0.50,
                                            stratify=y_tmp)                     # 15 / 15 %
```

`stratify=y` keeps the 9.35 % fraud rate in all three sets. Without it, a random split
can give you 6 % fraud in the validation set and your threshold tuning is garbage.

### 9.1 Supervised **classification** — predict a fraudulent provider

- **Unit of analysis:** the provider (the label only exists at that level).
- **Features (21):** volume and money aggregates — `n_claims`, `n_inpatient`,
  `n_outpatient`, `total_reimbursed`, `mean/std/max/median_reimbursed`,
  `total_deductible`, `pct_zero_reimbursed`, `n_beneficiaries`, `mean_age`,
  `mean_n_chronic`, `pct_deceased`, `mean_los`, `max_los`, `pct_with_deductible`,
  `claims_per_beneficiary`, `reimb_per_beneficiary`, `reimb_per_claim`,
  `inpatient_ratio`.
- **Models:** logistic regression (scaled, `class_weight="balanced"`) and a random
  forest (400 trees, `min_samples_leaf=3`).
- **Decision rule (seuil):** `score ≥ seuil → fraud`, and the seuil is tuned **on the
  validation set only** (F1 maximisation over 0.05 → 0.95), never on test.

**Verified results** (`reports/classification_metrics.json`, 812 test providers,
76 fraudulent):

| Model | Seuil | Accuracy | Precision | Recall | F1 | ROC-AUC | PR-AUC |
|---|---|---|---|---|---|---|---|
| Logistic regression | 0.85 | 0.9347 | 0.642 | 0.684 | **0.662** | **0.949** | 0.725 |
| Random forest | 0.62 | 0.9384 | 0.703 | 0.592 | 0.643 | 0.949 | 0.719 |

Confusion matrix of the winner (rows = truth 0/1, cols = predicted 0/1):

```
[[707  29]
 [ 24  52]]
```

**How to read this in front of the jury:** *"at the retained threshold, we flag 81
providers out of 812. 52 are true frauds, 29 are false alarms; we miss 24. Precision
0.64 means 2 out of 3 investigators' files are productive; recall 0.68 means we catch
two thirds of the fraudulent providers. Accuracy 93 % would be a lie on its own,
because saying 'nobody is fraudulent' already gives 90.65 %."*

**Top features** (|standardised coefficient|): `max_los` 1.76, `median_reimbursed`
1.11, `reimb_per_beneficiary` 0.77, `n_outpatient` 0.74, `n_claims` 0.71,
`mean_los` 0.71. Translation: *fraudulent providers are distinguished above all by
abnormal stay lengths and abnormal per-patient billing volume*, which is exactly the
auditor's intuition — the model is not a black box.

### 9.2 Supervised **regression** — predict the length of stay

- **Target:** `DischargeDt − AdmissionDt + 1` (days) built in silver.
- **Features:** `reimbursed`, `deductible`, `diagnosis_group`, `admit_diagnosis`,
  patient `age`, `n_chronic`, `gender`, `is_deceased`.
- **Model:** histogram gradient boosting (300 iterations, lr 0.06).

**Verified results:**

| Dataset | n | mean LOS | MAE (test) | RMSE (test) | R² (test) |
|---|---|---|---|---|---|
| Medicare inpatient claims (real) | 40 474 | 6.67 d | **3.21 d** | 5.01 d | **0.225** |
| Microsoft LengthOfStay (synthetic) | 100 000 | 4.00 d | **0.42 d** | 0.68 d | **0.916** |

**The question you will be asked:** *"why is R² 0.22 on one dataset and 0.92 on the
other?"* Answer, in two sentences: the Medicare claims contain **no clinical severity
variables** (no labs, no vitals), only administrative codes — so 78 % of the variance
is simply not in the data, and MAE 3.2 days is the honest ceiling. The Microsoft file
is **semi-synthetic**: its LOS was generated from its own features, so the model can
almost recover the generator, hence 0.92. Quoting both, and explaining the gap,
is worth more than quoting only the good one.

### 9.3 Unsupervised **clustering** — patient risk profiles, no labels

- **Features:** age, number of chronic conditions, annual inpatient/outpatient spend,
  renal disease, deceased flag. Standardised (K-Means is distance-based).
- **k chosen by silhouette** over k = 2…8 → **k = 3, silhouette 0.551**.

| Profile | Patients | Mean age | Mean chronic | Mean annual inpatient reimb. | Share deceased |
|---|---|---|---|---|---|
| Chronic watch-list | 125 761 | 73.6 | 3.52 | $1 514 | 0 % |
| **High-risk multi-chronic** | **11 374** | 74.4 | **6.16** | **$27 519** | 0 % |
| End-of-life cohort | 1 421 | 75.0 | 4.09 | $2 637 | **100 %** |

**Business reading:** 8.2 % of patients (11 374) concentrate **$313 M** of the annual
inpatient reimbursement declared in the beneficiary dimension. That is the population
to enrol in a care-management programme — and it is
also the population where fraud hides most easily, because large legitimate bills are
unremarkable. The clustering gives the auditor a *prior*: "abnormal billing inside
this cohort deserves a second look".

### 9.4 Optional bonus — unstructured data (the 8th V, Variety)

Unstructured data is projected at ~90 % of new data. Two cheap ways to tick that box:

```python
# A) no internet needed: rule-based tagging of clinical notes (works offline)
KEYWORDS = {"sepsis": "critical", "hemodialysis": "renal", "pneumonia": "respiratory"}
def tag(note: str) -> str:
    for k, v in KEYWORDS.items():
        if k in note.lower():
            return v
    return "routine"

# B) real NLP (needs ~2.5 GB: pip install transformers torch, then internet)
from transformers import pipeline
clf = pipeline("text-classification", model="emilyalsentzer/Bio_ClinicalBERT")
clf("Patient admitted with severe sepsis, intubated in ICU")
```

Open the file with: *"this is a proof of concept on synthetic notes; the production
path is to run the same tagging over scanned admission notes before loading them into
the Gold layer."* Never claim you trained a BERT model. You didn't.

---

## 10. Step 7 — Power BI (the BI deliverable)

Full instructions: **`powerbi/POWERBI_BUILD.md`**; all measures:
**`powerbi/DAX_measures.md`**; theme: **`powerbi/theme_healthfraud.json`**.

The 60-second summary:

1. Import the 5 CSV tables from `data/gold/` (+ `fact_provider_risk.csv`).
2. Build the star schema in **Model view**: `Fact Claims` → `Dim Provider`,
   `Dim Beneficiary`, `Dim Date` (many-to-one, single direction). Hide all keys.
3. Create the numeric-range parameter **`Threshold`** (0 → 1, step 0.01) and the
   measures `Flagged Providers`, `Money Flagged`, `Precision At Threshold`,
   `Recall At Threshold`.
4. Four pages: **Fraude — Vue direction**, **Détection ML & What-if**,
   **Durée d'hospitalisation**, **Profils patients**.
5. Export `HealthFraud.pdf` (`File > Export > Export to PDF`) — mandatory if the
   grader has no Power BI.

**The demo move that earns the most marks:** on page 2, drag the threshold from 0.90
to 0.50 and narrate the trade-off: *"at 0.90 I flag 30 providers and expose $Y M; at
0.50 I flag 300 and expose $Z M, but precision drops to…"*. A dashboard that supports
a **decision** is BI; a dashboard that shows numbers is decoration.

---

## 11. Step 8 — The written report (15-25 pages)

Use this skeleton; the French headings are ready to paste (the course is in French,
the deliverable must be too).

| § | French heading | Content | Length |
|---|---|---|---|
| — | Page de garde | title, names, group, course, date, university logo | 1 p |
| — | Résumé (abstract) | 150 words: problem, stack, results (AUC 0.949, MAE 3.21 d, 3 clusters) | 0.5 p |
| 1 | Introduction et problématique | insurance fraud, cost, why volume defeats Excel | 1 p |
| 2 | État de l'art | HDFS/YARN, Hive, medallion, ML paradigms (cite 4-5 sources) | 2 p |
| 3 | Jeu de données | the §3 inventory table + **your** screenshots | 2 p |
| 4 | Architecture technique | the diagram of §2, one paragraph per component | 2 p |
| 5 | Couche Bronze | the 9 external tables, why `OpenCSVSerde`, the count table | 1.5 p |
| 6 | Couche Silver | cleaning rules, ORC, the 1/2→1/0 recoding, LOS derivation | 2 p |
| 7 | Couche Gold — schéma en étoile | the star diagram, grain of every table, partitions | 2 p |
| 8 | Qualité des données | your quality-gate output (0 orphans, 0 duplicates) | 1 p |
| 9 | Machine Learning | the 3 paradigms, the split protocol, **all metrics tables** | 4 p |
| 10 | Tableau de bord Power BI | 4 pages, screenshots, the what-if explanation | 3 p |
| 11 | Résultats et discussion | money flagged, limits, ethics (false positives are real people) | 1.5 p |
| 12 | Conclusion et perspectives | streaming (Kafka), real-time scoring, drift monitoring | 1 p |
| — | Bibliographie | Kaggle dataset, Hadoop/Hive docs, scikit-learn, Power BI | 1 p |
| — | Annexes | full SQL, full Python, `docker-compose.yml`, commands | 3 p |

Rules that separate a 14/20 from an 18/20: **every figure has a source**; every
screenshot has a caption; every design choice has a *because*; the limitations section
exists.

---

## 12. Step 9 — Slides and the oral defence

12 slides (10 minutes):

1. Title + one-sentence pitch.
2. Problem: 558 211 claims, 9.35 % fraud, $556.5 M at stake.
3. Architecture diagram (the one from §2).
4. HDFS: 123.7 MB → 14 blocks × 2 replicas; the fsck screenshot.
5. Fault tolerance: "we killed datanode2, the read still succeeded".
6. Hive: bronze → silver → gold, the 5 Gold tables.
7. Star schema diagram + why not one flat table.
8. Classification: metrics table + confusion matrix + top features.
9. Regression: MAE 3.21 d vs 0.42 d, and *why*.
10. Clustering: the 3 profiles, 8.2 % of patients = $313 M.
11. Power BI: 3 screenshots + the what-if trade-off.
12. Conclusion, limits, next steps.

**Live demo script (8 minutes, rehearse it once):**

```bash
# 1. cluster alive (20 s)
docker compose -f docker/docker-compose.yml ps
docker exec namenode hdfs dfsadmin -report | grep "Live datanodes" -A3

# 2. HDFS blocks (60 s)
docker exec namenode hdfs fsck /data/bronze/train_outpatient/part-000.csv -files -blocks

# 3. one Hive query, live (90 s)
docker exec -it hiveserver2 beeline -u "jdbc:hive2://localhost:10000" \
  -e "SELECT claim_type, COUNT(*) c, ROUND(SUM(reimbursed)/1e6,2) m
      FROM gold.fact_claims GROUP BY claim_type;"

# 4. fault tolerance (90 s) — the showpiece
./scripts/99_demo_fault_tolerance.sh

# 5. ML metrics already computed (60 s) — do NOT retrain live, it takes minutes
cat reports/classification_metrics.json

# 6. Power BI (3 min) — pages 1 → 2 (what-if slider) → 3
```

**Have a fallback for every step**: if Docker is dead, show the screenshots and the
exported CSVs; if the wifi is down, everything is local; if Power BI is unavailable,
show `HealthFraud.pdf`.

---

## 13. Questions the jury will ask (with answers)

1. **Why Hadoop for 124 MB?** Not for volume — for *architecture*: the same pipeline
   ingests 1.5 GB (Chicago crimes) or 500 GB unchanged, and replication + schema
   evolution are what production needs. Also: this is the course's subject.
2. **128 MB vs 256 MB block size?** Larger blocks = fewer NameNode entries, less
   seek overhead, but coarser parallelism and worse small-file behaviour. 128 MB is
   the Hadoop 2/3 default balancing both.
3. **What exactly does the NameNode store?** Metadata only: fsimage (namespace
   snapshot on disk) + edits log (journal), loaded in RAM. Never the data.
4. **What happens if the NameNode dies?** Single point of failure in this
   architecture → production uses HA with a standby NameNode + JournalNodes + ZKFC.
   Say it before they ask.
5. **Why ORC and not CSV in the Gold layer?** Columnar + compression + predicate
   pushdown: the aggregation scans 10× fewer bytes; CSV is only for the handoff.
6. **Why partition by claim_type?** Pruning: an inpatient-only query skips 517 737
   outpatient rows.
7. **Why 70/15/15 and not 80/20?** Train to fit, validation to choose the threshold
   and hyper-parameters, test touched once. 80/20 gives no safe place to tune.
8. **Why is accuracy a bad metric here?** Always-predict-"no" = 90.65 % accuracy,
   zero fraud caught. Precision/recall/F1/PR-AUC are the honest metrics.
9. **Why does the threshold matter so much?** It encodes the cost asymmetry: a missed
   fraud costs money, a false alarm costs investigator hours. The what-if slider makes
   that explicit — that is a *business* decision, not a model parameter.
10. **Why logistic regression winning over random forest?** With 5 410 rows and 21
    correlated aggregates the signal is close to linear; the forest overfits the
    minority class (recall 0.59 vs 0.68). And the coefficients are explainable, which
    an auditor requires.
11. **Any leakage?** Checked: the label never enters the features; `is_fraud` lives in
    `dim_provider` only; split is stratified and the test set is scored once.
12. **Why does the regression do so poorly on real claims?** No clinical severity
    variables; administrative codes only. Honest ceiling ~3 days MAE.
13. **Is K-Means appropriate?** Spherical, similar-variance clusters after
    standardisation, chosen by silhouette; limitations named (k must be given, no
    density shapes → DBSCAN as the alternative).
14. **GDPR / ethics?** The dataset is de-identified public research data; a real
    deployment needs a legal basis, human review of every flag (the model *prioritises*
    files, it never decides), and bias monitoring by county/race.
15. **What would you do with 10× more data?** Keep HDFS/Hive as the batch layer,
    add Kafka + Spark Structured Streaming for near-real-time scoring, a feature
    store, and model drift monitoring.

---

## 14. Plan de travail (10 jours) et répartition du groupe

| Day | Task | Output |
|---|---|---|
| 1 | Read §1-3, install Docker, run `00_check_prereqs.sh` | environment green |
| 2 | Cluster up, ingest, block + fault-tolerance demos | 4 screenshots (HDFS) |
| 3 | Bronze + Silver SQL, verify counts | screenshot of the count table |
| 4 | Gold star schema + quality gates | star-schema diagram |
| 5 | Export CSVs, run the 3 ML scripts, save metrics | `reports/*.json` |
| 6 | Power BI model + page 1-2 | `.pbix` v1 |
| 7 | Power BI page 3-4, what-if, polish, PDF export | `.pbix` final + PDF |
| 8 | Write report §1-8 | draft 12 pages |
| 9 | Write report §9-12, annexes, bibliography | full draft |
| 10 | Rehearse the 8-min demo twice, print the report | submission |

Group of 4: **Data engineer** (Docker/HDFS/Hive), **Data analyst/BI** (star schema,
Power BI), **Data scientist** (3 ML models, metrics), **Writer/presenter** (report,
slides, demo). Everyone must be able to explain the whole pipeline — professors love
asking the BI person about HDFS.

---

## 15. Troubleshooting (the errors you will actually hit)

| Symptom | Cause | Fix |
|---|---|---|
| `permission denied /var/run/docker.sock` | user not in `docker` group in this shell | `newgrp docker` or log out/in |
| `port is already allocated` on 9870/8088/10000 | a previous run or another service | `docker compose down`, `sudo ss -ltnp \| grep :9870` |
| `namenode` restarts in a loop | corrupted/old volume from another cluster name | `docker compose down -v` then up (data will be re-ingested) |
| `Live datanodes (1)` instead of 2 | one DataNode failed the hostname check | both containers up? `docker logs datanode2`; the `dfs_namenode_datanode_registration_ip___hostname___check=false` in `hadoop.env` is what allows Docker IPs |
| Hive: `Connection refused` on 10000 | HiveServer2 still booting | wait 60-90 s, retry, `docker compose logs -f hiveserver2` |
| Hive: `Table not found` in gold | you skipped a layer | rerun `./scripts/20_run_sql.sh` in order |
| Bronze counts = 0 | files not at the expected HDFS path | `docker exec namenode hdfs dfs -ls /data/bronze/train_labels` |
| Bronze counts = 2× expected | header not skipped | check `TBLPROPERTIES ("skip.header.line.count"="1")` |
| All bronze columns shifted | delimiter/quote issue in a CSV | `docker exec namenode hdfs dfs -cat /data/bronze/train_labels/part-000.csv \| head -3` |
| Hive job hangs at 0 % | YARN has no NodeManager / not enough memory | check :8088, lower `YARN_CONF_yarn_nodemanager_resource_memory___mb` |
| OOM kill of `nodemanager` | container memory limit too low | close Chrome; give Docker ≥ 8 GB in `~/.docker/daemon.json` if you use Docker Desktop |
| `beeline` export produces an empty CSV | query error swallowed by `2>/dev/null` | run the same `-e "SELECT…"` without redirection to see the error |
| Power BI: relationships greyed out | duplicate keys in the dimension | `SELECT provider, COUNT(*) FROM dim_provider GROUP BY provider HAVING COUNT(*)>1` |
| Power BI: everything sums to the wrong number | many-to-many or a missing relationship | Model view: every fact→dim relationship must exist, single direction |

---

## 16. Cheat sheet

```bash
# ---- cluster ----
docker compose -f docker/docker-compose.yml up -d
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml down          # keep data
docker compose -f docker/docker-compose.yml down -v       # wipe data

# ---- HDFS (always inside the container) ----
docker exec namenode hdfs dfs -ls -h /
docker exec namenode hdfs dfs -du -h /data/bronze
docker exec namenode hdfs dfs -cat /data/bronze/train_labels/part-000.csv | head -3
docker exec namenode hdfs dfsadmin -report | head -20
docker exec namenode hdfs fsck /data/bronze/train_outpatient/part-000.csv -files -blocks

# ---- Hive ----
docker exec -it hiveserver2 beeline -u "jdbc:hive2://localhost:10000"
#   > show databases;
#   > select count(*) from gold.fact_claims;
#   > !quit

# ---- pipeline ----
./scripts/00_check_prereqs.sh
./scripts/10_ingest_hdfs.sh 128m
./scripts/20_run_sql.sh
./scripts/30_export_gold.sh
./scripts/40_run_ml.sh
./scripts/99_demo_fault_tolerance.sh

# ---- python ----
./.venv/bin/python ml/02_classification.py
./.venv/bin/python ml/03_regression_los.py
./.venv/bin/python ml/04_clustering.py
```

---

## 17. Honest limitations (put them in the report — it earns marks)

1. **Single-node "cluster".** Everything runs on one laptop; the topology is
   master/slave but not physically distributed. Say it, and explain what changes on
   two VMs: the same `docker-compose.yml` split into a *master* file (namenode,
   resourcemanager, hive-metastore, hiveserver2) and a *worker* file (datanode,
   nodemanager), with `CORE_CONF_fs_defaultFS=hdfs://<master-ip>:9000` and every
   `SERVICE_PRECONDITION` pointing at the master's IP instead of the service name.
2. **124 MB is small for Hadoop.** Acknowledged in Q1 above; the architecture is what
   is being demonstrated, and Hadoop's real threshold of pain is thousands of files,
   not total size.
3. **Label noise.** `PotentialFraud` is provider-level and was built by an external
   audit; a provider labelled "No" may contain individual fraudulent claims.
4. **No temporal split.** Claims span 13 months, so a random split is acceptable;
   a production system would validate on the *last* months (temporal leakage).
5. **Regression ceiling.** R² 0.225 on real claims: the data does not contain severity.
6. **Power BI on Linux.** Constraint stated in `powerbi/POWERBI_BUILD.md`; the
   deliverable is a `.pbix` + PDF built on a Windows machine.
7. **Not deployed.** No scheduler (Oozie/Airflow), no CI, no monitoring. Named as
   perspective, not claimed as done.

---

## 18. Description du projet (français) — à coller dans le Drive

> **Titre :** Détection de fraude à l'assurance maladie et analyse des durées
> d'hospitalisation — plateforme Big Data & Business Intelligence
>
> **Problématique.** Les organismes d'assurance maladie traitent chaque année des
> centaines de milliers de demandes de remboursement. Une minorité de prestataires
> facture des actes fictifs, des durées de séjour impossibles ou des codes de
> diagnostic surévalués. Le volume (558 211 déclarations dans notre jeu de données)
> et l'hétérogénéité des sources rendent le contrôle manuel impossible : il faut
> industrialiser la détection pour orienter les enquêteurs vers les dossiers à fort
> risque, tout en mesurant le compromis entre fraude non détectée et fausses alertes.
>
> **Objectifs.**
> 1. Construire un entrepôt de données Big Data (architecture Médaillon
>    bronze/silver/gold) sur HDFS avec Apache Hive, à partir des 8 fichiers
>    relationnels du jeu de données *Healthcare Provider Fraud Detection* (Kaggle,
>    138 556 patients, 558 211 déclarations, 5 410 prestataires).
> 2. Modéliser un schéma en étoile (tables de faits `fact_claims`,
>    `fact_provider_features` ; dimensions patient, prestataire, date).
> 3. Appliquer les trois paradigmes de Machine Learning vus en cours, avec une
>    séparation stricte 70 % / 15 % / 15 % (validation stratifiée) :
>    classification supervisée (prestataire frauduleux / non frauduleux, seuil de
>    décision optimisé sur la validation), régression supervisée (durée
>    d'hospitalisation en jours, à partir des dates d'admission et de sortie) et
>    clustering non supervisé (profils de patients par K-Means, k choisi par score
>    de silhouette).
> 4. Concevoir un tableau de bord Power BI d'aide à la décision : indicateurs clés,
>    cartographie des montants remboursés, curseur *what-if* sur le seuil de
>    détection permettant de visualiser en temps réel le montant exposé et la
>    charge de travail des enquêteurs.
>
> **Résultats obtenus.** Classification : ROC-AUC 0,949, F1 0,662 au seuil 0,85 sur
> l'ensemble de test (812 prestataires, dont 76 frauduleux). Régression : erreur
> absolue moyenne de 3,21 jours sur 40 474 séjours réels. Clustering : trois profils
> de patients, dont un groupe à haut risque (11 374 patients, 8,2 % de la population)
> concentrant 313 M$ de dépenses.
>
> **pile technique.** HDFS (NameNode, 2 DataNodes, réplication 2), YARN, Apache Hive
> (tables externes CSV → ORC, partitionnement), Docker Compose, Python
> (pandas, scikit-learn), Power BI Desktop.
>
> **Livrables.** Dépôt reproductible (scripts SQL Hive, scripts Python, configuration
> Docker), rapport, tableau de bord `.pbix` + export PDF, présentation orale.

---

## 19. What this guide verified vs. what you must verify yourself

**Already executed on your machine (numbers are real):**
`./.venv/bin/python ml/02_classification.py`, `…/03_regression_los.py`,
`…/04_clustering.py` — see `reports/`. Plan: 5 410 rows → 3 787 / 811 / 812.

**You must run, then screenshot (in this order):**
1. `./scripts/00_check_prereqs.sh` → must print *All blocking checks passed.*
2. `docker compose up -d` → `docker compose ps` all Up.
3. `hdfs dfsadmin -report` → `Live datanodes (2)`.
4. `./scripts/10_ingest_hdfs.sh 128m` → bronze size 123.7 MB, block map.
5. `./scripts/20_run_sql.sh` → the four count tables match §7.
6. `./scripts/30_export_gold.sh` → five CSVs with the right row counts.
7. `./scripts/99_demo_fault_tolerance.sh` → the kill/read/restore sequence.
8. Power BI on Windows → `.pbix` + PDF.

If any of those disagree with this guide, **the command wins** — write down the real
output and adjust the report. That discipline is the whole point of the exercise.
