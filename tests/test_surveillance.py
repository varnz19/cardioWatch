"""
CardioWatch: Unit Test Suite for ML Surveillance & Auditing Engine
Includes 10 rigorous unit tests for:
- Kolmogorov-Smirnov test (identical vs shifted distributions)
- Population Stability Index (PSI) calculation & binning
- Benjamini-Hochberg FDR multiple-testing correction
- Confusion matrix diagnostic metrics (FNR, Recall, Precision)
- 1,000-resample Bootstrap 95% Confidence Intervals & significance testing
- Statistical power detection sweep monotonicity
- SQLite batch audit repository persistence and retrieval
- Pooled UCI 4-center dataset integrity (n=920, 194 females)
"""

import os
import sys
import numpy as np
import pandas as pd
import pytest
from scipy import stats

# Ensure backend modules are on Python sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from services.drift_service import calculate_psi, run_drift_detection_sweep, analyze_data_drift
from services.fairness_service import bootstrap_cohort_ci, bootstrap_gap_ci, compute_cohort_metrics, analyze_fairness
from services.metrics_service import compute_model_performance
from services.audit_db import record_audit_batch, get_audit_history, init_audit_db
from services.data_loader import get_pooled_uci_dataset, get_reference_dataset


def test_identical_distributions_ks():
    """1. Test that identical distributions yield KS p-value near 1.0 and near-zero statistic."""
    rng = np.random.default_rng(42)
    sample_a = pd.Series(rng.normal(130, 15, size=500))
    sample_b = pd.Series(sample_a.values)  # Exact identical distribution

    stat, pval = stats.ks_2samp(sample_a, sample_b)
    assert stat == 0.0, f"Expected KS stat 0.0 for identical data, got {stat}"
    assert pval == 1.0, f"Expected p-value 1.0 for identical data, got {pval}"


def test_shifted_distributions_ks():
    """2. Test that a 1.0 SD shifted vital sign yields significant KS drift (p < 0.001)."""
    rng = np.random.default_rng(42)
    baseline = pd.Series(rng.normal(130, 15, size=400))
    shifted = pd.Series(rng.normal(130 + 15, 15, size=400))  # 1.0 SD shift

    stat, pval = stats.ks_2samp(baseline, shifted)
    assert stat > 0.30, f"Expected high KS statistic for 1.0 SD shift, got {stat}"
    assert pval < 0.001, f"Expected p-value < 0.001 for 1.0 SD shift, got {pval}"


def test_psi_calculation_thresholds():
    """3. Test PSI calculation: stable distributions give PSI < 0.10, large shifts give PSI >= 0.20."""
    rng = np.random.default_rng(101)
    base = pd.Series(rng.normal(240, 40, size=1000))
    stable = pd.Series(rng.normal(240, 40, size=1000))
    critical = pd.Series(rng.normal(280, 40, size=1000))  # Shifted

    psi_stable = calculate_psi(base, stable)
    psi_critical = calculate_psi(base, critical)

    assert psi_stable["psi"] < 0.10, f"Expected stable PSI < 0.10, got {psi_stable['psi']}"
    assert psi_stable["status"] == "STABLE"

    assert psi_critical["psi"] >= 0.20, f"Expected critical PSI >= 0.20, got {psi_critical['psi']}"
    assert psi_critical["status"] == "CRITICAL_DRIFT"


def test_benjamini_hochberg_correction():
    """4. Test Benjamini-Hochberg FDR multiple testing correction on multiple features."""
    ref_df = pd.DataFrame({
        "age": np.random.normal(54, 9, 300),
        "trestbps": np.random.normal(131, 17, 300),
        "chol": np.random.normal(246, 51, 300),
        "thalach": np.random.normal(149, 23, 300),
        "oldpeak": np.random.exponential(1.0, 300)
    })
    # Target dataset where ONLY chol and oldpeak are intentionally shifted
    curr_df = ref_df.copy()
    curr_df["chol"] = curr_df["chol"] + 40
    curr_df["oldpeak"] = curr_df["oldpeak"] + 2.0

    drift_res = analyze_data_drift(ref_df, curr_df)
    table = drift_res["feature_drift_table"]
    assert len(table) >= 5, "Expected at least 5 features analyzed"

    for row in table:
        assert "p_value_raw" in row
        assert "p_value_adjusted" in row
        assert "ks_statistic" in row
        assert "psi_score" in row
        # Adjusted p-value should never be smaller than raw p-value under BH
        assert row["p_value_adjusted"] >= row["p_value_raw"] - 1e-6


def test_confusion_matrix_fnr_calculation():
    """5. Test exact False Negative Rate (FNR = FN / (TP + FN)) on known confusion matrix."""
    # 80 True Positives, 20 False Negatives -> Actual Positives = 100 -> Recall = 0.80, FNR = 0.20
    # 90 True Negatives, 10 False Positives -> Actual Negatives = 100
    y_true = np.array([1]*100 + [0]*100)
    y_pred = np.array([1]*80 + [0]*20 + [0]*90 + [1]*10)

    perf = compute_model_performance(y_true, y_pred)
    assert perf["recall"] == 0.80, f"Expected recall 0.80, got {perf['recall']}"
    assert perf["false_negative_rate"] == 0.20, f"Expected FNR 0.20, got {perf['false_negative_rate']}"
    assert perf["accuracy"] == 0.85, f"Expected accuracy 0.85, got {perf['accuracy']}"


