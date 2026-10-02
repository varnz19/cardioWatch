"""
CardioWatch: Longitudinal Patient Drift Simulation Engine
Simulates 5 progressive monthly cohorts of incoming patient evaluations
reflecting controlled demographic, physiological, and clinical symptom shifts.
"""

import os
import pandas as pd
import numpy as np

SIM_OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "simulated_monthly_cohorts.csv")

def generate_monthly_cohorts(clean_df: pd.DataFrame, n_per_month: int = 250, random_state: int = 42) -> pd.DataFrame:
    """
    Synthesizes 5 sequential monthly cohorts from the empirical clinical dataset.
    Applies statistically controlled distribution perturbations to simulate real-world drift.
    """
    np.random.seed(random_state)
    monthly_dfs = []

    # Map helpers for descriptions
    cp_map = {1: "Typical Angina", 2: "Atypical Angina", 3: "Non-Anginal Pain", 4: "Asymptomatic"}
    sex_map = {1: "Male", 0: "Female"}
    fbs_map = {1: "> 120 mg/dl", 0: "<= 120 mg/dl"}
    restecg_map = {0: "Normal", 1: "ST-T Abnormality", 2: "Left Ventricular Hypertrophy"}
    exang_map = {1: "Yes", 0: "No"}
    slope_map = {1: "Upsloping", 2: "Flat", 3: "Downsloping"}
    thal_map = {3: "Normal", 6: "Fixed Defect", 7: "Reversible Defect"}

    for month in range(1, 6):
        month_label = f"Month {month}"
        
        # Base resample from historical pool
        if month == 1:
            # Month 1: Control / Stable deployment
            # Direct bootstrap with tiny measurement variation (1%)
            batch = clean_df.sample(n=n_per_month, replace=True, random_state=random_state + month).copy().reset_index(drop=True)
            noise_bp = np.random.normal(0, 1.5, size=n_per_month)
            noise_chol = np.random.normal(0, 2.0, size=n_per_month)
            batch["trestbps"] = np.clip(batch["trestbps"] + noise_bp, 90, 200)
            batch["chol"] = np.clip(batch["chol"] + noise_chol, 120, 500)

        elif month == 2:
            # Month 2: Mild Lifestyle & Seasonal Shift (Winter elevation in BP and Chol)
            batch = clean_df.sample(n=n_per_month, replace=True, random_state=random_state + month).copy().reset_index(drop=True)
            # BP +5%, Chol +4%, Max HR -3%
            batch["trestbps"] = np.clip(batch["trestbps"] * 1.05 + np.random.normal(0, 2, n_per_month), 90, 205)
            batch["chol"] = np.clip(batch["chol"] * 1.04 + np.random.normal(0, 3, n_per_month), 120, 520)
            batch["thalach"] = np.clip(batch["thalach"] * 0.97 + np.random.normal(0, 2, n_per_month), 70, 205)

        elif month == 3:
            # Month 3: Demographic Aging Shift
            # Weight older patients higher (shift age distribution upward)
            weights = np.where(clean_df["age"] >= 55, 2.5, 0.8)
            weights = weights / weights.sum()
            batch = clean_df.sample(n=n_per_month, replace=True, weights=weights, random_state=random_state + month).copy().reset_index(drop=True)
            
            # Aging effects: lower max heart rate, slight increase in oldpeak
            batch["age"] = np.clip(batch["age"] + np.random.normal(3.5, 1.5, n_per_month), 30, 80)
            batch["thalach"] = np.clip(batch["thalach"] * 0.92 + np.random.normal(0, 3, n_per_month), 65, 195)
            batch["oldpeak"] = np.clip(batch["oldpeak"] * 1.15 + np.random.normal(0.1, 0.1, n_per_month), 0, 6.5)

        elif month == 4:
            # Month 4: Clinical Presentation & Demographic Gender Shift
            # Major influx of female cardiac patients (increase female to ~55%)
            weights = np.where(clean_df["sex"] == 0, 2.8, 1.0)
            weights = weights / weights.sum()
            batch = clean_df.sample(n=n_per_month, replace=True, weights=weights, random_state=random_state + month).copy().reset_index(drop=True)

            # For female patients with disease, simulate atypical symptom presentation
            # In clinical reality, women with ischemic heart disease often present with atypical or non-anginal chest pain
            female_disease_mask = (batch["sex"] == 0) & (batch["target"] == 1)
            # Reassign chest pain to 2 (Atypical) or 3 (Non-Anginal) for 65% of these cases
            shift_indices = batch[female_disease_mask].sample(frac=0.65, random_state=random_state + month).index
            batch.loc[shift_indices, "cp"] = np.random.choice([2, 3], size=len(shift_indices))

            # Blood pressure elevated +8%
            batch["trestbps"] = np.clip(batch["trestbps"] * 1.08 + np.random.normal(0, 3, n_per_month), 90, 210)

        elif month == 5:
            # Month 5: Severe Multi-Attribute Stress Drift (High Comorbidity / High Acuity Intake)
            weights = np.where((clean_df["age"] >= 55) & (clean_df["chol"] > 240), 3.0, 1.0)
            weights = weights / weights.sum()
            batch = clean_df.sample(n=n_per_month, replace=True, weights=weights, random_state=random_state + month).copy().reset_index(drop=True)

            # Severe physiological shifts
            batch["age"] = np.clip(batch["age"] + np.random.normal(5.0, 2.0, n_per_month), 32, 85)
            batch["chol"] = np.clip(batch["chol"] * 1.18 + np.random.normal(0, 5, n_per_month), 130, 560)
            batch["trestbps"] = np.clip(batch["trestbps"] * 1.14 + np.random.normal(0, 4, n_per_month), 95, 215)
            batch["thalach"] = np.clip(batch["thalach"] * 0.88 + np.random.normal(0, 3, n_per_month), 65, 190)
            
            # Increase resting ECG abnormalities
            ecg_shift_idx = batch.sample(frac=0.25, random_state=random_state + month).index
            batch.loc[ecg_shift_idx, "restecg"] = np.random.choice([1, 2], size=len(ecg_shift_idx))

        # Round continuous features to integer / realistic decimals
        batch["age"] = np.round(batch["age"]).astype(int)
        batch["trestbps"] = np.round(batch["trestbps"]).astype(int)
        batch["chol"] = np.round(batch["chol"]).astype(int)
        batch["thalach"] = np.round(batch["thalach"]).astype(int)
        batch["oldpeak"] = np.round(batch["oldpeak"], 2)
        batch["cp"] = batch["cp"].astype(int)
        batch["sex"] = batch["sex"].astype(int)
        batch["restecg"] = batch["restecg"].astype(int)

        # Update descriptive labels
        batch["time_period"] = month_label
        batch["month_index"] = month
        batch["patient_id"] = [f"PT-M{month:02d}-{i+1:04d}" for i in range(len(batch))]
        batch["data_origin"] = "SIMULATED_MONITORING_DATA (EDUCATIONAL_USE_ONLY)"
        batch["age_group"] = np.where(batch["age"] >= 55, "Senior (>=55)", "Younger (<55)")
        batch["cp_desc"] = batch["cp"].map(cp_map).fillna("Asymptomatic")
        batch["sex_desc"] = batch["sex"].map(sex_map).fillna("Male")
        batch["fbs_desc"] = batch["fbs"].map(fbs_map).fillna("<= 120 mg/dl")
        batch["restecg_desc"] = batch["restecg"].map(restecg_map).fillna("Normal")
        batch["exang_desc"] = batch["exang"].map(exang_map).fillna("No")
        batch["slope_desc"] = batch["slope"].map(slope_map).fillna("Flat")
        batch["thal_desc"] = batch["thal"].map(thal_map).fillna("Normal")

        monthly_dfs.append(batch)

    all_simulated = pd.concat(monthly_dfs, ignore_index=True)
    os.makedirs(os.path.dirname(SIM_OUTPUT_PATH), exist_ok=True)
    all_simulated.to_csv(SIM_OUTPUT_PATH, index=False)
    print(f"[DriftSimulator] Successfully generated {len(all_simulated)} simulated patient records across Months 1-5.")
    print(f"[DriftSimulator] Saved to {SIM_OUTPUT_PATH}")
    return all_simulated

if __name__ == "__main__":
    from data_loader import load_and_clean_data
    df = load_and_clean_data()
    sim_df = generate_monthly_cohorts(df)
    print("\nBatch Counts per Month:")
    print(sim_df["time_period"].value_counts().sort_index())
