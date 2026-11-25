"""
02_classification.py — Supervised binary classification:
predict PotentialFraud (Yes/No) per provider.

Course requirements covered explicitly:
  * 70% train / 15% validation / 15% test split (stratified, so the 9.35%
    fraud rate is preserved in all three sets).
  * decision-threshold rule score >= seuil -> class 1, with the threshold
    tuned on the VALIDATION set only (never on test).
  * metrics: accuracy, precision, recall, F1, ROC-AUC + confusion matrix.

Run:  ./.venv/bin/python ml/02_classification.py
"""
from __future__ import annotations

import json
import pathlib

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from common import FEATURES, GOLD, build_provider_features

OUT = pathlib.Path(__file__).resolve().parents[1] / "reports"
OUT.mkdir(exist_ok=True)


def main() -> None:
    df = build_provider_features("Train")
    GOLD.mkdir(parents=True, exist_ok=True)
    df.to_csv(GOLD / "dim_provider_ml.csv", index=False)

    X = df[FEATURES].replace([np.inf, -np.inf], np.nan).fillna(0.0)
    y = df["is_fraud"].to_numpy()

    # 70 / 15 / 15 — split off 30% then halve it.
    X_tr, X_tmp, y_tr, y_tmp = train_test_split(X, y, test_size=0.30, random_state=42, stratify=y)
    X_val, X_te, y_val, y_te = train_test_split(X_tmp, y_tmp, test_size=0.50, random_state=42, stratify=y_tmp)

    models = {
        "LogisticRegression": Pipeline(
            [("scaler", StandardScaler()), ("clf", LogisticRegression(max_iter=2000, class_weight="balanced"))]
        ),
        "RandomForest": RandomForestClassifier(
            n_estimators=400, min_samples_leaf=3, class_weight="balanced_subsample", random_state=42, n_jobs=-1
        ),
    }

    results, fitted = {}, {}
    for name, model in models.items():
        model.fit(X_tr, y_tr)
        p_val = model.predict_proba(X_val)[:, 1]

        # Tune the decision threshold on validation, maximising F1.
        grid = np.arange(0.05, 0.96, 0.01)
        scores = [f1_score(y_val, (p_val >= t).astype(int), zero_division=0) for t in grid]
        best_t = float(grid[int(np.argmax(scores))])

        p_te = model.predict_proba(X_te)[:, 1]
        y_hat = (p_te >= best_t).astype(int)
        cm = confusion_matrix(y_te, y_hat)
        results[name] = {
            "threshold": round(best_t, 2),
            "accuracy": round(accuracy_score(y_te, y_hat), 4),
            "precision": round(precision_score(y_te, y_hat, zero_division=0), 4),
            "recall": round(recall_score(y_te, y_hat, zero_division=0), 4),
            "f1": round(f1_score(y_te, y_hat, zero_division=0), 4),
            "roc_auc": round(roc_auc_score(y_te, p_te), 4),
            "pr_auc": round(average_precision_score(y_te, p_te), 4),
            "confusion_matrix": cm.tolist(),
            "tn_fp_fn_tp": [int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])],
        }
        fitted[name] = model

    best_name = max(results, key=lambda k: results[k]["f1"])
    best = fitted[best_name]

    # Feature importance of the winning model (auditor-friendly explanation).
    clf = best.named_steps["clf"] if isinstance(best, Pipeline) else best
    if hasattr(clf, "feature_importances_"):
        raw = clf.feature_importances_
    else:  # LogisticRegression: use the absolute standardised coefficients
        raw = np.abs(clf.coef_[0])
    importance = pd.Series(raw, index=FEATURES).sort_values(ascending=False)
    importance.round(4).to_csv(OUT / "feature_importance.csv")

    # Score every provider so Power BI can show a risk score + risk band.
    proba = best.predict_proba(X.replace([np.inf, -np.inf], np.nan).fillna(0.0))[:, 1]
    scored = df[["Provider", "is_fraud"] + FEATURES].copy()
    scored["fraud_score"] = proba.round(4)
    scored["fraud_flag"] = (proba >= results[best_name]["threshold"]).astype(int)
    # Money at stake per provider, used by the Power BI what-if slider.
    scored["money_at_stake"] = (scored["fraud_score"] * scored["total_reimbursed"]).round(2)
    scored.sort_values("fraud_score", ascending=False).to_csv(GOLD / "fact_provider_risk.csv", index=False)

    payload = {
        "rows_train": int(len(X_tr)),
        "rows_val": int(len(X_val)),
        "rows_test": int(len(X_te)),
        "fraud_rate": round(float(y.mean()), 4),
        "best_model": best_name,
        "metrics": results,
        "top_features": importance.head(10).round(4).to_dict(),
        "money_at_stake_total": round(float(scored["money_at_stake"].sum()), 2),
    }
    (OUT / "classification_metrics.json").write_text(json.dumps(payload, indent=2))

    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
