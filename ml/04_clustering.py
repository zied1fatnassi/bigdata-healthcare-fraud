"""
04_clustering.py — Unsupervised clustering: discover patient risk profiles
without using any label.

Mirrors the course example ("discover profiles across 10,000 patients with no
labels"): K-Means on the beneficiary dimension, k chosen by silhouette score,
then each cluster is described with its dominant chronic conditions so the
result can be read as a *profile*, not just a number.

Run:  ./.venv/bin/python ml/04_clustering.py
"""
from __future__ import annotations

import json
import pathlib

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from common import CHRONIC_COLS, GOLD, clean_beneficiary, load_raw

OUT = pathlib.Path(__file__).resolve().parents[1] / "reports"

FEATS = ["age", "n_chronic", "annual_reimb", "ip_reimb", "op_reimb", "renal_disease", "is_deceased"]


def main() -> None:
    bene = clean_beneficiary(load_raw("Train")["bene"])
    b = bene.dropna(subset=["age"]).copy()
    # Re-attach the raw spend columns for the profile description.
    b = b.merge(
        load_raw("Train")["bene"][["BeneID", "IPAnnualReimbursementAmt", "OPAnnualReimbursementAmt"]], on="BeneID"
    )
    b["ip_reimb"] = b["IPAnnualReimbursementAmt"].fillna(0)
    b["op_reimb"] = b["OPAnnualReimbursementAmt"].fillna(0)

    X = StandardScaler().fit_transform(b[FEATS].replace([np.inf, -np.inf], np.nan).fillna(0))

    scores, models = {}, {}
    for k in range(2, 9):
        km = KMeans(n_clusters=k, random_state=42, n_init=10).fit(X)
        scores[k] = round(float(silhouette_score(X, km.labels_, sample_size=20000, random_state=42)), 4)
        models[k] = km
    best_k = max(scores, key=scores.get)
    b["cluster"] = models[best_k].labels_

    prof = b.groupby("cluster").agg(
        n_patients=("BeneID", "size"),
        mean_age=("age", "mean"),
        mean_n_chronic=("n_chronic", "mean"),
        mean_ip_reimb=("ip_reimb", "mean"),
        mean_op_reimb=("op_reimb", "mean"),
        pct_deceased=("is_deceased", "mean"),
        pct_renal=("renal_disease", "mean"),
    )
    for c in CHRONIC_COLS:
        prof[f"pct_{c.replace('ChronicCond_', '')}"] = b.groupby("cluster")[c].mean()
    prof = prof.round(3).reset_index()

    # Human-readable label per cluster, driven by the numbers above.
    def name(row) -> str:
        if row["pct_deceased"] > 0.5:
            return "End-of-life / deceased cohort"
        if row["mean_n_chronic"] >= 5 and row["mean_ip_reimb"] > 5000:
            return "High-risk multi-chronic (heavy inpatient)"
        if row["mean_n_chronic"] >= 3:
            return "Chronic watch-list"
        if row["mean_ip_reimb"] > 2000:
            return "Sporadic high-cost"
        return "Low-risk routine"

    prof["profile"] = prof.apply(name, axis=1)

    GOLD.mkdir(parents=True, exist_ok=True)
    b[["BeneID", "cluster", *FEATS]].to_csv(GOLD / "dim_beneficiary_clusters.csv", index=False)
    prof.to_csv(GOLD / "dim_cluster_profiles.csv", index=False)

    payload = {
        "n_patients": int(len(b)),
        "silhouette_by_k": scores,
        "chosen_k": int(best_k),
        "silhouette": scores[best_k],
        "profiles": prof.to_dict(orient="records"),
    }
    OUT.mkdir(exist_ok=True)
    (OUT / "clustering_metrics.json").write_text(json.dumps(payload, indent=2, default=str))
    print(json.dumps(payload, indent=2, default=str))


if __name__ == "__main__":
    main()
