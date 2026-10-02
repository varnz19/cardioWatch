"""
CardioWatch: Model Training & Baseline Calibration Module
Fits a production-grade Random Forest Classifier on historical data,
evaluates diagnostic KPIs, and serializes the pipeline for monitoring.
"""

import os
import warnings
import joblib
import pandas as pd
import numpy as np

warnings.filterwarnings("ignore")
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix, brier_score_loss
)

from data_loader import load_and_clean_data

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

MODEL_PATH = os.path.join(MODEL_DIR, "cardio_rf_pipeline.joblib")
TEST_REF_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "processed", "baseline_test_ref.csv")

# Clinical feature specifications
NUMERIC_FEATURES = ["age", "trestbps", "chol", "thalach", "oldpeak", "ca"]
CATEGORICAL_FEATURES = ["sex", "cp", "fbs", "restecg", "exang", "slope", "thal"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

def build_preprocessing_pipeline() -> ColumnTransformer:
    """Builds a scikit-learn ColumnTransformer for clinical tabular data."""
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ]
    )
    return preprocessor

def train_and_evaluate_baseline(random_state: int = 42):
    """
    Loads clean data, performs stratified train/test split,
    trains both Logistic Regression and Random Forest models,
    selects and serializes the optimal Random Forest pipeline.
    """
    df = load_and_clean_data()
    X = df[ALL_FEATURES]
    y = df["target"]

    # 80/20 Stratified Split
    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, df.index, test_size=0.20, random_state=random_state, stratify=y
    )

    preprocessor = build_preprocessing_pipeline()

    # 1. Baseline Benchmark: Logistic Regression
    lr_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("clf", LogisticRegression(max_iter=1000, random_state=random_state))
    ])
    lr_pipeline.fit(X_train, y_train)
    lr_preds = lr_pipeline.predict(X_test)
    lr_acc = accuracy_score(y_test, lr_preds)
    lr_rec = recall_score(y_test, lr_preds)

    # 2. Production Model: Random Forest Classifier
    rf_pipeline = Pipeline([
        ("preprocessor", preprocessor),
        ("clf", RandomForestClassifier(
            n_estimators=150,
            max_depth=5,
            min_samples_leaf=3,
            random_state=random_state
        ))
    ])
    rf_pipeline.fit(X_train, y_train)
    
    # Inference & Probabilities
    rf_preds = rf_pipeline.predict(X_test)
    rf_probs = rf_pipeline.predict_proba(X_test)[:, 1]

    # Metrics calculation
    acc = accuracy_score(y_test, rf_preds)
    prec = precision_score(y_test, rf_preds)
    rec = recall_score(y_test, rf_preds)
    f1 = f1_score(y_test, rf_preds)
    roc_auc = roc_auc_score(y_test, rf_probs)
    brier = brier_score_loss(y_test, rf_probs)
    cm = confusion_matrix(y_test, rf_preds)
    tn, fp, fn, tp = cm.ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0

    print("=" * 65)
    print("      CARDIOWATCH: BASELINE MODEL EVALUATION (MONTH 0)")
    print("=" * 65)
    print(f"Benchmark (Logistic Regression) -> Accuracy: {lr_acc:.3f} | Recall: {lr_rec:.3f}")
    print(f"Selected  (Random Forest)       -> Accuracy: {acc:.3f} | Recall: {rec:.3f}")
    print("-" * 65)
    print(f"Precision:         {prec:.3f}")
    print(f"F1-Score:          {f1:.3f}")
    print(f"ROC-AUC:           {roc_auc:.3f}")
    print(f"Brier Score:       {brier:.3f}")
    print(f"False Pos. Rate:   {fpr:.3f} ({fp}/{fp+tn})")
    print(f"False Neg. Rate:   {fnr:.3f} ({fn}/{fn+tp})")
    print(f"Confusion Matrix:  TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    print("=" * 65)

    # Serialize trained pipeline
    joblib.dump(rf_pipeline, MODEL_PATH)
    print(f"[ModelTrainer] Saved calibrated Random Forest pipeline to {MODEL_PATH}")

    # Build reference test dataframe with human readable labels for baseline monitoring
    test_df = df.loc[idx_test].copy()
    test_df["time_period"] = "Month 0 (Baseline Ref)"
    test_df["month_index"] = 0
    test_df["predicted_outcome"] = rf_preds
    test_df["predicted_risk_score"] = np.round(rf_probs, 4)
    test_df["data_origin"] = "BASELINE_TEST_SET"

    os.makedirs(os.path.dirname(TEST_REF_PATH), exist_ok=True)
    test_df.to_csv(TEST_REF_PATH, index=False)
    print(f"[ModelTrainer] Saved baseline test reference data to {TEST_REF_PATH}")

    baseline_metrics = {
        "time_period": "Month 0 (Baseline Ref)",
        "month_index": 0,
        "total_patients": len(y_test),
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "f1_score": round(f1, 4),
        "fpr": round(fpr, 4),
        "fnr": round(fnr, 4),
        "auc_roc": round(roc_auc, 4),
        "brier_score": round(brier, 4),
        "tp_count": int(tp),
        "fp_count": int(fp),
        "tn_count": int(tn),
        "fn_count": int(fn)
    }

    return rf_pipeline, df, test_df, baseline_metrics

if __name__ == "__main__":
    train_and_evaluate_baseline()
