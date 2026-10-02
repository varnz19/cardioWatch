"""
CardioWatch: Model Management Service
Handles training, serialization, feature importance extraction, batch inference,
and single-patient clinical risk scoring.
"""

import os
import warnings
import joblib
import pandas as pd
import numpy as np

warnings.filterwarnings("ignore")
from typing import Dict, Any, Tuple
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

from services.data_loader import get_reference_dataset
from services.preprocessing import preprocess_dataframe
from utils.validation import CANONICAL_NUMERIC, CANONICAL_CATEGORICAL

ALL_FEATURES = CANONICAL_NUMERIC + CANONICAL_CATEGORICAL

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
os.makedirs(MODEL_DIR, exist_ok=True)
MODEL_PATH = os.path.join(MODEL_DIR, "cardio_rf_pipeline.joblib")
LR_MODEL_PATH = os.path.join(MODEL_DIR, "cardio_lr_pipeline.joblib")

_model_cache = None
_lr_cache = None

def build_preprocessor() -> ColumnTransformer:
    """Constructs column transformer for clinical features."""
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), CANONICAL_NUMERIC),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CANONICAL_CATEGORICAL)
        ]
    )

def train_models(random_state: int = 42) -> Tuple[Pipeline, Pipeline, Dict[str, Any]]:
    """
    Trains both Random Forest and Logistic Regression on reference data.
    Saves models to disk and returns pipelines and feature importance.
    """
    global _model_cache, _lr_cache
    ref_df = get_reference_dataset()
    clean_df = preprocess_dataframe(ref_df)

    X = clean_df[CANONICAL_NUMERIC + CANONICAL_CATEGORICAL]
    y = clean_df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=random_state, stratify=y
    )

    # 1. Random Forest Pipeline
    preprocessor_rf = build_preprocessor()
    rf_clf = RandomForestClassifier(
        n_estimators=150,
        max_depth=5,
        min_samples_leaf=3,
        random_state=random_state
    )
    rf_pipeline = Pipeline([
        ("preprocessor", preprocessor_rf),
        ("classifier", rf_clf)
    ])
    rf_pipeline.fit(X_train, y_train)

    # 2. Logistic Regression Baseline
    preprocessor_lr = build_preprocessor()
    lr_clf = LogisticRegression(max_iter=1000, random_state=random_state)
    lr_pipeline = Pipeline([
        ("preprocessor", preprocessor_lr),
        ("classifier", lr_clf)
    ])
    lr_pipeline.fit(X_train, y_train)

    # Extract feature importances from RF
    fitted_preprocessor = rf_pipeline.named_steps["preprocessor"]
    fitted_rf = rf_pipeline.named_steps["classifier"]
    
    cat_feature_names = fitted_preprocessor.named_transformers_["cat"].get_feature_names_out(CANONICAL_CATEGORICAL)
    all_feature_names = list(CANONICAL_NUMERIC) + list(cat_feature_names)
    importances = fitted_rf.feature_importances_

    # Aggregate importance by raw clinical feature
    feature_imp_map = {feat: 0.0 for feat in (CANONICAL_NUMERIC + CANONICAL_CATEGORICAL)}
    for name, imp in zip(all_feature_names, importances):
        for raw_feat in (CANONICAL_NUMERIC + CANONICAL_CATEGORICAL):
            if name.startswith(raw_feat):
                feature_imp_map[raw_feat] += float(imp)
                break

    sorted_importance = [
        {"feature": k, "importance": round(v, 4)}
        for k, v in sorted(feature_imp_map.items(), key=lambda x: x[1], reverse=True)
    ]

    joblib.dump(rf_pipeline, MODEL_PATH)
    joblib.dump(lr_pipeline, LR_MODEL_PATH)
    _model_cache = rf_pipeline
    _lr_cache = lr_pipeline

    print(f"[ModelService] Successfully trained and cached models at {MODEL_PATH}")
    return rf_pipeline, lr_pipeline, {"feature_importance": sorted_importance}

def get_model() -> Pipeline:
    """Returns the trained Random Forest model (loads from disk or trains if absent)."""
    global _model_cache
    if _model_cache is not None:
        return _model_cache
    
    if os.path.exists(MODEL_PATH):
        try:
            _model_cache = joblib.load(MODEL_PATH)
            return _model_cache
        except Exception as e:
            print("[ModelService] Error loading cached model, retraining:", e)
    
    rf, _, _ = train_models()
    return rf

def get_lr_model() -> Pipeline:
    """Returns the trained Logistic Regression model."""
    global _lr_cache
    if _lr_cache is not None:
        return _lr_cache
    if os.path.exists(LR_MODEL_PATH):
        try:
            _lr_cache = joblib.load(LR_MODEL_PATH)
            return _lr_cache
        except Exception:
            pass
    _, lr, _ = train_models()
    return lr

def predict_batch(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
    """
    Runs batch inference on a cleaned dataframe.
    Returns (predicted_labels, predicted_probabilities).
    """
    model = get_model()
    clean_df = preprocess_dataframe(df)
    features = CANONICAL_NUMERIC + CANONICAL_CATEGORICAL
    X = clean_df[features]
    preds = model.predict(X)
    probs = model.predict_proba(X)[:, 1]
    return preds, probs

def predict_single_patient(patient_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Runs prediction for a single patient profile with clinical explanation.
    """
    df_single = pd.DataFrame([patient_data])
    clean_single = preprocess_dataframe(df_single)
    
    model = get_model()
    features = CANONICAL_NUMERIC + CANONICAL_CATEGORICAL
    X = clean_single[features]
    
    pred = int(model.predict(X)[0])
    prob = float(model.predict_proba(X)[0, 1])

    risk_label = "Higher Risk" if pred == 1 else "Lower Risk"
    
    if prob < 0.35:
        tier = "Low Clinical Risk"
    elif prob <= 0.65:
        tier = "Moderate / Borderline Risk"
    else:
        tier = "Elevated Risk"

    return {
        "prediction": pred,
        "prediction_label": risk_label,
        "probability_percent": round(prob * 100, 1),
        "risk_tier": tier,
        "disclaimer": "Educational machine-learning demonstration only. Not intended for clinical diagnostic decision-making."
    }

def get_feature_importance_list():
    """Returns cached feature importances."""
    model = get_model()
    fitted_preprocessor = model.named_steps["preprocessor"]
    fitted_rf = model.named_steps["classifier"]
    
    cat_feature_names = fitted_preprocessor.named_transformers_["cat"].get_feature_names_out(CANONICAL_CATEGORICAL)
    all_feature_names = list(CANONICAL_NUMERIC) + list(cat_feature_names)
    importances = fitted_rf.feature_importances_

    feature_imp_map = {feat: 0.0 for feat in (CANONICAL_NUMERIC + CANONICAL_CATEGORICAL)}
    for name, imp in zip(all_feature_names, importances):
        for raw_feat in (CANONICAL_NUMERIC + CANONICAL_CATEGORICAL):
            if name.startswith(raw_feat):
                feature_imp_map[raw_feat] += float(imp)
                break

    sorted_importance = [
        {"feature": k, "importance": round(float(v), 4), "percentage": round(float(v) * 100, 1)}
        for k, v in sorted(feature_imp_map.items(), key=lambda x: x[1], reverse=True)
    ]
    return sorted_importance
