"""
RetinaAI - System Settings and Status API Routes
Endpoints:
- GET /api/settings
- POST /api/settings
"""

import os
import sys
from flask import Blueprint, request, jsonify
from config import (
    DEFAULT_MODEL_PATH,
    ACTIVE_DATASET_DIR,
    DEFAULT_DATASET_CANDIDATES,
    DB_PATH,
    UPLOAD_FOLDER,
    REPORTS_FOLDER,
    SAVED_MODELS_FOLDER
)
from database import get_setting, set_setting
from ml.dataset_loader import scan_and_validate_dataset

settings_bp = Blueprint("settings", __name__)

@settings_bp.route("/settings", methods=["GET"])
def get_settings():
    """
    GET /api/settings
    Returns runtime configuration, dataset detection status, and server health.
    """
    custom_dataset = get_setting("active_dataset_dir")
    active_dataset = custom_dataset or ACTIVE_DATASET_DIR

    # Check candidates existence
    candidates = []
    for c in DEFAULT_DATASET_CANDIDATES:
        if os.path.exists(c):
            candidates.append({"path": c, "exists": True, "name": os.path.basename(c.rstrip("\\/"))})

    model_exists = os.path.exists(DEFAULT_MODEL_PATH)

    return jsonify({
        "success": True,
        "data": {
            "active_dataset_dir": active_dataset,
            "dataset_candidates": candidates,
            "model_path": DEFAULT_MODEL_PATH,
            "model_exists": model_exists,
            "model_status": "Ready for Inference" if model_exists else "Model Not Trained",
            "database_path": DB_PATH,
            "upload_folder": UPLOAD_FOLDER,
            "python_version": sys.version.split()[0],
            "framework": "TensorFlow 2.21 + Keras 3.15"
        }
    })

@settings_bp.route("/settings", methods=["POST"])
def update_settings():
    """
    POST /api/settings
    Updates configuration items.
    """
    body = request.get_json(silent=True) or {}

    if "active_dataset_dir" in body:
        new_path = body["active_dataset_dir"].strip()
        if not os.path.exists(new_path):
            return jsonify({"success": False, "error": f"Path does not exist: '{new_path}'"}), 400

        set_setting("active_dataset_dir", new_path)

    return jsonify({
        "success": True,
        "message": "Settings updated successfully."
    })
