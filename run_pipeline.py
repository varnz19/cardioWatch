"""
CardioWatch: Master End-to-End Execution Pipeline
Runs data ingestion, baseline modeling, 5-month longitudinal drift simulation,
statistical drift testing, fairness audits, and automated validation plots.
"""

import os
import sys
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np

# Ensure src is on python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from data_loader import load_and_clean_data
from train_baseline import train_and_evaluate_baseline
from drift_simulator import generate_monthly_cohorts
from audit_engine import run_audit

REPORTS_DIR = os.path.join(os.path.dirname(__file__), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

def generate_validation_plots(perf_df: pd.DataFrame, drift_df: pd.DataFrame, fairness_df: pd.DataFrame, patient_df: pd.DataFrame):
    """Generates high-resolution diagnostic charts saved into reports/."""
    print("\n[VisualValidator] Generating summary audit charts...")
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")

    # 1. Performance Trajectory Plot
    fig, ax = plt.subplots(figsize=(10, 5), dpi=300)
    months = perf_df["time_period"]
    ax.plot(months, perf_df["accuracy"], marker="o", linewidth=2.5, label="Accuracy", color="#1f77b4")
    ax.plot(months, perf_df["recall"], marker="s", linewidth=2.5, label="Recall (Sensitivity)", color="#2ca02c")
    ax.plot(months, perf_df["precision"], marker="^", linewidth=2, linestyle="--", label="Precision", color="#9467bd")
    ax.plot(months, perf_df["fnr"], marker="x", linewidth=2.5, label="False Negative Rate (FNR)", color="#d62728")

    # Clinical safety threshold line
    ax.axhline(0.80, color="#2ca02c", linestyle=":", alpha=0.7, label="Clinical Sensitivity Target (0.80)")
    ax.axhline(0.20, color="#d62728", linestyle=":", alpha=0.7, label="Max Acceptable FNR (0.20)")

    ax.set_title("CardioWatch: Longitudinal Model Performance & Diagnostic Error Decay", fontsize=13, fontweight="bold", pad=12)
    ax.set_ylabel("Metric Score", fontsize=11)
    ax.set_xlabel("Operational Time Period", fontsize=11)
    ax.set_ylim(0.0, 1.05)
    ax.legend(loc="lower left", frameon=True)
    plt.xticks(rotation=15)
    plt.tight_layout()
    chart1_path = os.path.join(REPORTS_DIR, "01_model_performance_decay.png")
    plt.savefig(chart1_path)
    plt.close()
    print(f"  -> Saved performance trend chart: {chart1_path}")

    # 2. Feature Drift Heatmap
    drift_pivot = drift_df.pivot(index="feature_name", columns="time_period", values="drift_score")
    month_order = [f"Month {i}" for i in range(1, 6)]
    drift_pivot = drift_pivot.reindex(columns=month_order)

    fig, ax = plt.subplots(figsize=(9, 6), dpi=300)
    cax = ax.matshow(drift_pivot.values, cmap="YlOrRd", vmin=0.0, vmax=0.45)
    fig.colorbar(cax)

    ax.set_xticks(range(len(drift_pivot.columns)))
    ax.set_yticks(range(len(drift_pivot.index)))
    ax.set_xticklabels(drift_pivot.columns, fontsize=10)
    ax.set_yticklabels(drift_pivot.index, fontsize=10)

    # Annotate values
    for i in range(len(drift_pivot.index)):
        for j in range(len(drift_pivot.columns)):
            val = drift_pivot.iloc[i, j]
            text_color = "white" if val > 0.25 else "black"
            ax.text(j, i, f"{val:.3f}", ha="center", va="center", color=text_color, fontweight="bold", fontsize=9)

    ax.set_title("CardioWatch: Feature Drift Matrix (KS-Statistic / PSI Scores)", fontsize=13, fontweight="bold", pad=20)
    plt.tight_layout()
    chart2_path = os.path.join(REPORTS_DIR, "02_feature_drift_heatmap.png")
    plt.savefig(chart2_path)
    plt.close()
    print(f"  -> Saved feature drift heatmap: {chart2_path}")

    # 3. Demographic Fairness & FNR Disparity Plot
    sex_fair = fairness_df[fairness_df["attribute_type"] == "Biological Sex"]
    male_data = sex_fair[sex_fair["subgroup"] == "Male"].sort_values("month_index")
    female_data = sex_fair[sex_fair["subgroup"] == "Female"].sort_values("month_index")

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5), dpi=300)

    # Plot 3A: Recall Comparison
    ax1.plot(male_data["time_period"], male_data["group_recall"], marker="o", color="#1f77b4", linewidth=2.5, label="Male Recall")
    ax1.plot(female_data["time_period"], female_data["group_recall"], marker="s", color="#ff7f0e", linewidth=2.5, label="Female Recall")
    ax1.fill_between(male_data["time_period"], male_data["group_recall"], female_data["group_recall"], color="#ff7f0e", alpha=0.15, label="Fairness Gap (Disparity)")
    ax1.set_title("Equal Opportunity Audit: Recall by Biological Sex", fontsize=11, fontweight="bold")
    ax1.set_ylabel("Recall Score", fontsize=10)
    ax1.set_ylim(0.4, 1.05)
    ax1.legend(loc="lower left")
    ax1.tick_params(axis="x", rotation=20)

    # Plot 3B: Critical False Negative Rate (FNR)
    ax2.plot(male_data["time_period"], male_data["group_fnr"], marker="o", color="#1f77b4", linewidth=2.5, label="Male FNR")
    ax2.plot(female_data["time_period"], female_data["group_fnr"], marker="s", color="#d62728", linewidth=2.5, label="Female FNR (Critical Harm)")
    ax2.axhline(0.20, color="gray", linestyle="--", alpha=0.7, label="Acceptable FNR Cap (0.20)")
    ax2.set_title("Clinical Risk: False Negative Rate by Sex", fontsize=11, fontweight="bold")
    ax2.set_ylabel("False Negative Rate", fontsize=10)
    ax2.set_ylim(0.0, 0.50)
    ax2.legend(loc="upper left")
    ax2.tick_params(axis="x", rotation=20)

    plt.suptitle("CardioWatch: Longitudinal Fairness Audit & Gender Disparity Monitoring", fontsize=13, fontweight="bold", y=1.02)
    plt.tight_layout()
    chart3_path = os.path.join(REPORTS_DIR, "03_subgroup_fairness_disparity.png")
    plt.savefig(chart3_path, bbox_inches="tight")
    plt.close()
    print(f"  -> Saved fairness disparity chart: {chart3_path}")

