"""
CardioWatch: Backend FastAPI Server
Provides clinical ML surveillance REST endpoints for dataset ingestion,
model evaluation, Kolmogorov-Smirnov drift testing, demographic fairness audits,
and Tableau-ready CSV exports.
"""

import os
import io
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from utils.validation import validate_dataset
from services.data_loader import (
    get_reference_dataset, save_uploaded_file, UPLOADS_DIR, SAMPLES_DIR, OUTPUTS_DIR
)
from services.preprocessing import preprocess_dataframe
from services.model_service import (
    predict_batch, predict_single_patient, get_feature_importance_list, train_models
)
from services.metrics_service import compute_model_performance
from services.drift_service import analyze_data_drift
from services.fairness_service import analyze_fairness
from services.simulation_service import run_future_simulation

app = FastAPI(
    title="CardioWatch ML Surveillance API",
    description="Backend engine for ML performance, Kolmogorov-Smirnov data drift, and fairness monitoring",
    version="1.0.0"
)

from fastapi.staticfiles import StaticFiles

# Enable CORS for Vite frontend (typically localhost:5173 or localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

# Global in-memory cache of the latest analysis results
_current_analysis_cache: Optional[Dict[str, Any]] = None
_current_dataset_cache: Optional[pd.DataFrame] = None

# Ensure baseline model is trained and ready
@app.on_event("startup")
def startup_event():
    print("[FastAPI] CardioWatch server starting up. Initializing models...")
    try:
        train_models()
        # Pre-generate Tableau outputs on startup
        run_future_simulation()
    except Exception as e:
        print("[FastAPI] Startup initialization notice:", e)

class PatientInput(BaseModel):
    age: float = Field(..., ge=18, le=100, description="Age in years")
    sex: int = Field(..., ge=0, le=1, description="1 = Male, 0 = Female")
    cp: int = Field(..., ge=1, le=4, description="Chest Pain Type (1: Typical, 2: Atypical, 3: Non-Anginal, 4: Asymptomatic)")
    trestbps: float = Field(..., ge=80, le=220, description="Resting Blood Pressure (mm Hg)")
    chol: float = Field(..., ge=100, le=600, description="Serum Cholesterol (mg/dl)")
    fbs: int = Field(..., ge=0, le=1, description="Fasting Blood Sugar > 120 mg/dl (1 = True, 0 = False)")
    restecg: int = Field(..., ge=0, le=2, description="Resting ECG (0: Normal, 1: ST-T Abnormality, 2: LVH)")
    thalach: float = Field(..., ge=60, le=220, description="Maximum Heart Rate Achieved")
    exang: int = Field(..., ge=0, le=1, description="Exercise Induced Angina (1 = Yes, 0 = No)")
    oldpeak: float = Field(..., ge=0.0, le=8.0, description="ST Depression induced by exercise")
    slope: int = Field(..., ge=1, le=3, description="Slope of peak exercise ST segment")
    ca: float = Field(0.0, ge=0, le=4, description="Major vessels colored by fluoroscopy")
    thal: float = Field(3.0, description="Thallium test result (3: Normal, 6: Fixed, 7: Reversible)")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "CardioWatch Backend", "version": "1.0.0"}

