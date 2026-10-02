"""
CardioWatch Dataset Validation Utility
Validates uploaded heart disease CSVs against expected clinical schemas,
handles common column alias mappings, checks data integrity, and returns clean diagnostics.
"""

from typing import Tuple, Dict, Any, List
import pandas as pd
import numpy as np

# Canonical feature names expected by the model
CANONICAL_NUMERIC = ["age", "trestbps", "chol", "thalach", "oldpeak", "ca"]
CANONICAL_CATEGORICAL = ["sex", "cp", "fbs", "restecg", "exang", "slope", "thal"]
CANONICAL_FEATURES = CANONICAL_NUMERIC + CANONICAL_CATEGORICAL
CANONICAL_TARGET = "target"

# Mapping common column variants to canonical names
COLUMN_ALIASES: Dict[str, str] = {
    "age": "age",
    "patient_age": "age",
    
    "sex": "sex",
    "gender": "sex",
    "sex_desc": "sex_desc",
    
    "cp": "cp",
    "chest_pain": "cp",
    "chest_pain_type": "cp",
    "cp_type": "cp",
    
    "trestbps": "trestbps",
    "resting_bp": "trestbps",
    "blood_pressure": "trestbps",
    "resting_blood_pressure": "trestbps",
    "bp": "trestbps",
    
    "chol": "chol",
    "cholesterol": "chol",
    "serum_chol": "chol",
    "serum_cholesterol": "chol",
    
    "fbs": "fbs",
    "fasting_blood_sugar": "fbs",
    "fasting_bs": "fbs",
    "blood_sugar": "fbs",
    
    "restecg": "restecg",
    "resting_ecg": "restecg",
    "ecg": "restecg",
    
    "thalach": "thalach",
    "max_hr": "thalach",
    "max_heart_rate": "thalach",
    "heart_rate": "thalach",
    
    "exang": "exang",
    "exercise_angina": "exang",
    "exercise_induced_angina": "exang",
    
    "oldpeak": "oldpeak",
    "st_depression": "oldpeak",
    "depression": "oldpeak",
    
    "slope": "slope",
    "st_slope": "slope",
    
    "ca": "ca",
    "num_major_vessels": "ca",
    "major_vessels": "ca",
    "vessels": "ca",
    
    "thal": "thal",
    "thal_type": "thal",
    "thallium": "thal",
    
    "target": "target",
    "num": "target",
    "heart_disease": "target",
    "diagnosis": "target",
    "condition": "target",
    "outcome": "target"
}

def standardize_columns(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, str]]:
    """
    Renames dataframe columns according to known clinical aliases.
    Returns the mapped dataframe and the mapping dict.
    """
    mapped_cols = {}
    df_copy = df.copy()
    
    # Strip spaces and lowercase
    cleaned_col_map = {col: col.strip().lower().replace(" ", "_") for col in df_copy.columns}
    df_copy = df_copy.rename(columns=cleaned_col_map)
    
    for col in df_copy.columns:
        if col in COLUMN_ALIASES:
            canonical = COLUMN_ALIASES[col]
            if canonical not in df_copy.columns or col == canonical:
                mapped_cols[col] = canonical
    
    df_standardized = df_copy.rename(columns=mapped_cols)
    return df_standardized, mapped_cols

def validate_dataset(df: pd.DataFrame) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates the structure and content of an uploaded dataset.
    Returns (is_valid, error_message, metadata_summary).
    """
    if df is None or df.empty:
        return False, "The uploaded file is empty or could not be parsed.", {}

    if len(df) < 5:
        return False, f"The dataset has only {len(df)} rows. A minimum of 5 records is required for clinical analysis.", {}

    standardized_df, mapping = standardize_columns(df)
    
    # Check for missing required features
    missing_features = [col for col in CANONICAL_FEATURES if col not in standardized_df.columns]
    
    # We require at least the top critical features: age, sex, trestbps, chol, thalach
    essential_features = ["age", "sex", "trestbps", "chol", "thalach"]
    missing_essential = [col for col in essential_features if col not in standardized_df.columns]
    
    if missing_essential:
        return False, (
            f"Missing essential clinical columns: {', '.join(missing_essential)}. "
            f"Expected aliases like 'age', 'sex'/'gender', 'trestbps'/'resting_bp', 'chol'/'cholesterol', 'thalach'/'max_hr'."
        ), {}

    # Target presence
    has_target = CANONICAL_TARGET in standardized_df.columns
    
    # Check missing values
    missing_counts = standardized_df.isna().sum().to_dict()
    total_missing = sum(missing_counts.values())
    
    # Compute summary
    summary = {
        "total_rows": len(standardized_df),
        "total_columns": len(standardized_df.columns),
        "has_target": has_target,
        "missing_features": missing_features,
        "mapped_columns": mapping,
        "total_missing_cells": int(total_missing),
        "duplicate_rows": int(standardized_df.duplicated().sum()),
        "columns_present": list(standardized_df.columns)
    }

    return True, "", summary
