"""
03_regression_los.py — Supervised regression: predict the length of hospital
stay (durée d'hospitalisation, in days).

Target is engineered from the Inpatient table: DischargeDt - AdmissionDt (+1).
Two datasets are used, on purpose:

  1. The Medicare inpatient claims (Train_Inpatientdata...) -> small, real,
     and already joined to the provider/beneficiary dimensions. This is the
     one that belongs to the star schema and feeds the Power BI occupancy view.
  2. The Microsoft LengthOfStay.csv (100,000 clean rows) -> the "volume"
     booster that shows the same model at scale and gives a clean benchmark.

Run:  ./.venv/bin/python ml/03_regression_los.py
"""
from __future__ import annotations

import json
import pathlib

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score, root_mean_squared_error
from sklearn.model_selection import train_test_split

from common import GOLD, load_raw, clean_beneficiary, clean_inpatient

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "reports"


def metrics(y_true, y_pred) -> dict:
    return {
        "mae_days": round(float(mean_absolute_error(y_true, y_pred)), 3),
        "rmse_days": round(float(root_mean_squared_error(y_true, y_pred)), 3),
        "r2": round(float(r2_score(y_true, y_pred)), 4),
    }


def medicare_los() -> dict:
    t = load_raw("Train")
    inp = clean_inpatient(t["inp"])
    bene = clean_beneficiary(t["bene"])

    d = inp.dropna(subset=["los_days"]).merge(
        bene[["BeneID", "age", "n_chronic", "gender_male", "is_deceased"]], on="BeneID", how="left"
    )
    d["diag_group"] = pd.to_numeric(d["DiagnosisGroupCode"], errors="coerce")
    d["admit_dx"] = pd.to_numeric(d["ClmAdmitDiagnosisCode"], errors="coerce")
    feats = ["reimbursed", "deductible", "diag_group", "admit_dx", "age", "n_chronic", "gender_male", "is_deceased"]
    d = d.dropna(subset=["reimbursed"])

    X, y = d[feats].fillna(-1), d["los_days"]
    X_tr, X_tmp, y_tr, y_tmp = train_test_split(X, y, test_size=0.30, random_state=42)
    X_val, X_te, y_val, y_te = train_test_split(X_tmp, y_tmp, test_size=0.50, random_state=42)

    model = HistGradientBoostingRegressor(max_iter=300, learning_rate=0.06, random_state=42)
    model.fit(X_tr, y_tr)
    res = {"n_claims": int(len(d)), "mean_los": round(float(y.mean()), 2), "max_los": int(y.max())}
    res["validation"] = metrics(y_val, model.predict(X_val))
    res["test"] = metrics(y_te, model.predict(X_te))

    # Persist predictions so Power BI can chart predicted vs actual occupancy.
    pred = pd.DataFrame(
        {
            "ClaimID": d.loc[X_te.index, "ClaimID"],
            "Provider": d.loc[X_te.index, "Provider"],
            "admission": d.loc[X_te.index, "AdmissionDt"].dt.date.astype(str),
            "actual_los": y_te.values,
            "predicted_los": np.round(model.predict(X_te), 2),
        }
    )
    GOLD.mkdir(parents=True, exist_ok=True)
    pred.to_csv(GOLD / "fact_los_predictions.csv", index=False)
    return res


def microsoft_los() -> dict:
    d = pd.read_csv(ROOT / "data" / "raw" / "LengthOfStay.csv")
    y = d["lengthofstay"].astype(float)
    drop = ["eid", "vdate", "discharged", "lengthofstay"]
    X = d.drop(columns=drop)
    # `rcount` is exported as text ("5+", "4", ...) -> make it numeric, and let
    # any other text column be one-hot encoded.
    for c in X.columns:
        if not pd.api.types.is_numeric_dtype(X[c]):
            X[c] = pd.to_numeric(X[c].astype(str).str.replace("+", "", regex=False), errors="coerce")
    X = pd.get_dummies(X, columns=[c for c in ["gender", "facid"] if c in X.columns], drop_first=True).astype(float)

    X_tr, X_tmp, y_tr, y_tmp = train_test_split(X, y, test_size=0.30, random_state=42)
    X_val, X_te, y_val, y_te = train_test_split(X_tmp, y_tmp, test_size=0.50, random_state=42)

    model = RandomForestRegressor(n_estimators=300, min_samples_leaf=5, random_state=42, n_jobs=-1)
    model.fit(X_tr, y_tr)
    res = {"n_rows": int(len(d)), "mean_los": round(float(y.mean()), 2), "max_los": int(y.max())}
    res["validation"] = metrics(y_val, model.predict(X_val))
    res["test"] = metrics(y_te, model.predict(X_te))
    return res


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    payload = {"medicare_inpatient": medicare_los(), "microsoft_los": microsoft_los()}
    (OUT / "regression_metrics.json").write_text(json.dumps(payload, indent=2))
    print(json.dumps(payload, indent=2))
