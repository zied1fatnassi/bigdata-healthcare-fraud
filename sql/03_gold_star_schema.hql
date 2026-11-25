-- ===========================================================================
-- 03_gold_star_schema.hql
-- Silver -> Gold. The layer Power BI connects to.
--
--                    dim_date
--                       |
--  dim_beneficiary -- fact_claims -- dim_provider
--                       |
--            fact_provider_features  (ML input, 1 row per provider)
--
-- Star schema rules respected here:
--   * facts hold keys + measures only
--   * dimensions hold descriptive attributes only
--   * the fraud label lives on the provider dimension (it describes the provider)
-- ===========================================================================

USE gold;
SET hive.exec.dynamic.partition=true;
SET hive.exec.dynamic.partition.mode=nonstrict;

-- ---------------------------------------------------------------------------
-- 1. FACT_CLAIMS  (partitioned by claim_type = Inpatient / Outpatient)
--    Partitioning is what lets Power BI ask for one claim type without
--    scanning the other: Hive prunes whole directories.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS fact_claims;
CREATE TABLE fact_claims (
  claim_id          STRING,
  bene_id           STRING,
  provider          STRING,
  claim_date_key    INT,
  claim_start       DATE,
  reimbursed        DOUBLE,
  deductible_paid   DOUBLE,
  los_days          INT,
  n_physicians      INT,
  admit_diagnosis   STRING,
  diagnosis_group   STRING,
  has_deductible    INT
)
PARTITIONED BY (claim_type STRING)
STORED AS ORC;

INSERT OVERWRITE TABLE fact_claims PARTITION (claim_type)
SELECT
  claimid,
  beneid,
  provider,
  CAST(date_format(claim_start, 'yyyyMMdd') AS INT) AS claim_date_key,
  claim_start,
  reimbursed,
  deductible_paid,
  CASE WHEN los_days BETWEEN 1 AND 365 THEN los_days ELSE NULL END,
  n_physicians,
  admit_diagnosis_code,
  diagnosis_group_code,
  CASE WHEN COALESCE(deductible_paid, 0) > 0 THEN 1 ELSE 0 END,
  'Inpatient' AS claim_type
FROM silver.inpatient_claims
UNION ALL
SELECT
  claimid,
  beneid,
  provider,
  CAST(date_format(claim_start, 'yyyyMMdd') AS INT),
  claim_start,
  reimbursed,
  deductible_paid,
  NULL,
  NULL,
  admit_diagnosis_code,
  NULL,
  CASE WHEN COALESCE(deductible_paid, 0) > 0 THEN 1 ELSE 0 END,
  'Outpatient' AS claim_type
FROM silver.outpatient_claims;

-- ---------------------------------------------------------------------------
-- 2. DIM_BENEFICIARY
--    Age is computed at a fixed reference date (end of the claims window),
--    never at "today", so the whole project is reproducible.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS dim_beneficiary;
CREATE TABLE dim_beneficiary
STORED AS ORC
AS
SELECT
  beneid                                   AS bene_id,
  dob,
  death_date,
  CAST(ROUND(months_between(to_date('2009-12-31'), dob) / 12.0, 0) AS INT) AS age,
  gender_male,
  race,
  state,
  county,
  months_part_a,
  months_part_b,
  renal_disease,
  alzheimer, heart_failure, kidney_disease, cancer, copd, depression,
  diabetes, ischemic_heart, osteoporosis, rheumatoid_arthritis, stroke,
  (alzheimer + heart_failure + kidney_disease + cancer + copd + depression
   + diabetes + ischemic_heart + osteoporosis + rheumatoid_arthritis + stroke) AS n_chronic,
  CASE WHEN death_date IS NOT NULL THEN 1 ELSE 0 END AS is_deceased,
  COALESCE(ip_annual_reimbursed, 0) + COALESCE(op_annual_reimbursed, 0) AS annual_reimbursed
FROM silver.beneficiary;

-- ---------------------------------------------------------------------------
-- 3. DIM_PROVIDER  (attributes only; measures live in the fact table)
--    State/County = where the provider's claims are concentrated.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS dim_provider;
CREATE TABLE dim_provider
STORED AS ORC
AS
WITH claims_by_state AS (
  SELECT f.provider, b.state, b.county, COUNT(*) AS n,
         ROW_NUMBER() OVER (PARTITION BY f.provider ORDER BY COUNT(*) DESC) AS rn
  FROM fact_claims f
  JOIN dim_beneficiary b ON f.bene_id = b.bene_id
  WHERE b.state IS NOT NULL
  GROUP BY f.provider, b.state, b.county
),
activity AS (
  SELECT provider,
         MIN(claim_start) AS first_claim_date,
         MAX(claim_start) AS last_claim_date,
         COUNT(*)         AS lifetime_claims
  FROM fact_claims
  GROUP BY provider
)
SELECT a.provider,
       s.state,
       s.county,
       a.first_claim_date,
       a.last_claim_date,
       a.lifetime_claims,
       COALESCE(l.is_fraud, -1) AS is_fraud   -- -1 = unlabelled (test providers)
FROM activity a
LEFT JOIN claims_by_state s ON a.provider = s.provider AND s.rn = 1
LEFT JOIN silver.provider_label l ON a.provider = l.provider;

