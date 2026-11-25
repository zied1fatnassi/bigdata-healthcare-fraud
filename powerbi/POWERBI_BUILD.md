# Power BI — build sheet (model, pages, what-if, publishing)

> **Windows-only tool, honest warning.** Power BI Desktop does not run on Linux.
> Three ways to still deliver it (pick one, all work):
> 1. **Best:** open the CSVs from `data/gold/` on any Windows PC/laptop, build the
>    `.pbix` there, save it in the shared Drive folder.
> 2. **Virtual machine:** VirtualBox + Windows 11 ISO on this laptop (32 GB RAM is
>    more than enough — give the VM 8 GB), install Power BI Desktop inside.
> 3. **Power BI Service only:** publish nothing, and present from the browser
>    version after uploading the CSVs to OneDrive — limited, but acceptable if
>    you explain the constraint in the report.
>
> Everything below is done once, on a Windows machine, in **Power BI Desktop**
> (free download, no licence needed to build a `.pbix`).

---

## 1. Import the five tables

`Home > Get data > Text/CSV`, then for each file in `data/gold/`:

| File | Table name in the model | Role |
|---|---|---|
| `fact_claims.csv` | `Fact Claims` | fact, ~558 k rows |
| `dim_provider.csv` | `Dim Provider` | dimension, 5 410 rows (labelled) |
| `dim_beneficiary.csv` | `Dim Beneficiary` | dimension, 138 556 rows |
| `dim_date.csv` | `Dim Date` | dimension, ~730 rows |
| `fact_provider_features.csv` | `Provider Features` | ML feature table, 1 row/provider |
| `fact_provider_risk.csv` *(from the ML run)* | `Provider Risk` | score + risk band |

In Power Query, before loading:
- set `claim_start`, `first_claim_date`, `last_claim_date`, `dob`, `death_date` to **Date**;
- set `reimbursed`, `deductible_paid`, `total_reimbursed` to **Fixed decimal number**;
- rename `is_fraud` to `Fraud Label` and add a column `Fraud Status`:
  `if [Fraud Label] = 1 then "Fraud" else if [Fraud Label] = 0 then "Legit" else "Unlabelled"`.

## 2. Relationships (Model view — this *is* the star schema)

| From | To | Cardinality | Direction |
|---|---|---|---|
| `Fact Claims[provider]` | `Dim Provider[provider]` | many → one | single |
| `Fact Claims[bene_id]` | `Dim Beneficiary[bene_id]` | many → one | single |
| `Fact Claims[claim_date_key]` | `Dim Date[date_key]` | many → one | single |
| `Provider Features[provider]` | `Dim Provider[provider]` | one → one | single |
| `Provider Risk[Provider]` | `Dim Provider[provider]` | one → one | single |

Rules that earn marks: **never** a many-to-many, **no** bidirectional except when
you can justify it, and hide every key column from Report view.

## 3. The three report pages

### Page 1 — "Fraud Overview" (executive)
| Visual | Fields |
|---|---|
| 4 KPI cards | Total Reimbursed, Claims, Providers, Fraud Rate (%) |
| Donut | Reimbursed by `Fraud Status` |
| Bar chart | Top 10 providers by `Total Reimbursed`, coloured by `Fraud Status` |
| Line chart | `Reimbursed` by `Dim Date[month]` |
| Slicer | `Dim Provider[state]`, `Dim Date[year]` |
| Text box | one-sentence insight: e.g. "flagged providers bill X% more per patient" |

### Page 2 — "Fraud Detection & What-if" (the ML page)
| Visual | Fields |
|---|---|
| **What-if parameter** `Threshold` (0 to 1, step 0.01) | built in *Modeling > New parameter* |
| Card | `Flagged Providers` (count with score ≥ Threshold) |
| Card | `Money Flagged` (sum of reimbursed for those providers) |
| Card | `Recall At Threshold`, `Precision At Threshold` *(if you import the test predictions)* |
| Scatter | x = `total_reimbursed`, y = `fraud_score`, legend = `Fraud Status` |
| Table | provider, score, risk band, money at stake — sorted desc |
| Slicer | `Risk Band` |

The slider is the demo money-shot: move it from 0.9 to 0.5 and say
*"watch the flagged exposure go from X to Y million — that's the trade-off between
investigator workload and recovered money."*

### Page 3 — "Hospital Stay & Capacity" (the regression page)
| Visual | Fields |
|---|---|
| Line/area | `Avg LOS` by month (actual) vs `Predicted LOS` |
| Histogram | LOS buckets (`los_days` grouped 1-2, 3-5, 6-10, 11-20, 21+) |
| Bar | `Avg LOS` by `diagnosis_group` (top 15) |
| Card | MAE (from `reports/regression_metrics.json`: **3.21 days** on Medicare data) |
| Card | Bed-days = SUM(los_days) |
| Matrix | facility × month bed-days (if you use the Microsoft dataset) |

### Page 4 (optional) — "Patient Risk Profiles" (the clustering page)
Scatter of `n_chronic` vs `annual_reimbursed` coloured by `cluster`, plus a table of
the 3 profiles with their size and mean spend (numbers in `reports/clustering_metrics.json`).

## 4. Threshold parameter, step by step

1. `Modeling` ribbon → **New parameter** → **Numeric range**.
2. Name `Threshold`, Data type *Decimal*, Minimum 0, Maximum 1, Increment 0.01, Default 0.50.
3. Tick **Add slicer to this page** → a slider appears.
4. Add the measures from `DAX_measures.md` (`Money Flagged`, `Flagged Providers`, …).

## 5. Theme and polish (cheap marks)

- `View > Themes > Browse` → import `powerbi/theme_healthfraud.json` (included).
- Turn off gridlines and axis titles you don't need; no 3-D, no pie with >4 slices.
- Every page: a title, a one-line insight, and a data-refresh date in the footer.
- Accessibility: for each visual set `Format > General > Alt text`; check the
  Reading order with `View > Accessibility`. Contrast on text ≥ 4.5:1.

## 6. Deliverables to hand in

1. `HealthFraud.pbix`
2. `HealthFraud.pdf` (`File > Export > Export to PDF`) — required if the grader has no Power BI
3. 8-10 screenshots of the pages (used in the written report)
4. The `data/gold/` CSVs + `ml/` scripts, so the work is reproducible