def test_bootstrap_confidence_intervals():
    """6. Test that 1,000 bootstrap resamples generate valid 95% CIs that bound true metric."""
    y_true = np.array([1]*75 + [0]*25)
    y_pred = np.array([1]*60 + [0]*15 + [0]*20 + [1]*5)

    ci = bootstrap_cohort_ci(y_true, y_pred, n_bootstraps=1000, alpha=0.05, seed=42)

    assert "recall_ci" in ci
    assert "fnr_ci" in ci
    rec_ci = ci["recall_ci"]
    fnr_ci = ci["fnr_ci"]

    assert rec_ci[0] <= 0.80 <= rec_ci[1], f"Point recall 0.80 outside CI {rec_ci}"
    assert fnr_ci[0] <= 0.20 <= fnr_ci[1], f"Point FNR 0.20 outside CI {fnr_ci}"
    assert 0.0 <= rec_ci[0] < rec_ci[1] <= 1.0


def test_bootstrap_gap_significance():
    """7. Test paired disparity gap: identical cohorts include 0 in CI; large disparity excludes 0."""
    # Identical performance cohorts: FNR=0.15 for both
    yt_a = np.array([1]*50 + [0]*50)
    yp_a = np.array([1]*42 + [0]*8 + [0]*45 + [1]*5)
    yt_b = np.array([1]*50 + [0]*50)
    yp_b = np.array([1]*42 + [0]*8 + [0]*45 + [1]*5)

    gap_ci_same, is_sig_same = bootstrap_gap_ci(yt_a, yp_a, yt_b, yp_b, n_bootstraps=1000)
    assert not is_sig_same, "Identical cohorts should NOT be statistically significant"
    assert gap_ci_same[0] <= 0.0 <= gap_ci_same[1], "CI must contain 0 for identical cohorts"

    # Extreme disparity: Cohort A FNR = 0.50 (low recall), Cohort B FNR = 0.05 (high recall)
    yt_bad = np.array([1]*60 + [0]*40)
    yp_bad = np.array([1]*30 + [0]*30 + [0]*35 + [1]*5)  # 30/60 FN -> FNR 0.50
    yt_good = np.array([1]*60 + [0]*40)
    yp_good = np.array([1]*57 + [0]*3 + [0]*35 + [1]*5)   # 3/60 FN -> FNR 0.05

    gap_ci_diff, is_sig_diff = bootstrap_gap_ci(yt_bad, yp_bad, yt_good, yp_good, n_bootstraps=1000)
    assert is_sig_diff, "Significant gap should be detected when disparity is 0.45"
    assert gap_ci_diff[0] > 0.0, f"Expected lower bound > 0 for 45% gap, got {gap_ci_diff}"


def test_drift_power_sweep():
    """8. Test power sweep: increasing SD shifts (0.1, 0.25, 0.5, 1.0) monotonically increase KS effect size."""
    ref_df = pd.DataFrame({"trestbps": np.random.normal(130, 17, 400)})
    sweep = run_drift_detection_sweep(ref_df, feature="trestbps", shifts=[0.10, 0.25, 0.50, 1.00])

    table = sweep["sweep_table"]
    assert len(table) == 4

    ks_stats = [row["ks_statistic"] for row in table]
    assert ks_stats[0] < ks_stats[1] < ks_stats[2] < ks_stats[3], f"KS effect sizes not monotonic: {ks_stats}"

    # 1.0 SD shift should always be detected
    assert table[3]["ks_flagged"] is True
    assert table[3]["detection_consensus"] in ["DETECTED", "PARTIAL"]


def test_audit_db_persistence():
    """9. Test SQLite batch audit database records batches and retrieves historical timeline."""
    init_audit_db()
    batch_name = "test_clinical_batch.csv"
    perf = {"has_performance": True, "accuracy": 0.88, "recall": 0.85, "false_negative_rate": 0.15, "precision": 0.84, "f1_score": 0.84, "roc_auc": 0.92}
    drift = {"overall_status": "Normal", "high_drift_count": 0, "medium_drift_count": 0, "feature_drift_table": []}
    fairness = {"overall_status": "Normal", "max_fnr_gap_points": 4.5, "audits": [{"attribute_type": "Biological Sex", "is_statistically_significant": False}]}

    batch_id = record_audit_batch(batch_name, 150, perf, drift, fairness, is_synthetic=False, generation_notes="Unit test batch")
    assert batch_id.startswith("BATCH-")

    history = get_audit_history(limit=10)
    assert len(history) > 0
    saved_batch = next((b for b in history if b["batch_id"] == batch_id), None)
    assert saved_batch is not None
    assert saved_batch["batch_name"] == batch_name
    assert saved_batch["total_patients"] == 150
    assert saved_batch["accuracy"] == 0.88
    assert saved_batch["is_synthetic"] is False


def test_pooled_uci_dataset_integrity():
    """10. Test pooled UCI 4-center dataset generator yields 920 patients with 194 females and 0 NaNs."""
    pooled = get_pooled_uci_dataset()
    assert len(pooled) == 920, f"Expected 920 rows in pooled dataset, got {len(pooled)}"

    female_count = (pooled["sex"] == 0).sum()
    assert female_count == 194, f"Expected 194 females in pooled dataset, got {female_count}"

    female_positives = ((pooled["sex"] == 0) & (pooled["target"] == 1)).sum()
    assert female_positives == 50, f"Expected 50 female positive cases, got {female_positives}"

    # Critical numeric features must have no unhandled NaNs
    for col in ["trestbps", "chol", "thalach", "oldpeak", "target"]:
        assert pooled[col].isnull().sum() == 0, f"Column {col} contains unhandled NaNs"