-- ---------------------------------------------------------------------------
-- 4. DIM_DATE  (built from the dates that actually appear in the claims,
--    which is enough for a 2-year claims window and keeps the SQL portable.
--    Power BI also builds a full calendar with DAX - see powerbi/DAX_measures.md)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS dim_date;
CREATE TABLE dim_date
STORED AS ORC
AS
SELECT
  CAST(date_format(d, 'yyyyMMdd') AS INT)      AS date_key,
  d                                            AS full_date,
  year(d)                                      AS year,
  quarter(d)                                   AS quarter,
  month(d)                                     AS month,
  date_format(d, 'MMMM')                       AS month_name,
  weekofyear(d)                                AS week_of_year,
  date_format(d, 'EEEE')                       AS day_name,
  CASE WHEN date_format(d, 'EEEE') IN ('Saturday','Sunday') THEN 1 ELSE 0 END AS is_weekend
FROM (SELECT DISTINCT claim_start AS d FROM fact_claims WHERE claim_start IS NOT NULL) t;

-- ---------------------------------------------------------------------------
-- 5. FACT_PROVIDER_FEATURES
--    1 row per provider, every column an aggregate an auditor can explain.
--    This is the table the three ML models are trained on.
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS fact_provider_features;
CREATE TABLE fact_provider_features
STORED AS ORC
AS
WITH base AS (
  SELECT f.provider,
         f.claim_id,
         f.bene_id,
         f.reimbursed,
         f.deductible_paid,
         f.los_days,
         f.claim_type,
         f.has_deductible,
         b.age,
         b.n_chronic,
         b.is_deceased
  FROM fact_claims f
  LEFT JOIN dim_beneficiary b ON f.bene_id = b.bene_id
)
SELECT
  provider,
  COUNT(*)                                                                   AS n_claims,
  SUM(CASE WHEN claim_type = 'Inpatient'  THEN 1 ELSE 0 END)                  AS n_inpatient,
  SUM(CASE WHEN claim_type = 'Outpatient' THEN 1 ELSE 0 END)                  AS n_outpatient,
  ROUND(SUM(reimbursed), 2)                                                   AS total_reimbursed,
  ROUND(AVG(reimbursed), 2)                                                   AS mean_reimbursed,
  ROUND(STDDEV_POP(reimbursed), 2)                                            AS std_reimbursed,
  MAX(reimbursed)                                                             AS max_reimbursed,
  ROUND(SUM(deductible_paid), 2)                                              AS total_deductible,
  ROUND(AVG(CASE WHEN COALESCE(reimbursed,0) = 0 THEN 1.0 ELSE 0.0 END), 4)   AS pct_zero_reimbursed,
  COUNT(DISTINCT bene_id)                                                     AS n_beneficiaries,
  ROUND(AVG(age), 1)                                                          AS mean_age,
  ROUND(AVG(n_chronic), 2)                                                    AS mean_n_chronic,
  ROUND(AVG(is_deceased), 4)                                                  AS pct_deceased,
  ROUND(AVG(los_days), 2)                                                     AS mean_los,
  MAX(los_days)                                                               AS max_los,
  ROUND(AVG(has_deductible), 4)                                               AS pct_with_deductible,
  ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT bene_id), 3)                          AS claims_per_beneficiary,
  ROUND(SUM(reimbursed) / COUNT(DISTINCT bene_id), 2)                         AS reimb_per_beneficiary,
  ROUND(SUM(reimbursed) / COUNT(*), 2)                                        AS reimb_per_claim,
  ROUND(SUM(CASE WHEN claim_type = 'Inpatient' THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS inpatient_ratio
FROM base
GROUP BY provider;

-- ---------------------------------------------------------------------------
-- 6. Quality gates — a project is graded on this, not on the dashboard
-- ---------------------------------------------------------------------------
SELECT 'fact_claims' AS t, COUNT(*) AS n FROM fact_claims
UNION ALL SELECT 'dim_beneficiary', COUNT(*) FROM dim_beneficiary
UNION ALL SELECT 'dim_provider', COUNT(*) FROM dim_provider
UNION ALL SELECT 'dim_date', COUNT(*) FROM dim_date
UNION ALL SELECT 'fact_provider_features', COUNT(*) FROM fact_provider_features;

-- Every claim must have a beneficiary, a provider and a date.
SELECT SUM(CASE WHEN bene_id   IS NULL THEN 1 ELSE 0 END) AS orphan_bene,
       SUM(CASE WHEN provider   IS NULL THEN 1 ELSE 0 END) AS orphan_provider,
       SUM(CASE WHEN claim_date_key IS NULL THEN 1 ELSE 0 END) AS orphan_date,
       SUM(CASE WHEN reimbursed < 0 THEN 1 ELSE 0 END)      AS negative_amounts,
       SUM(CASE WHEN claim_type = 'Inpatient' AND (los_days < 1 OR los_days > 365) THEN 1 ELSE 0 END) AS bad_los
FROM fact_claims;

-- Duplicate ClaimID check (must return 0 rows)
SELECT claim_id, COUNT(*) AS occurrences
FROM fact_claims
GROUP BY claim_id
HAVING COUNT(*) > 1
LIMIT 10;