def main():
    print("\n" + "=" * 75)
    print("        CARDIOWATCH: LAUNCHING COMPLETE PRODUCTION PIPELINE")
    print("=" * 75)

    # Step 1: Clean Raw Dataset
    print("\n>>> STEP 1: Ingesting & Cleaning UCI Clinical Data...")
    clean_df = load_and_clean_data()

    # Step 2: Baseline Model Training
    print("\n>>> STEP 2: Training Calibrated Random Forest Model on Month 0...")
    rf_pipeline, master_df, test_ref, baseline_metrics = train_and_evaluate_baseline()

    # Step 3: Drift Simulation
    print("\n>>> STEP 3: Simulating 5 Progressive Monthly Patient Cohorts...")
    sim_df = generate_monthly_cohorts(clean_df, n_per_month=250)

    # Step 4: Statistical Drift & Fairness Audit Engine
    print("\n>>> STEP 4: Executing KS-Test, PSI, and Demographic Fairness Auditing...")
    patient_records, perf_df, drift_df, fairness_df = run_audit()

    # Step 5: Visual Validation Charts
    generate_validation_plots(perf_df, drift_df, fairness_df, patient_records)

    # Step 6: Summary Report
    print("\n" + "=" * 75)
    print("                      CARDIOWATCH SUMMARY RESULTS")
    print("=" * 75)
    print("\n1. Longitudinal Performance Degradation:")
    print(perf_df[["time_period", "total_patients", "accuracy", "recall", "precision", "fnr"]].to_string(index=False))

    print("\n2. Top Drifting Features by Month:")
    high_drifts = drift_df[drift_df["drift_status"].str.contains("High|Critical")][["time_period", "feature_name", "metric_type", "drift_score", "drift_status"]]
    if len(high_drifts) > 0:
        print(high_drifts.to_string(index=False))
    else:
        print("  No critical high drift detected.")

    print("\n3. Subgroup Fairness Disparities (Biological Sex):")
    sex_fair = fairness_df[fairness_df["attribute_type"] == "Biological Sex"][["time_period", "subgroup", "sample_size", "group_recall", "group_fnr", "fairness_gap", "fairness_status"]]
    print(sex_fair.to_string(index=False))

    print("\n" + "=" * 75)
    print(" CARDIOWATCH PIPELINE RUN COMPLETED SUCCESSFULLY!")
    print(" Processed CSV outputs for Tableau located in: data/processed/")
    print(" Diagnostic visual reports located in: reports/")
    print("=" * 75 + "\n")

if __name__ == "__main__":
    main()