@app.post("/api/upload")
async def upload_csv(file: UploadFile = File(...)):
    """
    Accepts CSV upload, validates format and schema,
    and returns dataset metadata and column mappings.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a standard CSV file.")

    content = await file.read()
    file_size_kb = round(len(content) / 1024, 2)

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

    is_valid, err_msg, summary = validate_dataset(df)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Save to uploads folder
    save_path = save_uploaded_file(content, file.filename)

    return {
        "status": "success",
        "filename": file.filename,
        "file_size_kb": file_size_kb,
        "total_rows": summary["total_rows"],
        "total_columns": summary["total_columns"],
        "has_target": summary["has_target"],
        "missing_cells": summary["total_missing_cells"],
        "duplicate_rows": summary["duplicate_rows"],
        "mapped_columns": summary["mapped_columns"],
        "preview_columns": list(df.columns[:8])
    }

@app.get("/api/sample/{sample_name}")
def load_sample_dataset(sample_name: str):
    """
    Loads pre-built sample datasets for instantaneous testing:
    'sample_cardio_stable' or 'sample_cardio_drifted'
    """
    valid_samples = {
        "stable": "sample_cardio_stable.csv",
        "drifted": "sample_cardio_drifted.csv"
    }

    if sample_name not in valid_samples:
        raise HTTPException(status_code=404, detail="Sample not found. Options: 'stable', 'drifted'")

    sample_path = os.path.join(SAMPLES_DIR, valid_samples[sample_name])
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=500, detail="Sample file missing from disk.")

    df = pd.read_csv(sample_path)
    is_valid, err_msg, summary = validate_dataset(df)

    return {
        "status": "success",
        "sample_name": sample_name,
        "filename": valid_samples[sample_name],
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "has_target": True,
        "missing_cells": 0,
        "duplicate_rows": 0,
        "mapped_columns": summary.get("mapped_columns", {})
    }

@app.post("/api/analyze")
async def analyze_dataset(
    file: Optional[UploadFile] = File(None),
    sample_name: Optional[str] = Query(None)
):
    """
    Master analysis endpoint.
    Accepts an uploaded CSV file OR a sample_name ('stable' / 'drifted'),
    cleans the data, runs predictions, evaluates performance, computes KS drift,
    and conducts subgroup fairness audits.
    """
    global _current_analysis_cache, _current_dataset_cache

    if file is not None:
        content = await file.read()
        try:
            raw_df = pd.read_csv(io.BytesIO(content))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Could not read CSV: {str(e)}")
        filename = file.filename
    elif sample_name in ["stable", "drifted"]:
        filename = f"sample_cardio_{sample_name}.csv"
        sample_path = os.path.join(SAMPLES_DIR, filename)
        if not os.path.exists(sample_path):
            raise HTTPException(status_code=404, detail="Sample file not found.")
        raw_df = pd.read_csv(sample_path)
    else:
        # Fallback to reference dataset
        raw_df = get_reference_dataset()
        filename = "heart_disease_reference.csv"

    # Validate dataset
    is_valid, err_msg, val_summary = validate_dataset(raw_df)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Clean and preprocess
    clean_df = preprocess_dataframe(raw_df)

    # 1. Batch Prediction
    preds, probs = predict_batch(clean_df)
    clean_df["predicted_outcome"] = preds
    clean_df["predicted_probability"] = np.round(probs, 4)
    clean_df["prediction_label"] = np.where(preds == 1, "Higher Risk", "Lower Risk")

    # Error classification if target present
    if val_summary["has_target"]:
        def categorize_error(row):
            act = int(row["target"])
            prd = int(row["predicted_outcome"])
            if act == 1 and prd == 1:
                return "True Positive"
            elif act == 0 and prd == 0:
                return "True Negative"
            elif act == 0 and prd == 1:
                return "False Positive"
            else:
                return "False Negative"
        clean_df["error_classification"] = clean_df.apply(categorize_error, axis=1)
        clean_df["is_correct"] = clean_df["target"] == clean_df["predicted_outcome"]
    else:
        clean_df["error_classification"] = "Prediction Only"
        clean_df["is_correct"] = None

    _current_dataset_cache = clean_df

    # 2. Performance Metrics
    if val_summary["has_target"]:
        perf_metrics = compute_model_performance(
            clean_df["target"].values, preds, probs
        )
    else:
        perf_metrics = {
            "has_performance": False,
            "message": "Ground-truth target column absent. In pure inference mode."
        }

    # 3. Data Drift Analysis (vs Reference)
    ref_df = get_reference_dataset()
    ref_clean = preprocess_dataframe(ref_df)
    drift_results = analyze_data_drift(ref_clean, clean_df)

    # 4. Demographic Fairness Audit
    fairness_results = analyze_fairness(clean_df)

    # 5. Feature Importances
    feature_importances = get_feature_importance_list()

    # 6. Dataset Distributions for Overview Page
    overview_distributions = {
        "target": clean_df["target"].value_counts().to_dict() if val_summary["has_target"] else {},
        "target_labels": {"0": "Lower Risk / Absence", "1": "Elevated Risk / Presence"},
        "sex": clean_df["sex_desc"].value_counts().to_dict(),
        "age_groups": clean_df["age_group"].value_counts().to_dict(),
        "age_distribution": [
            {"bin": f"{int(b)}-{int(b+10)}", "count": int(((clean_df['age'] >= b) & (clean_df['age'] < b+10)).sum())}
            for b in range(30, 80, 10)
        ],
        "resting_bp_mean": round(float(clean_df["trestbps"].mean()), 1),
        "cholesterol_mean": round(float(clean_df["chol"].mean()), 1),
        "max_hr_mean": round(float(clean_df["thalach"].mean()), 1)
    }

    # 7. Data Preview (First 50 rows)
    preview_cols = ["age", "sex_desc", "cp_desc", "trestbps", "chol", "thalach", "predicted_probability", "prediction_label"]
    if val_summary["has_target"]:
        preview_cols.insert(6, "target")
        preview_cols.append("error_classification")

    preview_records = clean_df[[c for c in preview_cols if c in clean_df.columns]].head(50).to_dict(orient="records")

    # Combine master analysis response
    response_payload = {
        "status": "success",
        "dataset_name": filename,
        "metadata": {
            "total_rows": len(clean_df),
            "total_columns": len(clean_df.columns),
            "has_target": val_summary["has_target"],
            "missing_cells": val_summary["total_missing_cells"],
            "duplicate_rows": val_summary["duplicate_rows"]
        },
        "overview": overview_distributions,
        "performance": perf_metrics,
        "drift": drift_results,
        "fairness": fairness_results,
        "feature_importance": feature_importances,
        "preview": preview_records
    }

    _current_analysis_cache = response_payload
    return response_payload

@app.get("/api/analysis/current")
def get_current_analysis():
    """Returns the cached results of the most recent analysis run."""
    global _current_analysis_cache
    if _current_analysis_cache is None:
        raise HTTPException(status_code=404, detail="No active analysis found. Please upload or analyze a dataset first.")
    return _current_analysis_cache

@app.post("/api/predict")
def predict_patient(patient: PatientInput):
    """Clinical risk prediction endpoint for individual patient profiles."""
    result = predict_single_patient(patient.dict())
    return result

@app.post("/api/simulate-monitoring")
def trigger_monitoring_simulation():
    """
    Executes longitudinal monitoring simulation (Months 0–5)
    and updates Tableau export files.
    """
    sim_results = run_future_simulation()
    return sim_results

@app.get("/api/export/{export_name}")
def download_tableau_csv(export_name: str):
    """
    Downloads any of the 4 Tableau-ready exported CSV files:
    - 'performance' -> monthly_performance_kpis.csv
    - 'drift' -> feature_drift_metrics.csv
    - 'fairness' -> subgroup_fairness_audit.csv
    - 'patients' -> patient_records_longitudinal.csv
    """
    filename_map = {
        "performance": "monthly_performance_kpis.csv",
        "drift": "feature_drift_metrics.csv",
        "fairness": "subgroup_fairness_audit.csv",
        "patients": "patient_records_longitudinal.csv"
    }

    if export_name not in filename_map:
        raise HTTPException(
            status_code=404,
            detail=f"Invalid export name '{export_name}'. Available: {list(filename_map.keys())}"
        )

    file_path = os.path.join(OUTPUTS_DIR, filename_map[export_name])
    if not os.path.exists(file_path):
        # Generate on demand if missing
        run_future_simulation()

    return FileResponse(
        path=file_path,
        media_type="text/csv",
        filename=filename_map[export_name]
    )

if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static-frontend")

