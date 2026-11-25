-- ===========================================================================
-- 01_bronze_tables.hql
-- EXTERNAL tables over the raw CSV files already uploaded to HDFS.
--
-- Why "EXTERNAL"? Because the data stays where HDFS put it: DROP TABLE only
-- removes the metadata, never the files. That is the correct pattern for a
-- raw landing zone you must be able to reprocess.
--
-- Why OpenCSVSerde? Because these Kaggle CSVs quote text fields
-- ("CLM46614") and the default LazySimpleSerDe would keep the quotes in the
-- values. OpenCSVSerde strips them for you.
--
-- Every column name below is copied from the real file header, nothing invented.
-- ===========================================================================

USE bronze;

-- ---------------------------------------------------------------------------
-- 1. Provider labels (the supervised target lives here)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS train_labels;
CREATE EXTERNAL TABLE train_labels (
  provider        STRING,
  potentialfraud  STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES ("separatorChar"=",", "quoteChar"='"', "escapeChar"='\\')
STORED AS TEXTFILE
LOCATION 'hdfs://namenode:9000/data/bronze/train_labels'
TBLPROPERTIES ("skip.header.line.count"="1");

DROP TABLE IF EXISTS test_labels;
CREATE EXTERNAL TABLE test_labels (provider STRING)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES ("separatorChar"=",", "quoteChar"='"', "escapeChar"='\\')
STORED AS TEXTFILE
LOCATION 'hdfs://namenode:9000/data/bronze/test_labels'
TBLPROPERTIES ("skip.header.line.count"="1");

-- ---------------------------------------------------------------------------
-- 2. Beneficiary dimension (one row per patient)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS train_beneficiary;
CREATE EXTERNAL TABLE train_beneficiary (
  beneid STRING, dob STRING, dod STRING, gender STRING, race STRING,
  renaldiseaseindicator STRING, state STRING, county STRING,
  noofmonths_partacov STRING, noofmonths_partbcov STRING,
  chroniccond_alzheimer STRING, chroniccond_heartfailure STRING,
  chroniccond_kidneydisease STRING, chroniccond_cancer STRING,
  chroniccond_obstrpulmonary STRING, chroniccond_depression STRING,
  chroniccond_diabetes STRING, chroniccond_ischemicheart STRING,
  chroniccond_osteoporasis STRING, chroniccond_rheumatoidarthritis STRING,
  chroniccond_stroke STRING,
  ipannualreimbursementamt STRING, ipannualdeductibleamt STRING,
  opannualreimbursementamt STRING, opannualdeductibleamt STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES ("separatorChar"=",", "quoteChar"='"', "escapeChar"='\\')
STORED AS TEXTFILE
LOCATION 'hdfs://namenode:9000/data/bronze/train_beneficiary'
TBLPROPERTIES ("skip.header.line.count"="1");

DROP TABLE IF EXISTS test_beneficiary;
CREATE EXTERNAL TABLE test_beneficiary LIKE train_beneficiary
LOCATION 'hdfs://namenode:9000/data/bronze/test_beneficiary';

-- ---------------------------------------------------------------------------
-- 3. Inpatient claims (hospital stays -> also the source of length of stay)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS train_inpatient;
CREATE EXTERNAL TABLE train_inpatient (
  beneid STRING, claimid STRING, claimstartdt STRING, claimenddt STRING,
  provider STRING, inscclaimamtreimbursed STRING,
  attendingphysician STRING, operatingphysician STRING, otherphysician STRING,
  admissiondt STRING, clmadmitdiagnosiscode STRING, deductibleamtpaid STRING,
  dischargedt STRING, diagnosisgroupcode STRING,
  clmdiagnosiscode_1 STRING, clmdiagnosiscode_2 STRING, clmdiagnosiscode_3 STRING,
  clmdiagnosiscode_4 STRING, clmdiagnosiscode_5 STRING, clmdiagnosiscode_6 STRING,
  clmdiagnosiscode_7 STRING, clmdiagnosiscode_8 STRING, clmdiagnosiscode_9 STRING,
  clmdiagnosiscode_10 STRING,
  clmprocedurecode_1 STRING, clmprocedurecode_2 STRING, clmprocedurecode_3 STRING,
  clmprocedurecode_4 STRING, clmprocedurecode_5 STRING, clmprocedurecode_6 STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES ("separatorChar"=",", "quoteChar"='"', "escapeChar"='\\')
STORED AS TEXTFILE
LOCATION 'hdfs://namenode:9000/data/bronze/train_inpatient'
TBLPROPERTIES ("skip.header.line.count"="1");

DROP TABLE IF EXISTS test_inpatient;
CREATE EXTERNAL TABLE test_inpatient LIKE train_inpatient
LOCATION 'hdfs://namenode:9000/data/bronze/test_inpatient';

-- ---------------------------------------------------------------------------
-- 4. Outpatient claims (clinic visits, no admission/discharge dates)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS train_outpatient;
CREATE EXTERNAL TABLE train_outpatient (
  beneid STRING, claimid STRING, claimstartdt STRING, claimenddt STRING,
  provider STRING, inscclaimamtreimbursed STRING,
  attendingphysician STRING, operatingphysician STRING, otherphysician STRING,
  clmdiagnosiscode_1 STRING, clmdiagnosiscode_2 STRING, clmdiagnosiscode_3 STRING,
  clmdiagnosiscode_4 STRING, clmdiagnosiscode_5 STRING, clmdiagnosiscode_6 STRING,
  clmdiagnosiscode_7 STRING, clmdiagnosiscode_8 STRING, clmdiagnosiscode_9 STRING,
  clmdiagnosiscode_10 STRING,
  clmprocedurecode_1 STRING, clmprocedurecode_2 STRING, clmprocedurecode_3 STRING,
  clmprocedurecode_4 STRING, clmprocedurecode_5 STRING, clmprocedurecode_6 STRING,
  deductibleamtpaid STRING, clmadmitdiagnosiscode STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES ("separatorChar"=",", "quoteChar"='"', "escapeChar"='\\')
STORED AS TEXTFILE
LOCATION 'hdfs://namenode:9000/data/bronze/train_outpatient'
TBLPROPERTIES ("skip.header.line.count"="1");

DROP TABLE IF EXISTS test_outpatient;
CREATE EXTERNAL TABLE test_outpatient LIKE train_outpatient
LOCATION 'hdfs://namenode:9000/data/bronze/test_outpatient';

-- ---------------------------------------------------------------------------
-- 5. Length of stay (Microsoft, second dataset used for the regression model)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS length_of_stay;
CREATE EXTERNAL TABLE length_of_stay (
  eid STRING, vdate STRING, rcount STRING, gender STRING,
  dialysisrenalendstage STRING, asthma STRING, irondef STRING, pneum STRING,
  substancedependence STRING, psychologicaldisordermajor STRING, depress STRING,
  psychother STRING, fibrosisandother STRING, malnutrition STRING, hemo STRING,
  hematocrit STRING, neutrophils STRING, sodium STRING, glucose STRING,
  bloodureanitro STRING, creatinine STRING, bmi STRING, pulse STRING,
  respiration STRING, secondarydiagnosisnonicd9 STRING, discharged STRING,
  facid STRING, lengthofstay STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES ("separatorChar"=",", "quoteChar"='"', "escapeChar"='\\')
STORED AS TEXTFILE
LOCATION 'hdfs://namenode:9000/data/bronze/length_of_stay'
TBLPROPERTIES ("skip.header.line.count"="1");

-- ---------------------------------------------------------------------------
-- Sanity check: row counts must match the real line counts of the CSVs.
--   train_labels        5 410
--   train_beneficiary 138 556
--   train_inpatient    40 474
--   train_outpatient  517 737
--   test_labels         1 353
--   length_of_stay    100 000
-- ---------------------------------------------------------------------------
SELECT 'train_labels' AS t, COUNT(*) AS n FROM train_labels
UNION ALL SELECT 'test_labels', COUNT(*) FROM test_labels
UNION ALL SELECT 'train_beneficiary', COUNT(*) FROM train_beneficiary
UNION ALL SELECT 'test_beneficiary', COUNT(*) FROM test_beneficiary
UNION ALL SELECT 'train_inpatient', COUNT(*) FROM train_inpatient
UNION ALL SELECT 'test_inpatient', COUNT(*) FROM test_inpatient
UNION ALL SELECT 'train_outpatient', COUNT(*) FROM train_outpatient
UNION ALL SELECT 'test_outpatient', COUNT(*) FROM test_outpatient
UNION ALL SELECT 'length_of_stay', COUNT(*) FROM length_of_stay;
