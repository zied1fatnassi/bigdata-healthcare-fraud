"""
common.py — Shared loading + Silver-layer cleaning for the
Healthcare Provider Fraud project.

This module reproduces (in pandas, for a laptop) exactly the same logic that
sql/02_silver.hql performs inside Hive on the Docker/Hadoop cluster.
Keeping both is deliberate: the Hive job is what you defend in the Big Data
course, this pandas version is what lets you iterate fast and prove the
machine-learning numbers.

Every column name below was read from the real Kaggle CSVs in data/raw/,
nothing here is guessed.
"""
from __future__ import annotations

import pathlib

import numpy as np
import pandas as pd

RAW = pathlib.Path(__file__).resolve().parents[1] / "data" / "raw"
GOLD = pathlib.Path(__file__).resolve().parents[1] / "data" / "gold"

# The Kaggle export appends a timestamp suffix to every filename.
TRAIN_SUFFIX = "-1542865627584.csv"
TEST_SUFFIX = "-1542969243754.csv"

CHRONIC_COLS = [
    "ChronicCond_Alzheimer",
    "ChronicCond_Heartfailure",
    "ChronicCond_KidneyDisease",
    "ChronicCond_Cancer",
    "ChronicCond_ObstrPulmonary",
    "ChronicCond_Depression",
    "ChronicCond_Diabetes",
    "ChronicCond_IschemicHeart",
    "ChronicCond_Osteoporasis",
    "ChronicCond_rheumatoidarthritis",
    "ChronicCond_stroke",
]


def _read(name: str) -> pd.DataFrame:
    return pd.read_csv(RAW / name, low_memory=False)


def load_raw(split: str = "Train") -> dict[str, pd.DataFrame]:
    """Load the 4 relational tables of one split ('Train' or 'Test')."""
    suffix = TRAIN_SUFFIX if split == "Train" else TEST_SUFFIX
    return {
        "labels": _read(f"{split}{suffix}"),
        "bene": _read(f"{split}_Beneficiarydata{suffix}"),
        "inp": _read(f"{split}_Inpatientdata{suffix}"),
        "outp": _read(f"{split}_Outpatientdata{suffix}"),
    }


def clean_beneficiary(bene: pd.DataFrame) -> pd.DataFrame:
    """Silver: Beneficiary dimension.

    - Chronic conditions are coded 1/2 in the source (1 = yes, 2 = no).
      Recoded here to the conventional 1/0 so sums and averages are readable.
    - DOB / DOD become datetimes, age is computed at a fixed reference date
      (the last claim date in the dataset, 2009-12-31), never "today", so the
      result is reproducible.
    """
    b = bene.copy()
    for c in CHRONIC_COLS:
        b[c] = (b[c] == 1).astype(int)

    b["DOB"] = pd.to_datetime(b["DOB"], errors="coerce")
    b["DOD"] = pd.to_datetime(b["DOD"], errors="coerce")
    ref = pd.Timestamp("2009-12-31")
    b["age"] = ((ref - b["DOB"]).dt.days / 365.25).round(1)
    b["is_deceased"] = b["DOD"].notna().astype(int)
    b["renal_disease"] = (b["RenalDiseaseIndicator"] == "Y").astype(int)
    b["gender_male"] = (b["Gender"] == 1).astype(int)
    b["n_chronic"] = b[CHRONIC_COLS].sum(axis=1)
    b["ip_reimb"] = pd.to_numeric(b["IPAnnualReimbursementAmt"], errors="coerce")
    b["op_reimb"] = pd.to_numeric(b["OPAnnualReimbursementAmt"], errors="coerce")
    b["annual_reimb"] = b["ip_reimb"].fillna(0) + b["op_reimb"].fillna(0)
    keep = [
        "BeneID",
        "age",
        "gender_male",
        "renal_disease",
        "is_deceased",
        "n_chronic",
        "annual_reimb",
        "State",
        "County",
        *CHRONIC_COLS,
    ]
    return b[keep]


def clean_inpatient(inp: pd.DataFrame) -> pd.DataFrame:
    """Silver: Inpatient fact table + derived length of stay (the target of the
    regression model)."""
    i = inp.copy()
    for c in ["ClaimStartDt", "ClaimEndDt", "AdmissionDt", "DischargeDt"]:
        i[c] = pd.to_datetime(i[c], errors="coerce")
    i["reimbursed"] = pd.to_numeric(i["InscClaimAmtReimbursed"], errors="coerce")
    i["deductible"] = pd.to_numeric(i["DeductibleAmtPaid"], errors="coerce")
    # +1 because a patient admitted and discharged the same day stays 1 day.
    i["los_days"] = (i["DischargeDt"] - i["AdmissionDt"]).dt.days + 1
    i.loc[i["los_days"] <= 0, "los_days"] = np.nan
    i["n_physicians"] = i[["AttendingPhysician", "OperatingPhysician", "OtherPhysician"]].notna().sum(axis=1)
    i["reimb_per_day"] = i["reimbursed"] / i["los_days"]
    return i


