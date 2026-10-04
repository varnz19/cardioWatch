"""
CardioWatch: Simulated Future Monitoring Service
Generates 5-period longitudinal simulated monitoring cohorts with escalating drift,
evaluates model decay, feature drift, and demographic fairness over time.
"""

from typing import Dict, Any, List
import os
import pandas as pd
import numpy as np

from services.data_loader import get_reference_dataset, OUTPUTS_DIR
from services.preprocessing import preprocess_dataframe
from services.model_service import predict_batch
from services.metrics_service import compute_model_performance
from services.drift_service import analyze_data_drift
from services.fairness_service import analyze_fairness
from utils.validation import CANONICAL_NUMERIC, CANONICAL_CATEGORICAL

def run_future_simulation() -> Dict[str, Any]:
    """
    Simulates Months 1 to 5 from the reference dataset,
    computes multi-period trends, and writes Tableau-ready CSV exports to data/outputs/.
    """
    ref_df = get_reference_dataset()
    ref_clean = preprocess_dataframe(ref_df)

    n_per_batch = 200
    monthly_patient_records = []
    performance_timeline = []
    feature_drift_timeline = []
    fairness_timeline = []

    # Month 0: Baseline Reference Test Set
    ref_preds, ref_probs = predict_batch(ref_clean)
    ref_clean["predicted_outcome"] = ref_preds
    ref_clean["predicted_probability"] = np.round(ref_probs, 4)
    ref_perf = compute_model_performance(ref_clean["target"].values, ref_preds, ref_probs)
    
    performance_timeline.append({
        "period": "Month 0 (Reference)",
        "month_index": 0,
        "is_simulated": False,
        "total_patients": len(ref_clean),
        "accuracy": ref_perf["accuracy"],
        "recall": ref_perf["recall"],
        "precision": ref_perf["precision"],
        "f1_score": ref_perf["f1_score"],
        "roc_auc": ref_perf["roc_auc"],
        "false_positive_rate": ref_perf["false_positive_rate"],
        "false_negative_rate": ref_perf["false_negative_rate"]
    })

    # Add Month 0 to patient records
    for i, row in ref_clean.iterrows():
        actual = int(row["target"])
        pred = int(row["predicted_outcome"])
        if actual == 1 and pred == 1:
            err = "True Positive"
        elif actual == 0 and pred == 0:
            err = "True Negative"
        elif actual == 0 and pred == 1:
            err = "False Positive"
        else:
            err = "False Negative"

        monthly_patient_records.append({
            "patient_id": f"PT-M00-{i+1:04d}",
            "period": "Month 0 (Reference)",
            "month_index": 0,
            "data_origin": "HISTORICAL_BASELINE",
            "age": int(row["age"]),
            "sex": row["sex_desc"],
            "prediction": "Higher Risk" if pred == 1 else "Lower Risk",
            "probability": row["predicted_probability"],
            "actual": "Disease Present" if actual == 1 else "Absence",
            "correct": "Correct" if actual == pred else "Incorrect",
            "error_type": err
        })

    # Simulate Months 1 to 5
    for month in range(1, 6):
        period_label = f"Month {month}"
        
        # 1. Generate Perturbed Cohort
        if month == 1:
            # Stable cohort
            batch = ref_df.sample(n=n_per_batch, replace=True, random_state=100 + month).copy().reset_index(drop=True)
            batch["trestbps"] = np.clip(batch["trestbps"] + np.random.normal(0, 1.5, n_per_batch), 90, 200)
            batch["chol"] = np.clip(batch["chol"] + np.random.normal(0, 2.0, n_per_batch), 120, 500)
        elif month == 2:
            # Mild feature shift (winter BP/cholesterol elevation)
            batch = ref_df.sample(n=n_per_batch, replace=True, random_state=100 + month).copy().reset_index(drop=True)
            batch["trestbps"] = np.clip(batch["trestbps"] * 1.05 + np.random.normal(0, 2, n_per_batch), 90, 205)
            batch["chol"] = np.clip(batch["chol"] * 1.04 + np.random.normal(0, 3, n_per_batch), 120, 520)
            batch["thalach"] = np.clip(batch["thalach"] * 0.97 + np.random.normal(0, 2, n_per_batch), 70, 205)
        elif month == 3:
            # Older demographic shift
            weights = np.where(ref_df["age"] >= 55, 2.6, 0.8)
            weights /= weights.sum()
            batch = ref_df.sample(n=n_per_batch, replace=True, weights=weights, random_state=100 + month).copy().reset_index(drop=True)
            batch["age"] = np.clip(batch["age"] + np.random.normal(3.5, 1.5, n_per_batch), 30, 80)
            batch["thalach"] = np.clip(batch["thalach"] * 0.92 + np.random.normal(0, 3, n_per_batch), 65, 195)
        elif month == 4:
            # Referral shift: high female volume + atypical angina
            weights = np.where(ref_df["sex"] == 0, 2.8, 1.0)
            weights /= weights.sum()
            batch = ref_df.sample(n=n_per_batch, replace=True, weights=weights, random_state=100 + month).copy().reset_index(drop=True)
            female_disease = (batch["sex"] == 0) & (batch["target"] == 1)
            shift_idx = batch[female_disease].sample(frac=0.65, random_state=100 + month).index
            batch.loc[shift_idx, "cp"] = np.random.choice([2, 3], size=len(shift_idx))
            batch["trestbps"] = np.clip(batch["trestbps"] * 1.08 + np.random.normal(0, 3, n_per_batch), 90, 210)
        else:
            # Month 5: Compound multiple feature shift
            weights = np.where((ref_df["age"] >= 55) & (ref_df["chol"] > 240), 3.0, 1.0)
            weights /= weights.sum()
            batch = ref_df.sample(n=n_per_batch, replace=True, weights=weights, random_state=100 + month).copy().reset_index(drop=True)
            batch["age"] = np.clip(batch["age"] + np.random.normal(5.0, 2.0, n_per_batch), 32, 85)
            batch["chol"] = np.clip(batch["chol"] * 1.18 + np.random.normal(0, 5, n_per_batch), 130, 560)
            batch["trestbps"] = np.clip(batch["trestbps"] * 1.14 + np.random.normal(0, 4, n_per_batch), 95, 215)
            batch["thalach"] = np.clip(batch["thalach"] * 0.88 + np.random.normal(0, 3, n_per_batch), 65, 190)

        clean_batch = preprocess_dataframe(batch)
        preds, probs = predict_batch(clean_batch)
        clean_batch["predicted_outcome"] = preds
        clean_batch["predicted_probability"] = np.round(probs, 4)

        # 2. Performance Metrics
        perf = compute_model_performance(clean_batch["target"].values, preds, probs)
        performance_timeline.append({
            "period": period_label,
            "month_index": month,
            "is_simulated": True,
            "total_patients": len(clean_batch),
            "accuracy": perf["accuracy"],
            "recall": perf["recall"],
            "precision": perf["precision"],
            "f1_score": perf["f1_score"],
            "roc_auc": perf["roc_auc"],
            "false_positive_rate": perf["false_positive_rate"],
            "false_negative_rate": perf["false_negative_rate"]
        })

        # 3. Drift Metrics
        drift = analyze_data_drift(ref_clean, clean_batch)
        for d in drift["feature_drift_table"]:
            feature_drift_timeline.append({
                "period": period_label,
                "month_index": month,
                "feature": d["feature"],
                "drift_method": d.get("drift_method", "Two-Sample KS + PSI"),
                "drift_score": d.get("drift_score", d.get("ks_statistic", 0.0)),
                "ks_statistic": d.get("ks_statistic", 0.0),
                "p_value": d.get("p_value", d.get("p_value_raw", 1.0)),
                "p_value_adjusted": d.get("p_value_adjusted", 1.0),
                "psi_score": d.get("psi_score", 0.0),
                "status": d["status"]
            })

        # 4. Fairness Metrics
        fair = analyze_fairness(clean_batch)
        if fair.get("has_fairness_analysis"):
            for audit in fair["audits"]:
                attr = audit["attribute_type"]
                for sub in audit["subgroups"]:
                    fairness_timeline.append({
                        "period": period_label,
                        "month_index": month,
                        "group_type": attr,
                        "group": sub["group"],
                        "accuracy": sub["accuracy"],
                        "precision": sub["precision"],
                        "recall": sub["recall"],
                        "fnr": sub["fnr"],
                        "fpr": sub["fpr"],
                        "gap": audit["fnr_gap"]
                    })

        # 5. Patient records
        for i, row in clean_batch.iterrows():
            actual = int(row["target"])
            pred = int(row["predicted_outcome"])
            if actual == 1 and pred == 1:
                err = "True Positive"
            elif actual == 0 and pred == 0:
                err = "True Negative"
            elif actual == 0 and pred == 1:
                err = "False Positive"
            else:
                err = "False Negative"

            monthly_patient_records.append({
                "patient_id": f"PT-M{month:02d}-{i+1:04d}",
                "period": period_label,
                "month_index": month,
                "data_origin": "SIMULATED_MONITORING_DATA (EDUCATIONAL_USE_ONLY)",
                "age": int(row["age"]),
                "sex": row["sex_desc"],
                "prediction": "Higher Risk" if pred == 1 else "Lower Risk",
                "probability": row["predicted_probability"],
                "actual": "Disease Present" if actual == 1 else "Absence",
                "correct": "Correct" if actual == pred else "Incorrect",
                "error_type": err
            })

    # Save 4 Tableau-ready CSVs to outputs/
    df_perf = pd.DataFrame(performance_timeline)
    df_drift = pd.DataFrame(feature_drift_timeline)
    df_fair = pd.DataFrame(fairness_timeline)
    df_patients = pd.DataFrame(monthly_patient_records)

    df_perf.to_csv(os.path.join(OUTPUTS_DIR, "monthly_performance_kpis.csv"), index=False)
    df_drift.to_csv(os.path.join(OUTPUTS_DIR, "feature_drift_metrics.csv"), index=False)
    df_fair.to_csv(os.path.join(OUTPUTS_DIR, "subgroup_fairness_audit.csv"), index=False)
    df_patients.to_csv(os.path.join(OUTPUTS_DIR, "patient_records_longitudinal.csv"), index=False)

    return {
        "status": "success",
        "message": "Longitudinal simulated monitoring generated successfully across Months 0 to 5.",
        "performance_timeline": performance_timeline,
        "feature_drift_timeline": feature_drift_timeline,
        "fairness_timeline": fairness_timeline,
        "total_simulated_patients": len(monthly_patient_records),
        "tableau_exports": [
            "monthly_performance_kpis.csv",
            "feature_drift_metrics.csv",
            "subgroup_fairness_audit.csv",
            "patient_records_longitudinal.csv"
        ]
    }
