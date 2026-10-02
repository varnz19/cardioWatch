"""
CardioWatch: Data Loader Service
Manages file I/O for reference datasets, uploaded batches, sample files, and outputs.
"""

import os
import shutil
from typing import Optional
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF_DATA_PATH = os.path.join(BASE_DIR, "data", "reference", "heart_disease_reference.csv")
UPLOADS_DIR = os.path.join(BASE_DIR, "data", "uploads")
SAMPLES_DIR = os.path.join(BASE_DIR, "data", "samples")
OUTPUTS_DIR = os.path.join(BASE_DIR, "data", "outputs")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(SAMPLES_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)

def get_reference_dataset() -> pd.DataFrame:
    """Loads the gold-standard UCI Cleveland reference dataset."""
    if not os.path.exists(REF_DATA_PATH):
        raise FileNotFoundError(f"Reference dataset not found at {REF_DATA_PATH}")
    return pd.read_csv(REF_DATA_PATH)

def save_uploaded_file(file_content: bytes, filename: str) -> str:
    """Saves uploaded CSV file to uploads directory and returns absolute path."""
    dest_path = os.path.join(UPLOADS_DIR, filename)
    with open(dest_path, "wb") as f:
        f.write(file_content)
    return dest_path

def generate_sample_datasets():
    """Generates ready-to-test sample datasets in the samples/ folder."""
    ref_df = get_reference_dataset()

    # 1. Stable test sample (n=200, resampled with minimal noise)
    stable_sample = ref_df.sample(n=200, replace=True, random_state=101).copy().reset_index(drop=True)
    stable_sample["trestbps"] = np.clip(stable_sample["trestbps"] + np.random.normal(0, 1.5, 200), 90, 200).round()
    stable_sample["chol"] = np.clip(stable_sample["chol"] + np.random.normal(0, 2.0, 200), 120, 500).round()
    
    # Keep standard column names
    core_cols = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal", "target"]
    stable_export = stable_sample[[c for c in core_cols if c in stable_sample.columns]]
    stable_path = os.path.join(SAMPLES_DIR, "sample_cardio_stable.csv")
    stable_export.to_csv(stable_path, index=False)

    # 2. Drifted test sample (older population, elevated BP/cholesterol, female atypical presentation)
    # Demographic shift: older patients weighted higher
    weights = np.where(ref_df["age"] >= 55, 2.8, 1.0)
    weights /= weights.sum()
    drifted_sample = ref_df.sample(n=200, replace=True, weights=weights, random_state=202).copy().reset_index(drop=True)
    
    drifted_sample["age"] = np.clip(drifted_sample["age"] + np.random.normal(5.0, 2.0, 200), 32, 85).round()
    drifted_sample["trestbps"] = np.clip(drifted_sample["trestbps"] * 1.12 + np.random.normal(0, 3, 200), 95, 215).round()
    drifted_sample["chol"] = np.clip(drifted_sample["chol"] * 1.15 + np.random.normal(0, 4, 200), 130, 560).round()
    drifted_sample["thalach"] = np.clip(drifted_sample["thalach"] * 0.90 + np.random.normal(0, 3, 200), 65, 190).round()
    
    # Atypical presentation in females with disease
    female_disease_mask = (drifted_sample["sex"] == 0) & (drifted_sample["target"] == 1)
    shift_indices = drifted_sample[female_disease_mask].sample(frac=0.60, random_state=42).index
    drifted_sample.loc[shift_indices, "cp"] = np.random.choice([2, 3], size=len(shift_indices))

    drifted_export = drifted_sample[[c for c in core_cols if c in drifted_sample.columns]]
    drifted_path = os.path.join(SAMPLES_DIR, "sample_cardio_drifted.csv")
    drifted_export.to_csv(drifted_path, index=False)

    print(f"[DataLoader] Generated sample test datasets in {SAMPLES_DIR}")

# Initialize sample datasets on module import if missing
if not os.path.exists(os.path.join(SAMPLES_DIR, "sample_cardio_stable.csv")):
    try:
        generate_sample_datasets()
    except Exception as e:
        print("[DataLoader] Note on sample generation:", e)
