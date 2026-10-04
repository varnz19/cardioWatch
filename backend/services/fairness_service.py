"""
CardioWatch: Defensible Demographic Subgroup Fairness Service
Audits clinical classification disparities across Biological Sex and Age cohorts.
Computes Bootstrap 95% Confidence Intervals (1,000 resamples) for Recall and FNR per group,
evaluates the paired disparity gap, and reports statistical significance honestly.
"""

from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score

def bootstrap_cohort_ci(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    n_bootstraps: int = 1000,
    alpha: float = 0.05,
    seed: int = 42
) -> Dict[str, List[float]]:
    """
    Computes empirical 95% Bootstrap Confidence Intervals for diagnostic metrics.
    Uses 1,000 resamples with replacement via NumPy.
    """
    n = len(y_true)
    if n == 0 or np.sum(y_true == 1) == 0:
        return {
            "recall_ci": [0.0, 0.0],
            "fnr_ci": [0.0, 0.0],
            "accuracy_ci": [0.0, 0.0],
            "precision_ci": [0.0, 0.0]
        }

    rng = np.random.default_rng(seed)
    boot_recalls = []
    boot_fnrs = []
    boot_accs = []
    boot_precs = []

    for _ in range(n_bootstraps):
        idx = rng.choice(n, size=n, replace=True)
        yt = y_true[idx]
        yp = y_pred[idx]

        # Accuracy
        boot_accs.append(float(np.mean(yt == yp)))

        # Precision
        pred_pos = (yp == 1).sum()
        prec = float(((yt == 1) & (yp == 1)).sum() / pred_pos) if pred_pos > 0 else 0.0
        boot_precs.append(prec)

        # Recall and FNR
        actual_pos = (yt == 1).sum()
        if actual_pos > 0:
            rec = float(((yt == 1) & (yp == 1)).sum() / actual_pos)
            boot_recalls.append(rec)
            boot_fnrs.append(1.0 - rec)

    if len(boot_recalls) == 0:
        return {
            "recall_ci": [0.0, 0.0],
            "fnr_ci": [0.0, 0.0],
            "accuracy_ci": [0.0, 0.0],
            "precision_ci": [0.0, 0.0]
        }

    lower_p = 100 * (alpha / 2.0)
    upper_p = 100 * (1.0 - alpha / 2.0)

    return {
        "recall_ci": [round(float(np.percentile(boot_recalls, lower_p)), 3), round(float(np.percentile(boot_recalls, upper_p)), 3)],
        "fnr_ci": [round(float(np.percentile(boot_fnrs, lower_p)), 3), round(float(np.percentile(boot_fnrs, upper_p)), 3)],
        "accuracy_ci": [round(float(np.percentile(boot_accs, lower_p)), 3), round(float(np.percentile(boot_accs, upper_p)), 3)],
        "precision_ci": [round(float(np.percentile(boot_precs, lower_p)), 3), round(float(np.percentile(boot_precs, upper_p)), 3)]
    }

def bootstrap_gap_ci(
    y_true_a: np.ndarray,
    y_pred_a: np.ndarray,
    y_true_b: np.ndarray,
    y_pred_b: np.ndarray,
    n_bootstraps: int = 1000,
    alpha: float = 0.05,
    seed: int = 42
) -> Tuple[List[float], bool]:
    """
    Computes 95% Confidence Interval for the disparity gap: (FNR_A - FNR_B).
    Returns [ci_lower, ci_upper] and is_statistically_significant (True if 0 is outside CI).
    """
    n_a = len(y_true_a)
    n_b = len(y_true_b)
    if n_a == 0 or n_b == 0 or np.sum(y_true_a == 1) == 0 or np.sum(y_true_b == 1) == 0:
        return [0.0, 0.0], False

    rng = np.random.default_rng(seed)
    boot_gaps = []

    for _ in range(n_bootstraps):
        idx_a = rng.choice(n_a, size=n_a, replace=True)
        idx_b = rng.choice(n_b, size=n_b, replace=True)

        yt_a, yp_a = y_true_a[idx_a], y_pred_a[idx_a]
        yt_b, yp_b = y_true_b[idx_b], y_pred_b[idx_b]

        pos_a = (yt_a == 1).sum()
        pos_b = (yt_b == 1).sum()

        if pos_a > 0 and pos_b > 0:
            rec_a = float(((yt_a == 1) & (yp_a == 1)).sum() / pos_a)
            rec_b = float(((yt_b == 1) & (yp_b == 1)).sum() / pos_b)
            fnr_a = 1.0 - rec_a
            fnr_b = 1.0 - rec_b
            boot_gaps.append(fnr_a - fnr_b)

    if len(boot_gaps) == 0:
        return [0.0, 0.0], False

    lower_p = 100 * (alpha / 2.0)
    upper_p = 100 * (1.0 - alpha / 2.0)
    ci_lower = round(float(np.percentile(boot_gaps, lower_p)), 3)
    ci_upper = round(float(np.percentile(boot_gaps, upper_p)), 3)

    # If the 95% confidence interval for the difference excludes zero, the gap is statistically significant
    is_significant = not (ci_lower <= 0.0 <= ci_upper)

    return [ci_lower, ci_upper], is_significant

