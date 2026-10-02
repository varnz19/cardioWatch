"""
CardioWatch: Demographic Subgroup Fairness Service
Audits clinical classification disparities across Biological Sex and Age brackets,
calculating Equal Opportunity Difference and False Negative Rate gaps.
"""

from typing import Dict, Any, List
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score

def compute_cohort_metrics(df_cohort: pd.DataFrame) -> Dict[str, Any]:
    """Calculates diagnostic metrics for a specific demographic slice."""
    n = len(df_cohort)
    if n == 0 or "target" not in df_cohort.columns:
        return {"sample_size": 0, "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "fnr": 0.0, "fpr": 0.0}

    y_true = df_cohort["target"].values
    y_pred = df_cohort["predicted_outcome"].values

    acc = accuracy_score(y_true, y_pred) if len(np.unique(y_true)) > 0 else 0.0
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    fnr = 1.0 - rec

    negatives = (y_true == 0).sum()
    fp = ((y_true == 0) & (y_pred == 1)).sum()
    fpr = (fp / negatives) if negatives > 0 else 0.0

    return {
        "sample_size": int(n),
        "accuracy": round(float(acc), 3),
        "precision": round(float(prec), 3),
        "recall": round(float(rec), 3),
        "fnr": round(float(fnr), 3),
        "fpr": round(float(fpr), 3)
    }

def analyze_fairness(evaluated_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Performs demographic subgroup fairness audit on evaluated patient dataset.
    """
    if "target" not in evaluated_df.columns or "predicted_outcome" not in evaluated_df.columns:
        return {
            "has_fairness_analysis": False,
            "message": "Ground-truth target column not available for fairness performance auditing."
        }

    fairness_results = []
    
    # 1. Biological Sex Cohort Analysis
    males = evaluated_df[evaluated_df["sex_desc"] == "Male"]
    females = evaluated_df[evaluated_df["sex_desc"] == "Female"]

    male_m = compute_cohort_metrics(males)
    female_m = compute_cohort_metrics(females)

    # Disparities
    sex_recall_gap = abs(male_m["recall"] - female_m["recall"])
    sex_fnr_gap = abs(male_m["fnr"] - female_m["fnr"])

    if sex_fnr_gap > 0.15 or female_m["fnr"] > 0.30:
        sex_status = "Attention"
        sex_msg = "Noticeable performance disparity observed between male and female cohorts."
    elif sex_fnr_gap > 0.08:
        sex_status = "Monitor"
        sex_msg = "Moderate sensitivity variation across biological sex."
    else:
        sex_status = "Normal"
        sex_msg = "Equitable sensitivity observed across biological sex."

    fairness_results.append({
        "attribute_type": "Biological Sex",
        "subgroups": [
            {"group": "Male", **male_m},
            {"group": "Female", **female_m}
        ],
        "equal_opportunity_difference": round(float(sex_recall_gap), 3),
        "fnr_gap": round(float(sex_fnr_gap), 3),
        "gap_percentage_points": round(float(sex_fnr_gap * 100), 1),
        "status": sex_status,
        "observation": sex_msg
    })

    # 2. Age Cohort Analysis (<55 vs >=55)
    younger = evaluated_df[evaluated_df["age_group"] == "Younger (<55)"]
    seniors = evaluated_df[evaluated_df["age_group"] == "Senior (>=55)"]

    younger_m = compute_cohort_metrics(younger)
    senior_m = compute_cohort_metrics(seniors)

    age_recall_gap = abs(younger_m["recall"] - senior_m["recall"])
    age_fnr_gap = abs(younger_m["fnr"] - senior_m["fnr"])

    if age_fnr_gap > 0.15:
        age_status = "Attention"
        age_msg = "Disparity detected between younger and senior patient groups."
    elif age_fnr_gap > 0.08:
        age_status = "Monitor"
        age_msg = "Mild sensitivity divergence between age brackets."
    else:
        age_status = "Normal"
        age_msg = "Balanced sensitivity across age brackets."

    fairness_results.append({
        "attribute_type": "Age Bracket",
        "subgroups": [
            {"group": "Younger (<55)", **younger_m},
            {"group": "Senior (>=55)", **senior_m}
        ],
        "equal_opportunity_difference": round(float(age_recall_gap), 3),
        "fnr_gap": round(float(age_fnr_gap), 3),
        "gap_percentage_points": round(float(age_fnr_gap * 100), 1),
        "status": age_status,
        "observation": age_msg
    })

    overall_status = "Attention" if (sex_status == "Attention" or age_status == "Attention") else (
        "Monitor" if (sex_status == "Monitor" or age_status == "Monitor") else "Normal"
    )

    return {
        "has_fairness_analysis": True,
        "overall_status": overall_status,
        "max_fnr_gap_points": round(max(sex_fnr_gap, age_fnr_gap) * 100, 1),
        "audits": fairness_results
    }
