# DAX measures — copy/paste in Power BI Desktop

Create them in this order (`Modeling > New measure`). Table placement in brackets
is only organisational, DAX does not care.

### 1. Base measures

```dax
Total Reimbursed = SUM ( 'Fact Claims'[reimbursed] )

Total Claims = COUNTROWS ( 'Fact Claims' )

Inpatient Claims =
CALCULATE ( [Total Claims], 'Fact Claims'[claim_type] = "Inpatient" )

Outpatient Claims =
CALCULATE ( [Total Claims], 'Fact Claims'[claim_type] = "Outpatient" )

Providers = DISTINCTCOUNT ( 'Fact Claims'[provider] )

Patients = DISTINCTCOUNT ( 'Fact Claims'[bene_id] )

Avg Reimbursement = DIVIDE ( [Total Reimbursed], [Total Claims] )

Avg LOS (days) =
AVERAGE ( 'Fact Claims'[los_days] )
-- returns blank on outpatient rows, which is correct: they have no stay

Bed Days = SUM ( 'Fact Claims'[los_days] )
```

### 2. Fraud label measures

```dax
Labelled Providers =
CALCULATE ( COUNTROWS ( 'Dim Provider' ), 'Dim Provider'[Fraud Label] >= 0 )

Fraud Providers =
CALCULATE ( COUNTROWS ( 'Dim Provider' ), 'Dim Provider'[Fraud Label] = 1 )

Fraud Rate % =
DIVIDE ( [Fraud Providers], [Labelled Providers] )
```

### 3. Threshold / what-if measures

Requires the numeric-range parameter named `Threshold` (0 → 1, step 0.01).

```dax
Flagged Providers =
VAR t = [Threshold Value]                 -- the parameter's own measure
RETURN CALCULATE ( COUNTROWS ( 'Provider Risk' ), 'Provider Risk'[fraud_score] >= t )

Money Flagged =
VAR t = [Threshold Value]
RETURN CALCULATE ( SUM ( 'Provider Risk'[total_reimbursed] ),
                   'Provider Risk'[fraud_score] >= t )

Exposure Share % =
DIVIDE ( [Money Flagged], [Total Reimbursed] )

-- Precision of the model at the chosen threshold, using the held-out labels.
Precision At Threshold =
VAR t = [Threshold Value]
VAR tp = CALCULATE ( COUNTROWS ( 'Provider Risk' ),
                     'Provider Risk'[fraud_score] >= t, 'Provider Risk'[is_fraud] = 1 )
VAR fp = CALCULATE ( COUNTROWS ( 'Provider Risk' ),
                     'Provider Risk'[fraud_score] >= t, 'Provider Risk'[is_fraud] = 0 )
RETURN DIVIDE ( tp, tp + fp )

Recall At Threshold =
VAR t = [Threshold Value]
VAR tp = CALCULATE ( COUNTROWS ( 'Provider Risk' ),
                     'Provider Risk'[fraud_score] >= t, 'Provider Risk'[is_fraud] = 1 )
VAR fn = CALCULATE ( COUNTROWS ( 'Provider Risk' ),
                     'Provider Risk'[fraud_score] < t, 'Provider Risk'[is_fraud] = 1 )
RETURN DIVIDE ( tp, tp + fn )
```

> Expected values from the verified run (`reports/classification_metrics.json`):
> at threshold **0.85** → precision **0.642**, recall **0.684**, F1 **0.662**,
> ROC-AUC **0.949** on the 15 % test set (812 providers, 76 of them fraudulent).

### 4. Risk band (put on `Provider Risk` or `Dim Provider`)

```dax
Risk Band =
VAR s = MAX ( 'Provider Risk'[fraud_score] )
RETURN
    SWITCH ( TRUE (),
        s >= 0.85, "1 - Critical",
        s >= 0.65, "2 - High",
        s >= 0.40, "3 - Medium",
        "4 - Low" )
```

### 5. Regression / capacity measures

```dax
Predicted LOS (days) = AVERAGE ( 'Fact LOS Predictions'[predicted_los] )
Actual LOS (days)    = AVERAGE ( 'Fact LOS Predictions'[actual_los] )
LOS Error (days)     = ABS ( [Actual LOS (days)] - [Predicted LOS (days)] )

-- Ratio of reimbursement to stay length: an auditor flag on its own.
Reimbursement per Bed Day =
DIVIDE ( [Total Reimbursed], [Bed Days] )
```

### 6. Clustering measures (patient profiles)

```dax
Profiled Patients = COUNTROWS ( 'Dim Beneficiary Clusters' )

High-Risk Patients =
CALCULATE ( [Profiled Patients], 'Cluster Profiles'[profile] = "High-risk multi-chronic (heavy inpatient)" )

High-Risk Share % = DIVIDE ( [High-Risk Patients], [Profiled Patients] )
```

### 7. A full calendar, if you prefer it to the Hive `dim_date`

```dax
Dim Date Full =
ADDCOLUMNS (
    CALENDAR ( DATE ( 2009, 1, 1 ), DATE ( 2010, 12, 31 ) ),
    "Year", YEAR ( [Date] ),
    "Month Number", MONTH ( [Date] ),
    "Month", FORMAT ( [Date], "MMMM" ),
    "Year-Month", FORMAT ( [Date], "YYYY-MM" ),
    "Weekday", FORMAT ( [Date], "dddd" ),
    "Is Weekend", IF ( WEEKDAY ( [Date], 2 ) >= 6, 1, 0 )
)
```
Then mark it as a date table (`Table tools > Mark as date table`) and relate
`claim_date_key` to `Year*10000 + Month Number*100 + DAY([Date])` or simply to `[Date]`
after converting `claim_start` to Date.
