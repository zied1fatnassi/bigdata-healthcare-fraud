-- ===========================================================================
-- 04_kpis_and_export.hql
-- 1) The KPI queries you will screenshot for the report / defend at the oral
-- 2) The export of every Gold table to CSV for Power BI
--
-- Run:  docker exec -it hiveserver2 beeline -u "jdbc:hive2://localhost:10000" \
--         --outputformat=csv2 --silent=true -f /sql/04_kpis_and_export.hql
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- KPI 1 : the headline numbers of the project
-- ---------------------------------------------------------------------------
SELECT
  COUNT(*)                                                  AS total_claims,
  SUM(CASE WHEN claim_type='Inpatient' THEN 1 ELSE 0 END)    AS inpatient_claims,
  SUM(CASE WHEN claim_type='Outpatient' THEN 1 ELSE 0 END)   AS outpatient_claims,
  ROUND(SUM(reimbursed)/1000000.0, 2)                        AS total_reimbursed_millions,
  ROUND(AVG(reimbursed), 2)                                  AS avg_reimbursement,
  ROUND(AVG(CASE WHEN claim_type='Inpatient' THEN los_days END), 2) AS avg_stay_days,
  COUNT(DISTINCT provider)                                   AS providers,
  COUNT(DISTINCT bene_id)                                    AS patients
FROM gold.fact_claims;

-- ---------------------------------------------------------------------------
-- KPI 2 : fraud label balance (class imbalance is THE modelling constraint)
-- ---------------------------------------------------------------------------
SELECT
  is_fraud,
  COUNT(*)                                             AS providers,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)   AS pct_of_providers
FROM gold.dim_provider
WHERE is_fraud >= 0
GROUP BY is_fraud;

-- ---------------------------------------------------------------------------
-- KPI 3 : money at stake per label -> the number the professor remembers
-- ---------------------------------------------------------------------------
SELECT
  p.is_fraud,
  COUNT(DISTINCT p.provider)                             AS providers,
  ROUND(SUM(f.total_reimbursed)/1000000.0, 2)            AS reimbursed_millions,
  ROUND(AVG(f.total_reimbursed), 0)                      AS avg_per_provider
FROM gold.dim_provider p
JOIN gold.fact_provider_features f ON p.provider = f.provider
GROUP BY p.is_fraud;

-- ---------------------------------------------------------------------------
-- KPI 4 : monthly volume + cost (time series for the dashboard)
-- ---------------------------------------------------------------------------
SELECT
  d.year,
  d.month,
  COUNT(*)                                    AS claims,
  ROUND(SUM(f.reimbursed)/1000000.0, 3)       AS reimbursed_millions,
  ROUND(AVG(f.los_days), 2)                   AS avg_los_days
FROM gold.fact_claims f
JOIN gold.dim_date d ON f.claim_date_key = d.date_key
GROUP BY d.year, d.month
ORDER BY d.year, d.month;

-- ---------------------------------------------------------------------------
-- KPI 5 : length-of-stay distribution (feeds the histogram + the regression)
-- ---------------------------------------------------------------------------
SELECT
  CASE WHEN los_days <= 2  THEN '01-02 days'
       WHEN los_days <= 5  THEN '03-05 days'
       WHEN los_days <= 10 THEN '06-10 days'
       WHEN los_days <= 20 THEN '11-20 days'
       ELSE '21+ days' END AS los_bucket,
  COUNT(*) AS claims,
  ROUND(AVG(reimbursed), 0) AS avg_reimbursed
FROM gold.fact_claims
WHERE claim_type = 'Inpatient' AND los_days IS NOT NULL
GROUP BY
  CASE WHEN los_days <= 2  THEN '01-02 days'
       WHEN los_days <= 5  THEN '03-05 days'
       WHEN los_days <= 10 THEN '06-10 days'
       WHEN los_days <= 20 THEN '11-20 days'
       ELSE '21+ days' END
ORDER BY los_bucket;

-- ---------------------------------------------------------------------------
-- KPI 6 : the 20 most expensive providers (the fraud shortlist)
-- ---------------------------------------------------------------------------
SELECT p.provider, p.state, p.county,
       p.is_fraud,
       f.n_claims, f.n_beneficiaries,
       ROUND(f.total_reimbursed, 0) AS total_reimbursed,
       ROUND(f.reimb_per_beneficiary, 0) AS reimb_per_patient,
       ROUND(f.inpatient_ratio, 3) AS inpatient_ratio,
       f.mean_los
FROM gold.dim_provider p
JOIN gold.fact_provider_features f ON p.provider = f.provider
ORDER BY f.total_reimbursed DESC
LIMIT 20;

-- ---------------------------------------------------------------------------
-- EXPORT : every Gold table as CSV inside HDFS (/data/gold/export/...).
-- One directory per table, one CSV file per reducer.
-- ---------------------------------------------------------------------------
INSERT OVERWRITE DIRECTORY '/data/gold/export/fact_claims'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT claim_id, bene_id, provider, claim_date_key, claim_start, reimbursed,
       deductible_paid, los_days, n_physicians, admit_diagnosis, diagnosis_group,
       has_deductible, claim_type
FROM gold.fact_claims;

INSERT OVERWRITE DIRECTORY '/data/gold/export/dim_provider'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT * FROM gold.dim_provider;

INSERT OVERWRITE DIRECTORY '/data/gold/export/dim_beneficiary'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT * FROM gold.dim_beneficiary;

INSERT OVERWRITE DIRECTORY '/data/gold/export/dim_date'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT * FROM gold.dim_date;

INSERT OVERWRITE DIRECTORY '/data/gold/export/fact_provider_features'
ROW FORMAT DELIMITED FIELDS TERMINATED BY ','
SELECT * FROM gold.fact_provider_features;
