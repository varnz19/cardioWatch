"""
CardioWatch: Data Preprocessing Service
Cleans raw inputs, standardizes data types, handles imputations,
and injects readable clinical metadata.
"""

from typing import Tuple
import pandas as pd
import numpy as np
from utils.validation import standardize_columns, CANONICAL_FEATURES, CANONICAL_NUMERIC, CANONICAL_CATEGORICAL

def preprocess_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans, standardizes, and enriches a clinical dataframe for model inference and analysis.
    """
    clean_df, _ = standardize_columns(df)
    
    # 1. Clean sex column (support 'M', 'F', 'male', 'female', 1, 0)
    if "sex" in clean_df.columns:
        if clean_df["sex"].dtype == object:
            clean_df["sex"] = clean_df["sex"].astype(str).str.lower().str.strip()
            clean_df["sex"] = clean_df["sex"].map({"male": 1, "m": 1, "1": 1, "1.0": 1, "female": 0, "f": 0, "0": 0, "0.0": 0}).fillna(1)
        clean_df["sex"] = pd.to_numeric(clean_df["sex"], errors="coerce").fillna(1).astype(int)
        clean_df["sex_desc"] = clean_df["sex"].map({1: "Male", 0: "Female"}).fillna("Male")
    else:
        clean_df["sex"] = 1
        clean_df["sex_desc"] = "Male"

    # 2. Impute and typecast numeric columns
    for num_col in CANONICAL_NUMERIC:
        if num_col in clean_df.columns:
            clean_df[num_col] = pd.to_numeric(clean_df[num_col], errors="coerce")
            clean_df[num_col] = clean_df[num_col].fillna(clean_df[num_col].median() if not np.isnan(clean_df[num_col].median()) else 0)
        else:
            # Default sensible median clinical values if non-essential column was omitted
            defaults = {"age": 55.0, "trestbps": 130.0, "chol": 240.0, "thalach": 150.0, "oldpeak": 1.0, "ca": 0.0}
            clean_df[num_col] = defaults.get(num_col, 0.0)

    # 3. Impute and typecast categorical columns
    for cat_col in CANONICAL_CATEGORICAL:
        if cat_col == "sex":
            continue
        if cat_col in clean_df.columns:
            clean_df[cat_col] = pd.to_numeric(clean_df[cat_col], errors="coerce")
            clean_df[cat_col] = clean_df[cat_col].fillna(clean_df[cat_col].mode()[0] if len(clean_df[cat_col].mode()) > 0 else 0)
            clean_df[cat_col] = clean_df[cat_col].astype(int)
        else:
            clean_df[cat_col] = 0

    # 4. Target column binarization (if present)
    if "target" in clean_df.columns:
        clean_df["target"] = pd.to_numeric(clean_df["target"], errors="coerce").fillna(0)
        clean_df["target"] = (clean_df["target"] > 0).astype(int)

    # 5. Add human-readable descriptive columns
    cp_map = {1: "Typical Angina", 2: "Atypical Angina", 3: "Non-Anginal Pain", 4: "Asymptomatic"}
    clean_df["cp_desc"] = clean_df["cp"].map(cp_map).fillna("Asymptomatic")
    
    fbs_map = {1: "> 120 mg/dl", 0: "<= 120 mg/dl"}
    clean_df["fbs_desc"] = clean_df["fbs"].map(fbs_map).fillna("<= 120 mg/dl")
    
    restecg_map = {0: "Normal", 1: "ST-T Abnormality", 2: "Left Ventricular Hypertrophy"}
    clean_df["restecg_desc"] = clean_df["restecg"].map(restecg_map).fillna("Normal")
    
    exang_map = {1: "Yes", 0: "No"}
    clean_df["exang_desc"] = clean_df["exang"].map(exang_map).fillna("No")

    # Demographic age bracket
    clean_df["age_group"] = np.where(clean_df["age"] >= 55, "Senior (>=55)", "Younger (<55)")

    return clean_df
