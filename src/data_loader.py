"""
CardioWatch: Data Loader & Cleaner Module
Loads the raw UCI Heart Disease dataset, handles clinical codes,
imputes missing attributes, and formats human-readable features.
"""

import os
import pandas as pd
import numpy as np

RAW_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "processed.cleveland.data")
CLEAN_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "raw", "heart_disease_clean.csv")

COLUMN_NAMES = [
    "age", "sex", "cp", "trestbps", "chol", "fbs", 
    "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal", "num"
]

def load_and_clean_data(raw_path: str = RAW_DATA_PATH) -> pd.DataFrame:
    """
    Ingests the raw UCI Cleveland dataset, imputes missing values,
    maps clinical categorical codes to standard descriptions,
    and returns a clean pandas DataFrame.
    """
    if not os.path.exists(raw_path):
        raise FileNotFoundError(f"Raw dataset not found at {raw_path}")

    # Read data with '?' treated as NaN
    df = pd.read_csv(raw_path, names=COLUMN_NAMES, na_values="?")

    # 1. Target Binarization: 0 = No Heart Disease, 1..4 = Presence of Heart Disease
    df["target"] = (df["num"] > 0).astype(int)

    # 2. Impute missing values (ca has 4 missing, thal has 2 missing)
    df["ca"] = df["ca"].fillna(df["ca"].median())
    df["thal"] = df["thal"].fillna(df["thal"].mode()[0])

    # 3. Create descriptive readable categories for clinical reporting
    # Chest pain: 1=typical angina, 2=atypical angina, 3=non-anginal, 4=asymptomatic
    cp_map = {
        1: "Typical Angina",
        2: "Atypical Angina",
        3: "Non-Anginal Pain",
        4: "Asymptomatic"
    }
    df["cp_desc"] = df["cp"].map(cp_map).fillna("Unknown")

    # Sex: 1=Male, 0=Female
    df["sex_desc"] = df["sex"].map({1: "Male", 0: "Female"})

    # Fasting blood sugar
    df["fbs_desc"] = df["fbs"].map({1: "> 120 mg/dl", 0: "<= 120 mg/dl"})

    # Resting ECG
    restecg_map = {
        0: "Normal",
        1: "ST-T Abnormality",
        2: "Left Ventricular Hypertrophy"
    }
    df["restecg_desc"] = df["restecg"].map(restecg_map).fillna("Normal")

    # Exercise induced angina
    df["exang_desc"] = df["exang"].map({1: "Yes", 0: "No"})

    # Slope of peak exercise ST segment
    slope_map = {
        1: "Upsloping",
        2: "Flat",
        3: "Downsloping"
    }
    df["slope_desc"] = df["slope"].map(slope_map).fillna("Flat")

    # Thallium stress test
    thal_map = {
        3: "Normal",
        6: "Fixed Defect",
        7: "Reversible Defect"
    }
    df["thal_desc"] = df["thal"].map(thal_map).fillna("Normal")

    # 4. Demographic Age Grouping
    df["age_group"] = np.where(df["age"] >= 55, "Senior (>=55)", "Younger (<55)")

    # Save cleaned version
    df.to_csv(CLEAN_DATA_PATH, index=False)
    print(f"[DataLoader] Successfully cleaned {len(df)} records. Saved to {CLEAN_DATA_PATH}")
    return df

if __name__ == "__main__":
    df = load_and_clean_data()
    print("[DataLoader] Preview:")
    print(df[["age", "sex_desc", "cp_desc", "trestbps", "chol", "thalach", "target"]].head())