def compute_cohort_metrics(df_cohort: pd.DataFrame) -> Dict[str, Any]:
    """Calculates diagnostic point estimates and 95% bootstrap CIs for a demographic slice."""
    n = len(df_cohort)
    if n == 0 or "target" not in df_cohort.columns:
        return {
            "sample_size": 0,
            "positive_cases": 0,
            "accuracy": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "fnr": 0.0,
            "fpr": 0.0,
            "recall_ci": [0.0, 0.0],
            "fnr_ci": [0.0, 0.0],
            "ci_display": "N/A"
        }

    y_true = df_cohort["target"].values.astype(int)
    y_pred = df_cohort["predicted_outcome"].values.astype(int)

    acc = accuracy_score(y_true, y_pred) if len(np.unique(y_true)) > 0 else 0.0
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    fnr = 1.0 - rec

    negatives = (y_true == 0).sum()
    fp = ((y_true == 0) & (y_pred == 1)).sum()
    fpr = (fp / negatives) if negatives > 0 else 0.0
    positives = int((y_true == 1).sum())

    # 95% Bootstrap Confidence Intervals (1,000 resamples)
    boot_ci = bootstrap_cohort_ci(y_true, y_pred, n_bootstraps=1000)

    fnr_ci = boot_ci["fnr_ci"]
    rec_ci = boot_ci["recall_ci"]
    ci_display = f"FNR {fnr:.2f} [{fnr_ci[0]:.2f} – {fnr_ci[1]:.2f}]"

    return {
        "sample_size": int(n),
        "positive_cases": positives,
        "accuracy": round(float(acc), 3),
        "precision": round(float(prec), 3),
        "recall": round(float(rec), 3),
        "fnr": round(float(fnr), 3),
        "fpr": round(float(fpr), 3),
        "recall_ci": rec_ci,
        "fnr_ci": fnr_ci,
        "ci_display": ci_display
    }

