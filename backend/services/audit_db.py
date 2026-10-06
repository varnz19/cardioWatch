"""
CardioWatch: Batch Audit Database Service (SQLite)
Persists batch audit evaluations over time, recording timestamps,
sample sizes, performance metrics, drift flags, and demographic fairness stats.
Provides historical chronological queries for trend charting.
"""

import os
import sqlite3
from typing import Dict, Any, List, Optional
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "cardio_surveillance.db")

def get_db_connection() -> sqlite3.Connection:
    """Creates SQLite connection with row dictionary mapping."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_audit_db():
    """Initializes the batch auditing schema."""
    with get_db_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id TEXT UNIQUE NOT NULL,
                batch_name TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                total_patients INTEGER NOT NULL,
                is_synthetic BOOLEAN NOT NULL DEFAULT 0,
                generation_notes TEXT,
                has_ground_truth BOOLEAN NOT NULL DEFAULT 1,
                accuracy REAL,
                recall REAL,
                fnr REAL,
                precision REAL,
                f1_score REAL,
                roc_auc REAL,
                high_drift_count INTEGER DEFAULT 0,
                medium_drift_count INTEGER DEFAULT 0,
                overall_drift_status TEXT DEFAULT 'Normal',
                max_fairness_gap_pct REAL,
                fairness_status TEXT DEFAULT 'Normal',
                sex_gap_significant BOOLEAN DEFAULT 0
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS feature_drift_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                batch_id TEXT NOT NULL,
                feature TEXT NOT NULL,
                ks_statistic REAL NOT NULL,
                p_value_raw REAL NOT NULL,
                p_value_adjusted REAL NOT NULL,
                psi_score REAL NOT NULL,
                status TEXT NOT NULL,
                FOREIGN KEY (batch_id) REFERENCES audit_batches (batch_id)
            )
        """)
        conn.commit()

def record_audit_batch(
    batch_name: str,
    total_patients: int,
    performance: Dict[str, Any],
    drift: Dict[str, Any],
    fairness: Dict[str, Any],
    is_synthetic: bool = False,
    generation_notes: Optional[str] = None
) -> str:
    """Records an evaluated patient batch into SQLite history."""
    init_audit_db()
    timestamp_iso = datetime.utcnow().isoformat() + "Z"
    batch_id = f"BATCH-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{os.urandom(2).hex()}"

    has_perf = performance.get("has_performance", True)
    acc = performance.get("accuracy") if has_perf else None
    rec = performance.get("recall") if has_perf else None
    fnr = performance.get("false_negative_rate") if has_perf else None
    prec = performance.get("precision") if has_perf else None
    f1 = performance.get("f1_score") if has_perf else None
    auc = performance.get("roc_auc") if has_perf else None

    drift_high = drift.get("high_drift_count", 0)
    drift_med = drift.get("medium_drift_count", 0)
    drift_status = drift.get("overall_status", "Normal")

    fairness_gap = fairness.get("max_fnr_gap_points")
    fairness_status = fairness.get("overall_status", "Normal")
    sex_audit = next((a for a in fairness.get("audits", []) if a.get("attribute_type") == "Biological Sex"), {})
    sex_sig = sex_audit.get("is_statistically_significant", False)

    with get_db_connection() as conn:
        conn.execute("""
            INSERT INTO audit_batches (
                batch_id, batch_name, timestamp, total_patients, is_synthetic, generation_notes,
                has_ground_truth, accuracy, recall, fnr, precision, f1_score, roc_auc,
                high_drift_count, medium_drift_count, overall_drift_status,
                max_fairness_gap_pct, fairness_status, sex_gap_significant
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            batch_id, batch_name, timestamp_iso, total_patients, int(is_synthetic), generation_notes,
            int(has_perf), acc, rec, fnr, prec, f1, auc,
            drift_high, drift_med, drift_status,
            fairness_gap, fairness_status, int(sex_sig)
        ))

        for feat in drift.get("feature_drift_table", []):
            conn.execute("""
                INSERT INTO feature_drift_records (
                    batch_id, feature, ks_statistic, p_value_raw, p_value_adjusted, psi_score, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                batch_id, feat["feature"], feat.get("ks_statistic", 0.0),
                feat.get("p_value_raw", 1.0), feat.get("p_value_adjusted", 1.0),
                feat.get("psi_score", 0.0), feat.get("status", "LOW")
            ))

        conn.commit()

    return batch_id

def get_audit_history(limit: int = 50) -> List[Dict[str, Any]]:
    """Returns chronologically ordered audit history for trend charting."""
    init_audit_db()
    with get_db_connection() as conn:
        cursor = conn.execute("""
            SELECT * FROM (
                SELECT * FROM audit_batches
                ORDER BY id DESC
                LIMIT ?
            ) ORDER BY id ASC
        """, (limit,))
        rows = [dict(r) for r in cursor.fetchall()]

    for r in rows:
        r["is_synthetic"] = bool(r["is_synthetic"])
        r["sex_gap_significant"] = bool(r["sex_gap_significant"])

    return rows

# Initialize on load
init_audit_db()
