-- ===========================================================================
-- 02_silver_tables.hql
-- Bronze -> Silver. This is the "trusted" layer:
--   * every column gets a real type (dates as DATE, money as DOUBLE, flags as INT)
--   * chronic conditions are recoded 1/2 -> 1/0
--   * length of stay is derived from the inpatient dates
--   * the 4 tables are keyed correctly (BeneID, ClaimID, Provider)
-- Storage: ORC (columnar, compressed) -> 5-10x smaller than the raw CSV and
-- much faster for the Gold aggregations.
-- ===========================================================================

USE silver;
SET hive.exec.dynamic.partition=true;
SET hive.exec.dynamic.partition.mode=nonstrict;
SET hive.exec.compress.output=true;
SET mapreduce.map.output.compress=true;

-- ---------------------------------------------------------------------------
-- 1. Beneficiary dimension
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS beneficiary;
CREATE TABLE beneficiary
STORED AS ORC
AS
SELECT
  beneid,
  to_date(nullif(trim(dob), ''))                                  AS dob,
  to_date(nullif(trim(dod), ''))                                  AS death_date,
  CASE WHEN trim(gender) = '1' THEN 1 ELSE 0 END                  AS gender_male,
  CAST(nullif(trim(race), '') AS INT)                             AS race,
  CASE WHEN trim(renaldiseaseindicator) = 'Y' THEN 1 ELSE 0 END    AS renal_disease,
  CAST(nullif(trim(state), '') AS INT)                            AS state,
  CAST(nullif(trim(county), '') AS INT)                           AS county,
  CAST(nullif(trim(noofmonths_partacov), '') AS INT)              AS months_part_a,
  CAST(nullif(trim(noofmonths_partbcov), '') AS INT)              AS months_part_b,
  -- Source coding: 1 = patient HAS the condition, 2 = does not. -> 1/0
  CASE WHEN trim(chroniccond_alzheimer)          = '1' THEN 1 ELSE 0 END AS alzheimer,
  CASE WHEN trim(chroniccond_heartfailure)       = '1' THEN 1 ELSE 0 END AS heart_failure,
  CASE WHEN trim(chroniccond_kidneydisease)      = '1' THEN 1 ELSE 0 END AS kidney_disease,
  CASE WHEN trim(chroniccond_cancer)             = '1' THEN 1 ELSE 0 END AS cancer,
  CASE WHEN trim(chroniccond_obstrpulmonary)     = '1' THEN 1 ELSE 0 END AS copd,
  CASE WHEN trim(chroniccond_depression)         = '1' THEN 1 ELSE 0 END AS depression,
  CASE WHEN trim(chroniccond_diabetes)           = '1' THEN 1 ELSE 0 END AS diabetes,
  CASE WHEN trim(chroniccond_ischemicheart)      = '1' THEN 1 ELSE 0 END AS ischemic_heart,
  CASE WHEN trim(chroniccond_osteoporasis)       = '1' THEN 1 ELSE 0 END AS osteoporosis,
  CASE WHEN trim(chroniccond_rheumatoidarthritis)= '1' THEN 1 ELSE 0 END AS rheumatoid_arthritis,
  CASE WHEN trim(chroniccond_stroke)             = '1' THEN 1 ELSE 0 END AS stroke,
  CAST(nullif(trim(ipannualreimbursementamt), '') AS DOUBLE)      AS ip_annual_reimbursed,
  CAST(nullif(trim(ipannualdeductibleamt), '') AS DOUBLE)         AS ip_annual_deductible,
  CAST(nullif(trim(opannualreimbursementamt), '') AS DOUBLE)      AS op_annual_reimbursed,
  CAST(nullif(trim(opannualdeductibleamt), '') AS DOUBLE)         AS op_annual_deductible
FROM bronze.train_beneficiary
UNION ALL
SELECT
  beneid,
  to_date(nullif(trim(dob), '')), to_date(nullif(trim(dod), '')),
  CASE WHEN trim(gender) = '1' THEN 1 ELSE 0 END,
  CAST(nullif(trim(race), '') AS INT),
  CASE WHEN trim(renaldiseaseindicator) = 'Y' THEN 1 ELSE 0 END,
  CAST(nullif(trim(state), '') AS INT),
  CAST(nullif(trim(county), '') AS INT),
  CAST(nullif(trim(noofmonths_partacov), '') AS INT),
  CAST(nullif(trim(noofmonths_partbcov), '') AS INT),
  CASE WHEN trim(chroniccond_alzheimer)          = '1' THEN 1 ELSE 0 END,
  CASE WHEN trim(chroniccond_heartfailure)       = '1' THEN 1 ELSE 0 END,
  CASE WHEN trim(chroniccond_kidneydisease)      = '1' THEN 1 ELSE 0 END,
  CASE WHEN trim(chroniccond_cancer)             = '1' THEN 1 ELSE 0 END,
  CASE WHEN trim(chroniccond_obstrpulmonary)     = '1' THEN 1 ELSE 0 END,
  CASE WHEN trim(chroniccond_depression)         = '1' THEN 1 ELSE 0 END,
  CASE WHEN trim(chroniccond_diabetes)           = '1' THEN 1 ELSE 0 END,
  CASE WHEN trim(chroniccond_ischemicheart)      = '1' THEN 1 ELSE 0 END,
  CASE WHEN trim(chroniccond_osteoporasis)       = '1' THEN 1 ELSE 0 END,
  CASE WHEN trim(chroniccond_rheumatoidarthritis)= '1' THEN 1 ELSE 0 END,
  CASE WHEN trim(chroniccond_stroke)             = '1' THEN 1 ELSE 0 END,
  CAST(nullif(trim(ipannualreimbursementamt), '') AS DOUBLE),
  CAST(nullif(trim(ipannualdeductibleamt), '') AS DOUBLE),
  CAST(nullif(trim(opannualreimbursementamt), '') AS DOUBLE),
  CAST(nullif(trim(opannualdeductibleamt), '') AS DOUBLE)
