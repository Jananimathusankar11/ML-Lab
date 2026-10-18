"""
RetinaAI - Dataset API Routes
Endpoints:
- GET /api/dataset/stats
- POST /api/dataset/validate
- GET /api/dataset/samples
- POST /api/dataset/set-path
"""

import os
from flask import Blueprint, request, jsonify
from config import ACTIVE_DATASET_DIR, DEFAULT_DATASET_CANDIDATES
from ml.dataset_loader import scan_and_validate_dataset, get_dataset_samples, detect_dataset_format
from database import get_setting, set_setting

dataset_bp = Blueprint("dataset", __name__)

@dataset_bp.route("/dataset/stats", methods=["GET"])
def get_stats():
    """GET /api/dataset/stats: Retrieve complete dataset metrics and health status."""
    # Check if a custom path has been stored in DB
    custom_dir = get_setting("active_dataset_dir")
    target_dir = custom_dir or ACTIVE_DATASET_DIR

    stats = scan_and_validate_dataset(target_dir)
    return jsonify({
        "success": stats.get("valid", False),
        "data": stats
    })

@dataset_bp.route("/dataset/validate", methods=["POST"])
def validate_dataset():
    """
    POST /api/dataset/validate
    Validates a specified path or the active path and returns summary statistics.
    """
    body = request.get_json(silent=True) or {}
    target_dir = body.get("dataset_dir") or get_setting("active_dataset_dir") or ACTIVE_DATASET_DIR

    stats = scan_and_validate_dataset(target_dir)
    return jsonify({
        "success": stats.get("valid", False),
        "data": stats
    })

@dataset_bp.route("/dataset/samples", methods=["GET"])
def get_samples():
    """GET /api/dataset/samples: Retrieve sample retinal images across the 5 DR classes."""
    try:
        samples = get_dataset_samples(limit_per_class=3)
        return jsonify({
            "success": True,
            "data": samples
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@dataset_bp.route("/dataset/set-path", methods=["POST"])
def set_dataset_path():
    """
    POST /api/dataset/set-path
    Updates the active dataset path.
    """
    body = request.get_json(silent=True) or {}
    new_path = body.get("dataset_path")

    if not new_path or not os.path.isdir(new_path):
        return jsonify({"success": False, "error": f"Directory not found: '{new_path}'"}), 400

    # Test format detection
    fmt = detect_dataset_format(new_path)
    if not fmt.get("valid"):
        return jsonify({
            "success": False,
            "error": fmt.get("message", "Directory does not contain recognized dataset structure")
        }), 400

    # Save to SQLite settings
    set_setting("active_dataset_dir", new_path)

    stats = scan_and_validate_dataset(new_path)
    return jsonify({
        "success": True,
        "message": f"Active dataset directory updated to: {new_path}",
        "data": stats
    })
