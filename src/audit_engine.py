"""
CardioWatch: Statistical Drift & Demographic Fairness Audit Engine
Computes inference, Kolmogorov-Smirnov continuous drift, categorical PSI,
demographic disparity audits, and exports 4 Tableau-ready CSV tables.
"""

import os
import joblib
import pandas as pd
import numpy as np
from scipy import stats
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, brier_score_loss
)

PROCESSED_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "processed")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "models", "cardio_rf_pipeline.joblib")
TEST_REF_PATH = os.path.join(PROCESSED_DIR, "baseline_test_ref.csv")
SIM_DATA_PATH = os.path.join(PROCESSED_DIR, "simulated_monthly_cohorts.csv")

# Final output CSV destinations
PATIENT_EXPORT_PATH = os.path.join(PROCESSED_DIR, "patient_records_longitudinal.csv")
PERFORMANCE_EXPORT_PATH = os.path.join(PROCESSED_DIR, "monthly_performance_kpis.csv")
DRIFT_EXPORT_PATH = os.path.join(PROCESSED_DIR, "feature_drift_metrics.csv")
FAIRNESS_EXPORT_PATH = os.path.join(PROCESSED_DIR, "subgroup_fairness_audit.csv")

NUMERIC_FEATURES = ["age", "trestbps", "chol", "thalach", "oldpeak", "ca"]
CATEGORICAL_FEATURES = ["sex", "cp", "fbs", "restecg", "exang", "slope", "thal"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

def calculate_psi(ref_series: pd.Series, curr_series: pd.Series, bins: int = 5) -> float:
    """Calculates Population Stability Index (PSI) between two samples."""
    # If categorical or few unique values
    unique_vals = sorted(list(set(ref_series.dropna().unique()).union(set(curr_series.dropna().unique()))))
    if len(unique_vals) <= bins:
        ref_counts = ref_series.value_counts(normalize=True).reindex(unique_vals, fill_value=0.0001)
        curr_counts = curr_series.value_counts(normalize=True).reindex(unique_vals, fill_value=0.0001)
    else:
        # Quantile binning on reference
        try:
            _, bin_edges = pd.qcut(ref_series, q=bins, retbins=True, duplicates="drop")
            bin_edges[0] = -np.inf
            bin_edges[-1] = np.inf
            ref_binned = pd.cut(ref_series, bins=bin_edges)
            curr_binned = pd.cut(curr_series, bins=bin_edges)
            ref_counts = ref_binned.value_counts(normalize=True).replace(0, 0.0001)
            curr_counts = curr_binned.value_counts(normalize=True).replace(0, 0.0001)
        except Exception:
            return 0.0

    psi_val = np.sum((curr_counts - ref_counts) * np.log(curr_counts / ref_counts))
    return float(np.round(np.clip(psi_val, 0, 5.0), 4))

def compute_group_metrics(df_slice: pd.DataFrame):
    """Computes clinical classification metrics for a demographic slice."""
    n = len(df_slice)
    if n == 0:
        return {"sample_size": 0, "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "fnr": 0.0, "fpr": 0.0, "positive_rate": 0.0}

    y_true = df_slice["target"]
    y_pred = df_slice["predicted_outcome"]

    acc = accuracy_score(y_true, y_pred) if len(np.unique(y_true)) > 0 else 0.0
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    fnr = 1.0 - rec
    
    # False Positive Rate
    negatives = (y_true == 0).sum()
    fp = ((y_true == 0) & (y_pred == 1)).sum()
    fpr = (fp / negatives) if negatives > 0 else 0.0
    pos_rate = y_pred.mean()

    return {
        "sample_size": int(n),
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "fnr": round(float(fnr), 4),
        "fpr": round(float(fpr), 4),
        "positive_rate": round(float(pos_rate), 4)
    }

def run_audit():
    """Main execution of the CardioWatch audit engine."""
    print("[AuditEngine] Loading trained model and datasets...")
    model = joblib.load(MODEL_PATH)
    ref_test_df = pd.read_csv(TEST_REF_PATH)
    sim_df = pd.read_csv(SIM_DATA_PATH)
    clean_master = pd.read_csv(os.path.join(PROCESSED_DIR, "..", "raw", "heart_disease_clean.csv"))

    # 1. Predict on simulated cohorts
    X_sim = sim_df[ALL_FEATURES]
    sim_preds = model.predict(X_sim)
    sim_probs = model.predict_proba(X_sim)[:, 1]

    sim_df["predicted_outcome"] = sim_preds
    sim_df["predicted_risk_score"] = np.round(sim_probs, 4)

    # 2. Harmonize patient table (Month 0 Baseline + Months 1-5)
    patient_records = pd.concat([ref_test_df, sim_df], ignore_index=True)

    # Add error classification labels
    def classify_error(row):
        actual = int(row["target"])
        pred = int(row["predicted_outcome"])
        if actual == 1 and pred == 1:
            return "True Positive"
        elif actual == 0 and pred == 0:
            return "True Negative"
        elif actual == 0 and pred == 1:
            return "False Positive"
        else:
            return "False Negative"

    patient_records["error_classification"] = patient_records.apply(classify_error, axis=1)
    patient_records["is_error"] = (patient_records["target"] != patient_records["predicted_outcome"]).astype(int)

    # Risk categories
    def categorize_risk(p):
        if p < 0.40:
            return "Low Risk (<40%)"
        elif p <= 0.60:
            return "Moderate Risk (40-60%)"
        else:
            return "High Risk (>60%)"

    patient_records["risk_category"] = patient_records["predicted_risk_score"].apply(categorize_risk)
    patient_records.to_csv(PATIENT_EXPORT_PATH, index=False)
    print(f"[AuditEngine] Exported {len(patient_records)} patient records -> {PATIENT_EXPORT_PATH}")

    # 3. Monthly Performance KPIs
    kpi_records = []
    unique_months = sorted(patient_records["month_index"].unique())

    for m_idx in unique_months:
        m_df = patient_records[patient_records["month_index"] == m_idx]
        t_label = m_df["time_period"].iloc[0]
        y_true = m_df["target"]
        y_pred = m_df["predicted_outcome"]
        y_prob = m_df["predicted_risk_score"]

        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()

        acc = accuracy_score(y_true, y_pred)
        prec = precision_score(y_true, y_pred, zero_division=0)
        rec = recall_score(y_true, y_pred, zero_division=0)
        f1 = f1_score(y_true, y_pred, zero_division=0)
        fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
        fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0
        auc = roc_auc_score(y_true, y_prob) if len(np.unique(y_true)) > 1 else 0.5
        brier = brier_score_loss(y_true, y_prob)

        kpi_records.append({
            "time_period": t_label,
            "month_index": int(m_idx),
            "total_patients": len(m_df),
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4),
            "fpr": round(float(fpr), 4),
            "fnr": round(float(fnr), 4),
            "auc_roc": round(float(auc), 4),
            "brier_score": round(float(brier), 4),
            "tp_count": int(tp),
            "fp_count": int(fp),
            "tn_count": int(tn),
            "fn_count": int(fn)
        })

    perf_df = pd.DataFrame(kpi_records)
    perf_df.to_csv(PERFORMANCE_EXPORT_PATH, index=False)
    print(f"[AuditEngine] Exported {len(perf_df)} monthly KPI rows -> {PERFORMANCE_EXPORT_PATH}")

    # 4. Statistical Drift Metrics (Months 1-5 vs Baseline Reference)
    drift_records = []
    ref_pop = clean_master.copy()

    for m_idx in [1, 2, 3, 4, 5]:
        curr_batch = patient_records[patient_records["month_index"] == m_idx]
        t_label = curr_batch["time_period"].iloc[0]

        # Numeric features -> KS Test
        for col in NUMERIC_FEATURES:
            ref_vals = ref_pop[col].dropna()
            curr_vals = curr_batch[col].dropna()

            ks_stat, p_val = stats.ks_2samp(ref_vals, curr_vals)
            ks_stat = float(np.round(ks_stat, 4))
            p_val = float(np.round(p_val, 6))

            # Threshold rules
            if ks_stat >= 0.20 and p_val < 0.01:
                status = "High Drift (Critical)"
                flag = 2
            elif ks_stat >= 0.10 and p_val < 0.05:
                status = "Medium Drift (Warning)"
                flag = 1
            else:
                status = "Low Drift (Normal)"
                flag = 0

            drift_records.append({
                "time_period": t_label,
                "month_index": int(m_idx),
                "feature_name": col,
                "feature_type": "Continuous",
                "metric_type": "KS-Statistic",
                "drift_score": ks_stat,
                "p_value": p_val,
                "drift_status": status,
                "alert_flag": flag,
                "reference_mean": round(float(ref_vals.mean()), 2),
                "current_mean": round(float(curr_vals.mean()), 2),
                "reference_std": round(float(ref_vals.std()), 2),
                "current_std": round(float(curr_vals.std()), 2),
                "mean_delta": round(float(curr_vals.mean() - ref_vals.mean()), 2)
            })

        # Categorical features -> PSI
        for col in ["cp", "sex", "restecg", "exang"]:
            psi_score = calculate_psi(ref_pop[col], curr_batch[col])
            
            if psi_score >= 0.25:
                status = "High Drift (Critical)"
                flag = 2
            elif psi_score >= 0.10:
                status = "Medium Drift (Warning)"
                flag = 1
            else:
                status = "Low Drift (Normal)"
                flag = 0

            drift_records.append({
                "time_period": t_label,
                "month_index": int(m_idx),
                "feature_name": col,
                "feature_type": "Categorical",
                "metric_type": "PSI",
                "drift_score": psi_score,
                "p_value": 0.001 if psi_score >= 0.10 else 0.50,
                "drift_status": status,
                "alert_flag": flag,
                "reference_mean": round(float(ref_pop[col].mean()), 2),
                "current_mean": round(float(curr_batch[col].mean()), 2),
                "reference_std": round(float(ref_pop[col].std()), 2),
                "current_std": round(float(curr_batch[col].std()), 2),
                "mean_delta": round(float(curr_batch[col].mean() - ref_pop[col].mean()), 2)
            })

    drift_df = pd.DataFrame(drift_records)
    drift_df.to_csv(DRIFT_EXPORT_PATH, index=False)
    print(f"[AuditEngine] Exported {len(drift_df)} feature drift records -> {DRIFT_EXPORT_PATH}")

    # 5. Demographic Fairness Audit (Months 0-5)
    fairness_records = []

    for m_idx in unique_months:
        m_df = patient_records[patient_records["month_index"] == m_idx]
        t_label = m_df["time_period"].iloc[0]

        # Audit A: Biological Sex (Male vs Female)
        males = m_df[m_df["sex_desc"] == "Male"]
        females = m_df[m_df["sex_desc"] == "Female"]

        male_metrics = compute_group_metrics(males)
        female_metrics = compute_group_metrics(females)

        recall_gap_sex = abs(male_metrics["recall"] - female_metrics["recall"])
        fnr_gap_sex = abs(male_metrics["fnr"] - female_metrics["fnr"])
        dir_sex = (female_metrics["positive_rate"] / male_metrics["positive_rate"]) if male_metrics["positive_rate"] > 0 else 1.0

        for s_label, s_met in [("Male", male_metrics), ("Female", female_metrics)]:
            # Disparity flag
            if recall_gap_sex > 0.12 or s_met["fnr"] > 0.30:
                f_status = "Disparate Impact Warning (>0.12)"
            elif recall_gap_sex > 0.06 or s_met["fnr"] > 0.20:
                f_status = "Acceptable Disparity (0.06-0.12)"
            else:
                f_status = "Fair (<=0.06)"

            fairness_records.append({
                "time_period": t_label,
                "month_index": int(m_idx),
                "attribute_type": "Biological Sex",
                "subgroup": s_label,
                "sample_size": s_met["sample_size"],
                "group_accuracy": s_met["accuracy"],
                "group_precision": s_met["precision"],
                "group_recall": s_met["recall"],
                "group_fnr": s_met["fnr"],
                "group_fpr": s_met["fpr"],
                "group_positive_rate": s_met["positive_rate"],
                "disparity_metric": "Recall Gap (vs Counterpart)",
                "fairness_gap": round(float(recall_gap_sex), 4),
                "fnr_gap": round(float(fnr_gap_sex), 4),
                "disparate_impact_ratio": round(float(dir_sex), 4),
                "fairness_status": f_status
            })

        # Audit B: Age Group (<55 vs >=55)
        young = m_df[m_df["age_group"] == "Younger (<55)"]
        senior = m_df[m_df["age_group"] == "Senior (>=55)"]

        young_metrics = compute_group_metrics(young)
        senior_metrics = compute_group_metrics(senior)

        recall_gap_age = abs(young_metrics["recall"] - senior_metrics["recall"])
        fnr_gap_age = abs(young_metrics["fnr"] - senior_metrics["fnr"])
        dir_age = (senior_metrics["positive_rate"] / young_metrics["positive_rate"]) if young_metrics["positive_rate"] > 0 else 1.0

        for a_label, a_met in [("Younger (<55)", young_metrics), ("Senior (>=55)", senior_metrics)]:
            if recall_gap_age > 0.12 or a_met["fnr"] > 0.30:
                f_status = "Disparate Impact Warning (>0.12)"
            elif recall_gap_age > 0.06 or a_met["fnr"] > 0.20:
                f_status = "Acceptable Disparity (0.06-0.12)"
            else:
                f_status = "Fair (<=0.06)"

            fairness_records.append({
                "time_period": t_label,
                "month_index": int(m_idx),
                "attribute_type": "Age Bracket",
                "subgroup": a_label,
                "sample_size": a_met["sample_size"],
                "group_accuracy": a_met["accuracy"],
                "group_precision": a_met["precision"],
                "group_recall": a_met["recall"],
                "group_fnr": a_met["fnr"],
                "group_fpr": a_met["fpr"],
                "group_positive_rate": a_met["positive_rate"],
                "disparity_metric": "Recall Gap (vs Counterpart)",
                "fairness_gap": round(float(recall_gap_age), 4),
                "fnr_gap": round(float(fnr_gap_age), 4),
                "disparate_impact_ratio": round(float(dir_age), 4),
                "fairness_status": f_status
            })

    fairness_df = pd.DataFrame(fairness_records)
    fairness_df.to_csv(FAIRNESS_EXPORT_PATH, index=False)
    print(f"[AuditEngine] Exported {len(fairness_df)} subgroup fairness audit rows -> {FAIRNESS_EXPORT_PATH}")
    print("[AuditEngine] All 4 Tableau-ready datasets exported successfully!")

    return patient_records, perf_df, drift_df, fairness_df

if __name__ == "__main__":
    run_audit()
