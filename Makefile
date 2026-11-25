# Convenience targets. `make help` lists them.
SHELL := /bin/bash
.DEFAULT_GOAL := help
DC := docker compose -f docker/docker-compose.yml

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

check: ## Verify docker / RAM / ports / datasets before anything
	@./scripts/00_check_prereqs.sh

up: ## Start the Hadoop + Hive cluster
	$(DC) up -d
	@echo "NameNode UI  http://localhost:9870"
	@echo "YARN UI      http://localhost:8088"
	@echo "Hive         jdbc:hive2://localhost:10000"

ps: ## Container status
	$(DC) ps

down: ## Stop (keeps data)
	$(DC) down

reset: ## Stop and DELETE all HDFS + metastore volumes
	$(DC) down -v

ingest: ## Upload raw CSVs to HDFS with 128 MB blocks
	@./scripts/10_ingest_hdfs.sh 128m

ingest-small: ## Upload with 16 MB blocks (shows block splitting live)
	@./scripts/10_ingest_hdfs.sh 16m

hdfs-demo: ## hdfs fsck / du / report screenshots
	@./scripts/10_ingest_hdfs.sh 128m

sql: ## Bronze -> Silver -> Gold in Hive
	@./scripts/20_run_sql.sh

export: ## Gold -> data/gold/*.csv for Power BI
	@./scripts/30_export_gold.sh

ml: ## Train the 3 ML models
	@./scripts/40_run_ml.sh

fault: ## Live replication / fault-tolerance demo
	@./scripts/99_demo_fault_tolerance.sh

venv: ## Create the Python environment
	python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt

.PHONY: help check up ps down reset ingest ingest-small hdfs-demo sql export ml fault venv