def clean_outpatient(outp: pd.DataFrame) -> pd.DataFrame:
    o = outp.copy()
    for c in ["ClaimStartDt", "ClaimEndDt"]:
        o[c] = pd.to_datetime(o[c], errors="coerce")
    o["reimbursed"] = pd.to_numeric(o["InscClaimAmtReimbursed"], errors="coerce")
    o["deductible"] = pd.to_numeric(o["DeductibleAmtPaid"], errors="coerce")
    return o


def build_claim_fact(tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Gold building block: one row per claim, inpatient and outpatient stacked.

    This is the logical equivalent of FACT_CLAIMS in the star schema.
    """
    inp = clean_inpatient(tables["inp"])
    outp = clean_outpatient(tables["outp"])

    cols = ["ClaimID", "BeneID", "Provider", "ClaimStartDt", "reimbursed", "deductible"]
    ip = inp[cols + ["los_days", "n_physicians", "ClmAdmitDiagnosisCode"]].copy()
    ip["claim_type"] = "Inpatient"
    op = outp[cols + ["ClmAdmitDiagnosisCode"]].copy()
    op["los_days"] = np.nan
    op["n_physicians"] = np.nan
    op["claim_type"] = "Outpatient"

    fact = pd.concat([ip, op], ignore_index=True)
    fact["claim_month"] = fact["ClaimStartDt"].dt.to_period("M").astype(str)
    fact["claim_year"] = fact["ClaimStartDt"].dt.year
    fact["has_deductible"] = (fact["deductible"].fillna(0) > 0).astype(int)
    return fact


def build_provider_features(split: str = "Train") -> pd.DataFrame:
    """Gold: one row per provider = the modelling table for fraud classification.

    Every feature is an aggregate an insurance auditor could actually explain,
    which is what makes the classification defensible at the oral exam.
    """
    t = load_raw(split)
    bene = clean_beneficiary(t["bene"])
    fact = build_claim_fact(t)

    fact = fact.merge(bene[["BeneID", "age", "n_chronic", "is_deceased", "annual_reimb"]], on="BeneID", how="left")

    g = fact.groupby("Provider")
    feats = pd.DataFrame(
        {
            "n_claims": g.size(),
            "n_inpatient": g["claim_type"].apply(lambda s: (s == "Inpatient").sum()),
            "n_outpatient": g["claim_type"].apply(lambda s: (s == "Outpatient").sum()),
            "total_reimbursed": g["reimbursed"].sum(),
            "mean_reimbursed": g["reimbursed"].mean(),
            "std_reimbursed": g["reimbursed"].std(),
            "max_reimbursed": g["reimbursed"].max(),
            "median_reimbursed": g["reimbursed"].median(),
            "total_deductible": g["deductible"].sum(),
            "pct_zero_reimbursed": g["reimbursed"].apply(lambda s: (s.fillna(0) == 0).mean()),
            "n_beneficiaries": g["BeneID"].nunique(),
            "mean_age": g["age"].mean(),
            "mean_n_chronic": g["n_chronic"].mean(),
            "pct_deceased": g["is_deceased"].mean(),
            "mean_los": g["los_days"].mean(),
            "max_los": g["los_days"].max(),
            "pct_with_deductible": g["has_deductible"].mean(),
        }
    )
    # Ratios that expose abusive billing patterns.
    feats["claims_per_beneficiary"] = feats["n_claims"] / feats["n_beneficiaries"]
    feats["reimb_per_beneficiary"] = feats["total_reimbursed"] / feats["n_beneficiaries"]
    feats["reimb_per_claim"] = feats["total_reimbursed"] / feats["n_claims"]
    feats["inpatient_ratio"] = feats["n_inpatient"] / feats["n_claims"]
    feats = feats.reset_index()

    labels = t["labels"].rename(columns={"PotentialFraud": "label_raw"})
    df = labels.merge(feats, on="Provider", how="left")
    df["is_fraud"] = (df["label_raw"] == "Yes").astype(int)
    return df.drop(columns=["label_raw"])


FEATURES = [
    "n_claims",
    "n_inpatient",
    "n_outpatient",
    "total_reimbursed",
    "mean_reimbursed",
    "std_reimbursed",
    "max_reimbursed",
    "median_reimbursed",
    "total_deductible",
    "pct_zero_reimbursed",
    "n_beneficiaries",
    "mean_age",
    "mean_n_chronic",
    "pct_deceased",
    "mean_los",
    "max_los",
    "pct_with_deductible",
    "claims_per_beneficiary",
    "reimb_per_beneficiary",
    "reimb_per_claim",
    "inpatient_ratio",
]
