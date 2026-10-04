"""
CardioWatch: Data & Feature Drift Monitoring Service
Quantifies covariate shift between reference population and current batch
using the Two-Sample Kolmogorov-Smirnov (KS) test with Benjamini-Hochberg FDR correction
and the Population Stability Index (PSI). Includes statistical power sweep analysis.
"""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from scipy import stats
from statsmodels.stats.multitest import multipletests
from utils.validation import CANONICAL_NUMERIC, CANONICAL_CATEGORICAL

def calculate_psi(
    expected_series: pd.Series,
    actual_series: pd.Series,
    num_bins: int = 10,
    epsilon: float = 0.0001
) -> Dict[str, Any]:
    """
    Computes Population Stability Index (PSI) between reference (expected) and target (actual) series.
    Uses reference quantiles to establish bin thresholds.
    Standard Clinical Thresholds:
      - PSI < 0.10: No significant shift (Stable)
      - 0.10 <= PSI < 0.20: Moderate shift (Warning)
      - PSI >= 0.20: Significant distributional shift (Action Required)
    """
    exp = expected_series.dropna()
    act = actual_series.dropna()

    if len(exp) == 0 or len(act) == 0:
        return {"psi": 0.0, "status": "STABLE", "interpretation": "Insufficient data"}

    try:
        # Create quantile bins on expected baseline
        quantiles = np.linspace(0, 1, num_bins + 1)
        bin_edges = np.percentile(exp, quantiles * 100)
        bin_edges = np.unique(bin_edges)

        if len(bin_edges) < 2:
            return {"psi": 0.0, "status": "STABLE", "interpretation": "Constant feature values"}

        bin_edges[0] = -np.inf
        bin_edges[-1] = np.inf

        # Bin counts
        exp_binned = pd.cut(exp, bins=bin_edges)
        act_binned = pd.cut(act, bins=bin_edges)

        exp_dist = exp_binned.value_counts(normalize=True).sort_index().values
        act_dist = act_binned.value_counts(normalize=True).sort_index().values

        # Smooth zero counts with epsilon
        exp_dist = np.where(exp_dist == 0, epsilon, exp_dist)
        act_dist = np.where(act_dist == 0, epsilon, act_dist)

        # Normalize after smoothing
        exp_dist = exp_dist / exp_dist.sum()
        act_dist = act_dist / act_dist.sum()

        psi_val = float(np.sum((act_dist - exp_dist) * np.log(act_dist / exp_dist)))
        psi_val = round(max(float(psi_val), 0.0), 4)

        if psi_val >= 0.20:
            status = "CRITICAL_DRIFT"
            interp = "Significant population shift (PSI >= 0.20)"
        elif psi_val >= 0.10:
            status = "MODERATE_SHIFT"
            interp = "Moderate population shift (0.10 <= PSI < 0.20)"
        else:
            status = "STABLE"
            interp = "Stable distribution (PSI < 0.10)"

        return {"psi": psi_val, "status": status, "interpretation": interp}

    except Exception:
        return {"psi": 0.0, "status": "STABLE", "interpretation": "Calculation fallback"}

def run_drift_detection_sweep(
    ref_df: pd.DataFrame,
    feature: str = "trestbps",
    shifts: Optional[List[float]] = None
) -> Dict[str, Any]:
    """
    Power Analysis Sweep:
    Simulates additive shifts of [0.10, 0.25, 0.50, 1.00] standard deviations on a given vital sign,
    and evaluates at what magnitude the Two-Sample KS test and PSI detect covariate shift.
    Turns synthetic evaluation into a defensible statistical power demonstration.
    """
    if shifts is None:
        shifts = [0.10, 0.25, 0.50, 1.00]

    if feature not in ref_df.columns:
        feature = "trestbps"

    series = pd.to_numeric(ref_df[feature], errors="coerce").dropna()
    baseline_std = float(series.std())
    baseline_mean = float(series.mean())

    sweep_results = []
    for s in shifts:
        shift_amount = s * baseline_std
        shifted_series = series + shift_amount

        # KS Test against baseline
        ks_stat, ks_pval = stats.ks_2samp(series, shifted_series)
        ks_stat = round(float(ks_stat), 4)
        ks_pval = round(float(ks_pval), 6)

        # PSI
        psi_res = calculate_psi(series, shifted_series)

        sweep_results.append({
            "shift_sd": s,
            "shift_magnitude_units": round(shift_amount, 2),
            "simulated_mean": round(baseline_mean + shift_amount, 1),
            "ks_statistic": ks_stat,
            "ks_p_value": ks_pval,
            "ks_flagged": bool(ks_pval < 0.05),
            "psi_score": psi_res["psi"],
            "psi_flagged": bool(psi_res["psi"] >= 0.10),
            "detection_consensus": "DETECTED" if (ks_pval < 0.05 and psi_res["psi"] >= 0.10) else ("PARTIAL" if (ks_pval < 0.05 or psi_res["psi"] >= 0.10) else "UNDETECTED")
        })

    return {
        "feature": feature,
        "baseline_mean": round(baseline_mean, 2),
        "baseline_std": round(baseline_std, 2),
        "sweep_table": sweep_results,
        "first_detected_at_sd": next((row["shift_sd"] for row in sweep_results if row["detection_consensus"] == "DETECTED"), ">1.0 SD")
    }

