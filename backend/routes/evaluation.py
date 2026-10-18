"""
RetinaAI - Evaluation API Routes
Endpoints:
- GET /api/evaluation
- POST /api/evaluate
"""

import os
from flask import Blueprint, request, jsonify
from config import DEFAULT_MODEL_PATH, ACTIVE_DATASET_DIR
from ml.evaluate import load_or_generate_evaluation, evaluate_model_on_test_set
from ml.predict import get_model
from database import get_setting

evaluation_bp = Blueprint("evaluation", __name__)

@evaluation_bp.route("/evaluation", methods=["GET"])
def get_evaluation():
    """
    GET /api/evaluation
    Returns latest held-out test evaluation results, confusion matrix, and clinical metrics.
    """
    if not os.path.exists(DEFAULT_MODEL_PATH):
        return jsonify({
            "success": False,
            "error": "Model has not been trained yet. Evaluation is pending training completion.",
            "status": "Evaluation Pending"
        }), 404

    try:
        model = get_model(DEFAULT_MODEL_PATH)
        data = load_or_generate_evaluation(model)
        return jsonify({
            "success": True,
            "data": data
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Failed to retrieve evaluation results: {str(e)}"
        }), 500

@evaluation_bp.route("/evaluate", methods=["POST"])
def run_evaluation():
    """
    POST /api/evaluate
    Triggers fresh evaluation against the held-out test set.
    """
    if not os.path.exists(DEFAULT_MODEL_PATH):
        return jsonify({
            "success": False,
            "error": "Trained model not found. Cannot evaluate."
        }), 404

    try:
        body = request.get_json(silent=True) or {}
        custom_dir = body.get("dataset_dir") or get_setting("active_dataset_dir") or ACTIVE_DATASET_DIR

        model = get_model(DEFAULT_MODEL_PATH)
        result = evaluate_model_on_test_set(model, dataset_dir=custom_dir, save_results=True)

        return jsonify({
            "success": True,
            "message": "Model evaluation on held-out test set completed successfully.",
            "data": result
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Evaluation execution failed: {str(e)}"
        }), 500
