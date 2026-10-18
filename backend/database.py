"""
RetinaAI - SQLite Database Layer
Stores prediction logs, training experiments, model evaluation results, and system settings.
"""

import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from config import DB_PATH

def get_connection():
    """Get a SQLite database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables and default configuration."""
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Prediction History Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id TEXT PRIMARY KEY,
            filename TEXT NOT NULL,
            image_path TEXT NOT NULL,
            preprocessed_path TEXT,
            gradcam_path TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            predicted_class INTEGER NOT NULL,
            class_name TEXT NOT NULL,
            confidence REAL NOT NULL,
            probabilities_json TEXT NOT NULL,
            processing_time_ms REAL NOT NULL,
            model_version TEXT DEFAULT 'CNN-v1',
            notes TEXT
        )
    """)

    # 2. Training Experiments Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_runs (
            id TEXT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            model_architecture TEXT NOT NULL,
            epochs INTEGER NOT NULL,
            batch_size INTEGER NOT NULL,
            learning_rate REAL NOT NULL,
            train_samples INTEGER,
            val_samples INTEGER,
            final_train_acc REAL,
            final_val_acc REAL,
            final_train_loss REAL,
            final_val_loss REAL,
            history_json TEXT,
            status TEXT DEFAULT 'completed',
            error_message TEXT
        )
    """)

    # 3. Model Evaluations Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS evaluations (
            id TEXT PRIMARY KEY,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            model_version TEXT NOT NULL,
            accuracy REAL NOT NULL,
            macro_precision REAL NOT NULL,
            macro_recall REAL NOT NULL,
            macro_f1 REAL NOT NULL,
            weighted_f1 REAL NOT NULL,
            test_samples_count INTEGER NOT NULL,
            confusion_matrix_json TEXT NOT NULL,
            classification_report_json TEXT NOT NULL,
            class_metrics_json TEXT
        )
    """)

    # 4. System Settings Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()

# Database CRUD Helpers

def save_prediction(
    filename: str,
    image_path: str,
    predicted_class: int,
    class_name: str,
    confidence: float,
    probabilities: List[float],
    processing_time_ms: float,
    preprocessed_path: Optional[str] = None,
    gradcam_path: Optional[str] = None,
    model_version: str = "CNN-v1",
    notes: Optional[str] = None
) -> str:
    """Save an inference prediction record."""
    pred_id = f"PRED-{uuid.uuid4().hex[:8].upper()}"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO predictions (
            id, filename, image_path, preprocessed_path, gradcam_path,
            predicted_class, class_name, confidence, probabilities_json,
            processing_time_ms, model_version, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        pred_id, filename, image_path, preprocessed_path, gradcam_path,
        predicted_class, class_name, confidence, json.dumps(probabilities),
        processing_time_ms, model_version, notes
    ))
    conn.commit()
    conn.close()
    return pred_id

def get_predictions(limit: int = 50, offset: int = 0, search: str = "", class_filter: Optional[int] = None) -> Dict[str, Any]:
    """Retrieve paginated predictions with optional search & filter."""
    conn = get_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM predictions WHERE 1=1"
    params: List[Any] = []

    if search:
        query += " AND (id LIKE ? OR filename LIKE ? OR class_name LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term, term])

    if class_filter is not None:
        query += " AND predicted_class = ?"
        params.append(class_filter)

    # Count total
    count_query = query.replace("SELECT *", "SELECT COUNT(*)")
    cursor.execute(count_query, params)
    total = cursor.fetchone()[0]

    # Order and paginate
    query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    cursor.execute(query, params)
    rows = cursor.fetchall()

    predictions = []
    for r in rows:
        d = dict(r)
        d["probabilities"] = json.loads(d["probabilities_json"])
        predictions.append(d)

    conn.close()
    return {"total": total, "predictions": predictions, "limit": limit, "offset": offset}

def get_prediction_by_id(pred_id: str) -> Optional[Dict[str, Any]]:
    """Get single prediction details by ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM predictions WHERE id = ?", (pred_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["probabilities"] = json.loads(d["probabilities_json"])
    return d

def delete_prediction(pred_id: str) -> bool:
    """Delete a prediction record."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM predictions WHERE id = ?", (pred_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def save_training_run(data: Dict[str, Any]) -> str:
    """Save training experiment record."""
    run_id = f"RUN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO training_runs (
            id, model_architecture, epochs, batch_size, learning_rate,
            train_samples, val_samples, final_train_acc, final_val_acc,
            final_train_loss, final_val_loss, history_json, status, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        run_id,
        data.get("model_architecture", "Custom CNN"),
        data.get("epochs", 15),
        data.get("batch_size", 16),
        data.get("learning_rate", 0.0005),
        data.get("train_samples", 0),
        data.get("val_samples", 0),
        data.get("final_train_acc", 0.0),
        data.get("final_val_acc", 0.0),
        data.get("final_train_loss", 0.0),
        data.get("final_val_loss", 0.0),
        json.dumps(data.get("history", {})),
        data.get("status", "completed"),
        data.get("error_message", None)
    ))
    conn.commit()
    conn.close()
    return run_id

def get_latest_training_run() -> Optional[Dict[str, Any]]:
    """Retrieve the latest completed training experiment."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM training_runs ORDER BY timestamp DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    if d.get("history_json"):
        d["history"] = json.loads(d["history_json"])
    return d

def save_evaluation(data: Dict[str, Any]) -> str:
    """Save model evaluation metrics on test set."""
    eval_id = f"EVAL-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO evaluations (
            id, model_version, accuracy, macro_precision, macro_recall,
            macro_f1, weighted_f1, test_samples_count, confusion_matrix_json,
            classification_report_json, class_metrics_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        eval_id,
        data.get("model_version", "dr_model.keras"),
        data.get("accuracy", 0.0),
        data.get("macro_precision", 0.0),
        data.get("macro_recall", 0.0),
        data.get("macro_f1", 0.0),
        data.get("weighted_f1", 0.0),
        data.get("test_samples_count", 0),
        json.dumps(data.get("confusion_matrix", [])),
        json.dumps(data.get("classification_report", {})),
        json.dumps(data.get("class_metrics", {}))
    ))
    conn.commit()
    conn.close()
    return eval_id

def get_latest_evaluation() -> Optional[Dict[str, Any]]:
    """Retrieve the latest evaluation record."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM evaluations ORDER BY timestamp DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["confusion_matrix"] = json.loads(d["confusion_matrix_json"])
    d["classification_report"] = json.loads(d["classification_report_json"])
    if d.get("class_metrics_json"):
        d["class_metrics"] = json.loads(d["class_metrics_json"])
    return d

def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    """Get single system configuration value."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else default

def set_setting(key: str, value: str):
    """Set system configuration value."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    """, (key, str(value)))
    conn.commit()
    conn.close()

# Auto initialize database on module import
init_db()
