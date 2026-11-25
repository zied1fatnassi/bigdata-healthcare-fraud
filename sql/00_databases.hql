-- ===========================================================================
-- 00_databases.hql
-- Medallion architecture: bronze (raw) -> silver (clean) -> gold (star schema)
-- Run:  docker exec -it hiveserver2 beeline -u jdbc:hive2://localhost:10000 -f /sql/00_databases.hql
-- ===========================================================================

CREATE DATABASE IF NOT EXISTS bronze COMMENT 'Raw Kaggle CSVs exactly as downloaded, all columns STRING'
  LOCATION '/data/bronze';

CREATE DATABASE IF NOT EXISTS silver COMMENT 'Typed, cleaned, de-duplicated tables (ORC)'
  LOCATION '/data/silver';

CREATE DATABASE IF NOT EXISTS gold COMMENT 'Star schema + ML feature tables consumed by Power BI'
  LOCATION '/data/gold';

SHOW DATABASES;