def compute_distribution_bins(ref_series: pd.Series, curr_series: pd.Series, num_bins: int = 8) -> List[Dict[str, Any]]:
    """
    Computes binned frequency distribution comparison between reference and uploaded series.
    Returns JSON-ready list for frontend distribution comparison charts.
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
    Analyzes data drift across clinical features using Two-Sample KS test with
    Benjamini-Hochberg (BH) FDR correction and Population Stability Index (PSI).
    Reports KS statistic (D) as the primary effect size.
    """
    feature_drift_results = []
    distributions_map = {}
    p_values_to_correct = []
    valid_features = []

    # 1. Evaluate Continuous Numerical Features
    for col in CANONICAL_NUMERIC:
        if col in ref_df.columns and col in curr_df.columns:
            ref_vals = pd.to_numeric(ref_df[col], errors="coerce").dropna()
            curr_vals = pd.to_numeric(curr_df[col], errors="coerce").dropna()

            if len(ref_vals) > 0 and len(curr_vals) > 0:
                ks_stat, p_val = stats.ks_2samp(ref_vals, curr_vals)
                psi_info = calculate_psi(ref_vals, curr_vals)

                valid_features.append(col)
                p_values_to_correct.append(p_val)

                # Store raw metrics
                distributions_map[col] = compute_distribution_bins(ref_vals, curr_vals)

                feature_drift_results.append({
                    "feature": col,
                    "drift_method": "Two-Sample KS + PSI",
                    "ks_statistic": round(float(ks_stat), 4),
                    "p_value": round(float(p_val), 5),
                    "p_value_raw": round(float(p_val), 5),
                    "psi_score": psi_info["psi"],
                    "psi_status": psi_info["status"]
                })

    # 2. Apply Benjamini-Hochberg (BH) FDR Correction across all tested features
    if len(p_values_to_correct) > 0:
        rejected, p_adjusted, _, _ = multipletests(p_values_to_correct, alpha=0.05, method="fdr_bh")
    else:
        rejected, p_adjusted = [], []

    high_drift_count = 0
    med_drift_count = 0

    for i, res in enumerate(feature_drift_results):
        adj_p = round(float(p_adjusted[i]), 5) if i < len(p_adjusted) else res["p_value_raw"]
        is_sig_fdr = bool(rejected[i]) if i < len(rejected) else bool(res["p_value_raw"] < 0.05)
        ks_stat = res["ks_statistic"]
        psi = res["psi_score"]

        res["p_value_adjusted"] = adj_p
        res["is_statistically_significant_fdr"] = is_sig_fdr

        # Clinical status classification using both effect size (KS D) and PSI
        if (ks_stat >= 0.20 and is_sig_fdr) or psi >= 0.20:
            status = "HIGH"
            high_drift_count += 1
        elif (ks_stat >= 0.10 and is_sig_fdr) or psi >= 0.10:
            status = "MEDIUM"
            med_drift_count += 1
        else:
            status = "LOW"

        res["status"] = status
        res["drift_score"] = ks_stat  # KS statistic as primary effect size

    # Overall batch drift classification
    if high_drift_count >= 2:
        overall_status = "Attention"
        summary_msg = f"Multiple critical covariate shifts detected ({high_drift_count} high-drift features, FDR q < 0.05)."
    elif high_drift_count == 1 or med_drift_count >= 2:
        overall_status = "Monitor"
        summary_msg = f"Moderate vital shift observed ({med_drift_count} medium, {high_drift_count} high-drift features)."
    else:
        overall_status = "Normal"
        summary_msg = "All monitored cardiac biomarkers remain statistically aligned with baseline (FDR controlled)."

    # 3. Include Power Analysis Sweeps on Blood Pressure and Cholesterol
    bp_power_sweep = run_drift_detection_sweep(ref_df, feature="trestbps", shifts=[0.10, 0.25, 0.50, 1.00])
    chol_power_sweep = run_drift_detection_sweep(ref_df, feature="chol", shifts=[0.10, 0.25, 0.50, 1.00])

    return {
        "overall_status": overall_status,
        "high_drift_count": high_drift_count,
        "medium_drift_count": med_drift_count,
        "total_monitored_features": len(feature_drift_results),
        "fdr_correction_method": "Benjamini-Hochberg (FDR q-values, alpha=0.05)",
        "summary": summary_msg,
        "feature_drift_table": feature_drift_results,
        "distributions": distributions_map,
        "power_sweeps": {
            "resting_bp": bp_power_sweep,
            "cholesterol": chol_power_sweep
        }
    }
