"""
CardioWatch: ML Performance & Evaluation Service
Calculates accuracy, precision, recall, F1, ROC-AUC, FPR, FNR,
confusion matrices, and ROC/PR curve points.
"""

from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, precision_recall_curve,
    confusion_matrix, brier_score_loss
)

def compute_model_performance(y_true: np.ndarray, y_pred: np.ndarray, y_prob: Optional[np.ndarray] = None) -> Dict[str, Any]:
    """
    Computes standard diagnostic evaluation metrics and curve coordinates.
    """
    y_true = np.array(y_true, dtype=int)
    y_pred = np.array(y_pred, dtype=int)
    if y_prob is None:
        y_prob = y_pred.astype(float)
    else:
        y_prob = np.array(y_prob, dtype=float)

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred, zero_division=0)
    rec = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
    
    try:
        auc_val = roc_auc_score(y_true, y_prob) if len(np.unique(y_true)) > 1 else 0.5
    except Exception:
        auc_val = 0.5

    try:
        brier = brier_score_loss(y_true, y_prob)
    except Exception:
        brier = 0.0

    # Downsample ROC curve points for efficient frontend charting
    fpr_arr, tpr_arr, _ = roc_curve(y_true, y_prob)
    indices = np.linspace(0, len(fpr_arr) - 1, min(len(fpr_arr), 30), dtype=int)
    roc_points = [{"fpr": round(float(fpr_arr[i]), 3), "tpr": round(float(tpr_arr[i]), 3)} for i in indices]

    # Precision-Recall curve points
    p_arr, r_arr, _ = precision_recall_curve(y_true, y_prob)
    pr_indices = np.linspace(0, len(p_arr) - 1, min(len(p_arr), 30), dtype=int)
    pr_points = [{"recall": round(float(r_arr[i]), 3), "precision": round(float(p_arr[i]), 3)} for i in pr_indices]

    return {
        "accuracy": round(float(acc), 4),
        "precision": round(float(prec), 4),
        "recall": round(float(rec), 4),
        "f1_score": round(float(f1), 4),
        "roc_auc": round(float(auc_val), 4),
        "brier_score": round(float(brier), 4),
        "false_positive_rate": round(float(fpr), 4),
        "false_negative_rate": round(float(fnr), 4),
        "confusion_matrix": {
            "true_positive": int(tp),
            "false_positive": int(fp),
            "true_negative": int(tn),
            "false_negative": int(fn),
            "total": int(tp + tn + fp + fn)
        },
        "roc_curve": roc_points,
        "pr_curve": pr_points
    }
