"""
CardioWatch: Data & Feature Drift Monitoring Service
Quantifies covariate shift between the reference population and current intake
using the Two-Sample Kolmogorov-Smirnov (KS) test and Population Stability Index (PSI).
"""

from typing import Dict, Any, List
import numpy as np
import pandas as pd
from scipy import stats
from utils.validation import CANONICAL_NUMERIC, CANONICAL_CATEGORICAL

def calculate_psi(ref_series: pd.Series, curr_series: pd.Series, bins: int = 5) -> float:
    """Calculates Population Stability Index between reference and current samples."""
    ref_clean = ref_series.dropna()
    curr_clean = curr_series.dropna()
    
    unique_vals = sorted(list(set(ref_clean.unique()).union(set(curr_clean.unique()))))
    if len(unique_vals) <= bins:
        ref_counts = ref_clean.value_counts(normalize=True).reindex(unique_vals, fill_value=0.0001)
        curr_counts = curr_clean.value_counts(normalize=True).reindex(unique_vals, fill_value=0.0001)
    else:
        try:
            _, bin_edges = pd.qcut(ref_clean, q=bins, retbins=True, duplicates="drop")
            bin_edges[0] = -np.inf
            bin_edges[-1] = np.inf
            ref_binned = pd.cut(ref_clean, bins=bin_edges)
            curr_binned = pd.cut(curr_clean, bins=bin_edges)
            ref_counts = ref_binned.value_counts(normalize=True).replace(0, 0.0001)
            curr_counts = curr_binned.value_counts(normalize=True).replace(0, 0.0001)
        except Exception:
            return 0.0

    psi_val = np.sum((curr_counts - ref_counts) * np.log(curr_counts / ref_counts))
    return float(np.round(np.clip(psi_val, 0, 5.0), 4))

def compute_distribution_bins(ref_series: pd.Series, curr_series: pd.Series, num_bins: int = 8) -> List[Dict[str, Any]]:
    """
    Computes binned frequency distribution comparison between reference and uploaded series.
    Returns JSON-ready list for frontend bar/area comparison charts.
    """
    combined = pd.concat([ref_series.dropna(), curr_series.dropna()])
    if len(combined) == 0:
        return []

    min_val, max_val = float(combined.min()), float(combined.max())
    if min_val == max_val:
        return [{"bin_label": str(min_val), "reference_pct": 100.0, "current_pct": 100.0}]

    bins = np.linspace(min_val, max_val, num_bins + 1)
    
    ref_hist, _ = np.histogram(ref_series.dropna(), bins=bins)
    curr_hist, _ = np.histogram(curr_series.dropna(), bins=bins)

    ref_pct = (ref_hist / len(ref_series.dropna())) * 100 if len(ref_series.dropna()) > 0 else np.zeros_like(ref_hist)
    curr_pct = (curr_hist / len(curr_series.dropna())) * 100 if len(curr_series.dropna()) > 0 else np.zeros_like(curr_hist)

    distribution_data = []
    for i in range(len(ref_hist)):
        label = f"{int(bins[i])}-{int(bins[i+1])}" if max_val > 10 else f"{bins[i]:.1f}-{bins[i+1]:.1f}"
        distribution_data.append({
            "bin_label": label,
            "reference_pct": round(float(ref_pct[i]), 1),
            "current_pct": round(float(curr_pct[i]), 1)
        })

    return distribution_data

def analyze_data_drift(ref_df: pd.DataFrame, curr_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Analyzes data drift across all clinical features.
    """
    feature_drift_results = []
    high_drift_count = 0
    med_drift_count = 0

    distributions_map = {}

    # 1. Analyze Continuous Numerical Features (Two-Sample KS-Test)
    for col in CANONICAL_NUMERIC:
        if col in ref_df.columns and col in curr_df.columns:
            ref_vals = pd.to_numeric(ref_df[col], errors="coerce").dropna()
            curr_vals = pd.to_numeric(curr_df[col], errors="coerce").dropna()

            if len(ref_vals) > 0 and len(curr_vals) > 0:
                ks_stat, p_val = stats.ks_2samp(ref_vals, curr_vals)
                ks_stat = float(np.round(ks_stat, 4))
                p_val = float(np.round(p_val, 5))

                if ks_stat >= 0.20:
                    status = "HIGH"
                    high_drift_count += 1
                elif ks_stat >= 0.10:
                    status = "MEDIUM"
                    med_drift_count += 1
                else:
                    status = "LOW"

                feature_drift_results.append({
                    "feature": col,
                    "feature_type": "Continuous",
                    "drift_method": "KS-Test",
                    "drift_score": ks_stat,
                    "p_value": p_val,
                    "status": status,
                    "reference_mean": round(float(ref_vals.mean()), 1),
                    "current_mean": round(float(curr_vals.mean()), 1),
                    "mean_difference": round(float(curr_vals.mean() - ref_vals.mean()), 1)
                })

                distributions_map[col] = compute_distribution_bins(ref_vals, curr_vals)

    # 2. Analyze Categorical Features (PSI)
    for col in CANONICAL_CATEGORICAL:
        if col in ref_df.columns and col in curr_df.columns:
            ref_vals = ref_df[col].dropna()
            curr_vals = curr_df[col].dropna()

            if len(ref_vals) > 0 and len(curr_vals) > 0:
                psi_val = calculate_psi(ref_vals, curr_vals)

                if psi_val >= 0.25:
                    status = "HIGH"
                    high_drift_count += 1
                elif psi_val >= 0.10:
                    status = "MEDIUM"
                    med_drift_count += 1
                else:
                    status = "LOW"

                p_val_approx = 0.001 if psi_val >= 0.10 else 0.50

                feature_drift_results.append({
                    "feature": col,
                    "feature_type": "Categorical",
                    "drift_method": "PSI",
                    "drift_score": psi_val,
                    "p_value": p_val_approx,
                    "status": status,
                    "reference_mean": round(float(ref_vals.mean()), 2),
                    "current_mean": round(float(curr_vals.mean()), 2),
                    "mean_difference": round(float(curr_vals.mean() - ref_vals.mean()), 2)
                })

                distributions_map[col] = compute_distribution_bins(ref_vals, curr_vals, num_bins=4)

    # Sort results by drift score descending
    feature_drift_results.sort(key=lambda x: x["drift_score"], reverse=True)

    # Determine overall population drift health
    if high_drift_count >= 2 or (high_drift_count >= 1 and med_drift_count >= 2):
        overall_status = "Attention"
        summary_msg = f"Significant population drift detected across {high_drift_count} features. Clinical recalibration suggested."
    elif high_drift_count == 1 or med_drift_count >= 2:
        overall_status = "Monitor"
        summary_msg = "Moderate population shift observed. Monitor incoming batches closely."
    else:
        overall_status = "Normal"
        summary_msg = "Patient population distribution remains consistent with reference cohort."

    return {
        "overall_status": overall_status,
        "summary_message": summary_msg,
        "high_drift_count": high_drift_count,
        "medium_drift_count": med_drift_count,
        "features_analyzed_count": len(feature_drift_results),
        "feature_drift_table": feature_drift_results,
        "distributions": distributions_map
    }