FROM bronze.test_beneficiary;

-- ---------------------------------------------------------------------------
-- 2. Inpatient claims + derived length of stay
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS inpatient_claims;
CREATE TABLE inpatient_claims
STORED AS ORC
AS
SELECT
  claimid,
  beneid,
  provider,
  to_date(nullif(trim(claimstartdt), ''))  AS claim_start,
  to_date(nullif(trim(claimenddt), ''))    AS claim_end,
  to_date(nullif(trim(admissiondt), ''))   AS admission_date,
  to_date(nullif(trim(dischargedt), ''))   AS discharge_date,
  CAST(nullif(trim(inscclaimamtreimbursed), '') AS DOUBLE) AS reimbursed,
  CAST(nullif(trim(deductibleamtpaid), '') AS DOUBLE)      AS deductible_paid,
  trim(clmadmitdiagnosiscode)              AS admit_diagnosis_code,
  trim(diagnosisgroupcode)                 AS diagnosis_group_code,
  -- +1: same-day admission/discharge = 1 day, never 0
  datediff(to_date(nullif(trim(dischargedt), '')), to_date(nullif(trim(admissiondt), ''))) + 1 AS los_days,
  (CASE WHEN trim(attendingphysician)  <> '' THEN 1 ELSE 0 END
 + CASE WHEN trim(operatingphysician)  <> '' THEN 1 ELSE 0 END
 + CASE WHEN trim(otherphysician)      <> '' THEN 1 ELSE 0 END) AS n_physicians,
  trim(clmdiagnosiscode_1) AS diag_1,
  trim(clmdiagnosiscode_2) AS diag_2,
  trim(clmdiagnosiscode_3) AS diag_3,
  trim(clmdiagnosiscode_4) AS diag_4,
  trim(clmdiagnosiscode_5) AS diag_5
FROM bronze.train_inpatient
UNION ALL
SELECT
  claimid, beneid, provider,
  to_date(nullif(trim(claimstartdt), '')), to_date(nullif(trim(claimenddt), '')),
  to_date(nullif(trim(admissiondt), '')),  to_date(nullif(trim(dischargedt), '')),
  CAST(nullif(trim(inscclaimamtreimbursed), '') AS DOUBLE),
  CAST(nullif(trim(deductibleamtpaid), '') AS DOUBLE),
  trim(clmadmitdiagnosiscode), trim(diagnosisgroupcode),
  datediff(to_date(nullif(trim(dischargedt), '')), to_date(nullif(trim(admissiondt), ''))) + 1,
  (CASE WHEN trim(attendingphysician)  <> '' THEN 1 ELSE 0 END
 + CASE WHEN trim(operatingphysician)  <> '' THEN 1 ELSE 0 END
 + CASE WHEN trim(otherphysician)      <> '' THEN 1 ELSE 0 END),
  trim(clmdiagnosiscode_1), trim(clmdiagnosiscode_2), trim(clmdiagnosiscode_3),
  trim(clmdiagnosiscode_4), trim(clmdiagnosiscode_5)
FROM bronze.test_inpatient;

-- ---------------------------------------------------------------------------
-- 3. Outpatient claims
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS outpatient_claims;
CREATE TABLE outpatient_claims
STORED AS ORC
AS
SELECT
  claimid, beneid, provider,
  to_date(nullif(trim(claimstartdt), '')) AS claim_start,
  to_date(nullif(trim(claimenddt), ''))   AS claim_end,
  CAST(nullif(trim(inscclaimamtreimbursed), '') AS DOUBLE) AS reimbursed,
  CAST(nullif(trim(deductibleamtpaid), '') AS DOUBLE)      AS deductible_paid,
  trim(clmadmitdiagnosiscode) AS admit_diagnosis_code,
  trim(clmdiagnosiscode_1) AS diag_1,
  trim(clmdiagnosiscode_2) AS diag_2,
  trim(clmdiagnosiscode_3) AS diag_3