def analyze_fairness(evaluated_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Performs rigorous demographic subgroup fairness audit on evaluated patient dataset.
    Uses 1,000 bootstrap resamples to establish defensible confidence intervals.
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

    # Paired gap analysis
    sex_fnr_gap = abs(male_m["fnr"] - female_m["fnr"])
    sex_recall_gap = abs(male_m["recall"] - female_m["recall"])

    gap_ci, is_sig = bootstrap_gap_ci(
        females["target"].values.astype(int) if len(females) > 0 else np.array([]),
        females["predicted_outcome"].values.astype(int) if len(females) > 0 else np.array([]),
        males["target"].values.astype(int) if len(males) > 0 else np.array([]),
        males["predicted_outcome"].values.astype(int) if len(males) > 0 else np.array([]),
        n_bootstraps=1000
    )

    total_n = len(males) + len(females)
    sig_text = "statistically significant (p < 0.05)" if is_sig else "not statistically significant (95% CI contains 0, p > 0.05)"
    honest_summary = (
        f"Female FNR {female_m['fnr']:.2f} [{female_m['fnr_ci'][0]:.2f}–{female_m['fnr_ci'][1]:.2f}] vs "
        f"Male FNR {male_m['fnr']:.2f} [{male_m['fnr_ci'][0]:.2f}–{male_m['fnr_ci'][1]:.2f}]: "
        f"gap of {sex_fnr_gap:.2f} [{gap_ci[0]:.2f} to {gap_ci[1]:.2f}] is {sig_text} at n={total_n}."
    )

    if is_sig and sex_fnr_gap > 0.15:
        sex_status = "Attention"
    elif sex_fnr_gap > 0.08:
        sex_status = "Monitor"
    else:
        sex_status = "Normal"

    fairness_results.append({
        "attribute_type": "Biological Sex",
        "subgroups": [
            {"group": "Male", **male_m},
            {"group": "Female", **female_m}
        ],
        "equal_opportunity_difference": round(float(sex_recall_gap), 3),
        "fnr_gap": round(float(sex_fnr_gap), 3),
        "fnr_gap_ci": gap_ci,
        "is_statistically_significant": is_sig,
        "gap_percentage_points": round(float(sex_fnr_gap * 100), 1),
        "status": sex_status,
        "observation": honest_summary
    })

    # 2. Age Cohort Analysis (<55 vs >=55)
    younger = evaluated_df[evaluated_df["age_group"] == "Younger (<55)"]
    seniors = evaluated_df[evaluated_df["age_group"] == "Senior (>=55)"]

    younger_m = compute_cohort_metrics(younger)
    senior_m = compute_cohort_metrics(seniors)

    age_fnr_gap = abs(younger_m["fnr"] - senior_m["fnr"])
    age_recall_gap = abs(younger_m["recall"] - senior_m["recall"])

    age_gap_ci, age_is_sig = bootstrap_gap_ci(
        seniors["target"].values.astype(int) if len(seniors) > 0 else np.array([]),
        seniors["predicted_outcome"].values.astype(int) if len(seniors) > 0 else np.array([]),
        younger["target"].values.astype(int) if len(younger) > 0 else np.array([]),
        younger["predicted_outcome"].values.astype(int) if len(younger) > 0 else np.array([]),
        n_bootstraps=1000
    )

    age_total_n = len(younger) + len(seniors)
    age_sig_text = "statistically significant (p < 0.05)" if age_is_sig else "not statistically significant (95% CI contains 0, p > 0.05)"
    age_honest_summary = (
        f"Senior FNR {senior_m['fnr']:.2f} [{senior_m['fnr_ci'][0]:.2f}–{senior_m['fnr_ci'][1]:.2f}] vs "
        f"Younger FNR {younger_m['fnr']:.2f} [{younger_m['fnr_ci'][0]:.2f}–{younger_m['fnr_ci'][1]:.2f}]: "
        f"gap of {age_fnr_gap:.2f} [{age_gap_ci[0]:.2f} to {age_gap_ci[1]:.2f}] is {age_sig_text} at n={age_total_n}."
    )

    if age_is_sig and age_fnr_gap > 0.15:
        age_status = "Attention"
    elif age_fnr_gap > 0.08:
        age_status = "Monitor"
    else:
        age_status = "Normal"

    fairness_results.append({
        "attribute_type": "Age Bracket",
        "subgroups": [
            {"group": "Younger (<55)", **younger_m},
            {"group": "Senior (>=55)", **senior_m}
        ],
        "equal_opportunity_difference": round(float(age_recall_gap), 3),
        "fnr_gap": round(float(age_fnr_gap), 3),
        "fnr_gap_ci": age_gap_ci,
        "is_statistically_significant": age_is_sig,
        "gap_percentage_points": round(float(age_fnr_gap * 100), 1),
        "status": age_status,
        "observation": age_honest_summary
    })

    overall_status = "Attention" if (sex_status == "Attention" or age_status == "Attention") else (
        "Monitor" if (sex_status == "Monitor" or age_status == "Monitor") else "Normal"
    )

    return {
        "has_fairness_analysis": True,
        "methodology": "Bootstrap Empirical 95% Confidence Intervals (1,000 resamples, alpha=0.05)",
        "overall_status": overall_status,
        "max_fnr_gap_points": round(max(sex_fnr_gap, age_fnr_gap) * 100, 1),
        "audits": fairness_results
    }