FROM bronze.train_outpatient
UNION ALL
SELECT
  claimid, beneid, provider,
  to_date(nullif(trim(claimstartdt), '')), to_date(nullif(trim(claimenddt), '')),
  CAST(nullif(trim(inscclaimamtreimbursed), '') AS DOUBLE),
  CAST(nullif(trim(deductibleamtpaid), '') AS DOUBLE),
  trim(clmadmitdiagnosiscode),
  trim(clmdiagnosiscode_1), trim(clmdiagnosiscode_2), trim(clmdiagnosiscode_3)
FROM bronze.test_outpatient;

-- ---------------------------------------------------------------------------
-- 4. Provider labels (the supervised target)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS provider_label;
CREATE TABLE provider_label
STORED AS ORC
AS
SELECT trim(provider) AS provider,
       trim(potentialfraud) AS potential_fraud,
       CASE WHEN trim(potentialfraud) = 'Yes' THEN 1 ELSE 0 END AS is_fraud
FROM bronze.train_labels;

-- ---------------------------------------------------------------------------
-- 5. Length of stay benchmark dataset (Microsoft)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS hospital_stay;
CREATE TABLE hospital_stay
STORED AS ORC
AS
SELECT
  eid,
  to_date(from_unixtime(unix_timestamp(vdate, 'M/d/yyyy')))            AS visit_date,
  CAST(nullif(trim(rcount), '') AS INT)                                AS readmission_count,
  trim(gender)                                                        AS gender,
  CAST(nullif(trim(hematocrit), '')   AS DOUBLE)                       AS hematocrit,
  CAST(nullif(trim(neutrophils), '')  AS DOUBLE)                       AS neutrophils,
  CAST(nullif(trim(sodium), '')       AS DOUBLE)                       AS sodium,
  CAST(nullif(trim(glucose), '')      AS DOUBLE)                       AS glucose,
  CAST(nullif(trim(bloodureanitro), '') AS DOUBLE)                     AS blood_urea_nitrogen,
  CAST(nullif(trim(creatinine), '')   AS DOUBLE)                       AS creatinine,
  CAST(nullif(trim(bmi), '')          AS DOUBLE)                       AS bmi,
  CAST(nullif(trim(pulse), '')        AS INT)                          AS pulse,
  CAST(nullif(trim(respiration), '')  AS DOUBLE)                       AS respiration,
  CAST(nullif(trim(secondarydiagnosisnonicd9), '') AS INT)             AS secondary_diagnosis_nonicd9,
  CASE WHEN trim(dialysisrenalendstage) = '1' THEN 1 ELSE 0 END         AS dialysis_renal_endstage,
  CASE WHEN trim(asthma) = '1' THEN 1 ELSE 0 END                        AS asthma,
  CASE WHEN trim(irondef) = '1' THEN 1 ELSE 0 END                       AS iron_deficiency,
  CASE WHEN trim(pneum) = '1' THEN 1 ELSE 0 END                         AS pneumonia,
  CASE WHEN trim(substancedependence) = '1' THEN 1 ELSE 0 END           AS substance_dependence,
  CASE WHEN trim(psychologicaldisordermajor) = '1' THEN 1 ELSE 0 END    AS psych_disorder_major,
  CASE WHEN trim(depress) = '1' THEN 1 ELSE 0 END                       AS depression,
  CASE WHEN trim(psychother) = '1' THEN 1 ELSE 0 END                    AS psychotherapy,
  CASE WHEN trim(fibrosisandother) = '1' THEN 1 ELSE 0 END              AS fibrosis,
  CASE WHEN trim(malnutrition) = '1' THEN 1 ELSE 0 END                  AS malnutrition,
  CASE WHEN trim(hemo) = '1' THEN 1 ELSE 0 END                          AS hemodialysis,
  trim(facid)                                                          AS facility_id,
  CAST(nullif(trim(lengthofstay), '') AS INT)                          AS length_of_stay
FROM bronze.length_of_stay;

-- ---------------------------------------------------------------------------
-- Verification: counts + a first look at the fraud rate and the money at stake
-- ---------------------------------------------------------------------------
SELECT 'beneficiary' AS t, COUNT(*) AS n FROM beneficiary
UNION ALL SELECT 'inpatient_claims', COUNT(*) FROM inpatient_claims
UNION ALL SELECT 'outpatient_claims', COUNT(*) FROM outpatient_claims
UNION ALL SELECT 'provider_label', COUNT(*) FROM provider_label
UNION ALL SELECT 'hospital_stay', COUNT(*) FROM hospital_stay;

SELECT potential_fraud,
       COUNT(*)                                            AS providers,
       ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2)  AS pct
FROM provider_label
GROUP BY potential_fraud;

SELECT COUNT(*) AS inpatient_claims,
       ROUND(SUM(reimbursed)/1000000.0, 2) AS total_reimbursed_millions,
       ROUND(AVG(los_days), 2)             AS mean_los_days,
       MAX(los_days)                       AS max_los_days,
       MIN(los_days)                       AS min_los_days
FROM inpatient_claims;
