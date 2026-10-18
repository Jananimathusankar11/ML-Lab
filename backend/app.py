"""
RetinaAI - Diabetic Retinopathy Detection & Analysis System
Main Flask REST API Server
"""

import os
import sys
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from config import (
    UPLOAD_FOLDER,
    REPORTS_FOLDER,
    SAVED_MODELS_FOLDER,
    MAX_CONTENT_LENGTH,
    DEFAULT_MODEL_PATH,
    ACTIVE_DATASET_DIR,
    MEDICAL_DISCLAIMER
)
from database import init_db, get_predictions, get_latest_training_run, get_latest_evaluation
from ml.dataset_loader import scan_and_validate_dataset
from ml.train import get_training_status

# Route Blueprints
from routes.prediction import prediction_bp
from routes.dataset import dataset_bp
from routes.training import training_bp
from routes.evaluation import evaluation_bp
from routes.history import history_bp
from routes.features import features_bp
from routes.settings import settings_bp

def create_app():
    """Application factory for RetinaAI backend."""
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

    # Enable CORS for React frontend (Vite default is 5173)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Initialize SQLite Database tables
    init_db()

    # Register Blueprints
    app.register_blueprint(prediction_bp, url_prefix="/api")
    app.register_blueprint(dataset_bp, url_prefix="/api")
    app.register_blueprint(training_bp, url_prefix="/api")
    app.register_blueprint(evaluation_bp, url_prefix="/api")
    app.register_blueprint(history_bp, url_prefix="/api")
    app.register_blueprint(features_bp, url_prefix="/api")
    app.register_blueprint(settings_bp, url_prefix="/api")

    # Serve uploaded & preprocessed images
    @app.route("/api/uploads/<path:filename>")
    def serve_upload(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)

    # Serve saved model evaluation artifacts
    @app.route("/api/saved_models/<path:filename>")
    def serve_saved_models(filename):
        return send_from_directory(SAVED_MODELS_FOLDER, filename)

    # Health Check Endpoint
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "healthy",
            "service": "RetinaAI Diabetic Retinopathy API",
            "python_version": sys.version.split()[0],
            "model_ready": os.path.exists(DEFAULT_MODEL_PATH)
        })

    # Aggregated Overview Dashboard Endpoint
    @app.route("/api/dashboard", methods=["GET"])
    def dashboard_overview():
        """
        GET /api/dashboard
        Returns aggregated summary for Overview Dashboard:
        - Total images, valid images
        - Prediction count
        - Model status & test accuracy
        - Training status
        - Class distribution
        - Accuracy & loss graphs
        - Recent predictions
        - Latest training experiment
        """
        # 1. Dataset stats
        ds_stats = scan_and_validate_dataset()
        total_images = ds_stats.get("valid_images", 0) if ds_stats.get("valid") else 0
        class_dist = ds_stats.get("class_distribution", []) if ds_stats.get("valid") else []

        # 2. Prediction history
        pred_data = get_predictions(limit=5)
        total_predictions = pred_data.get("total", 0)
        recent_preds = pred_data.get("predictions", [])

        # 3. Model Status & Test Evaluation
        model_exists = os.path.exists(DEFAULT_MODEL_PATH)
        eval_data = get_latest_evaluation()

        if model_exists:
            model_status = "Model Trained & Active"
            test_accuracy = eval_data.get("accuracy") if eval_data else "Evaluation Pending"
        else:
            model_status = "Model Not Trained"
            test_accuracy = "N/A"

        # 4. Training status
        train_status = get_training_status()
        latest_experiment = get_latest_training_run()

        # 5. Accuracy / Loss curves (from latest training run or saved history)
        history_curves = None
        if latest_experiment and latest_experiment.get("history"):
            history_curves = latest_experiment["history"]
        else:
            # Fallback to saved_models/training_history.json if present
            hist_json_path = os.path.join(SAVED_MODELS_FOLDER, "training_history.json")
            if os.path.exists(hist_json_path):
                import json
                try:
                    with open(hist_json_path, "r") as f:
                        history_curves = json.load(f)
                except Exception:
                    pass

        return jsonify({
            "success": True,
            "data": {
                "total_images": total_images,
                "valid_images": total_images,
                "images_processed": total_predictions,
                "total_predictions": total_predictions,
                "model_status": model_status,
                "test_accuracy": test_accuracy,
                "training_status": train_status.get("status", "idle"),
                "class_distribution": class_dist,
                "training_curves": history_curves,
                "recent_predictions": recent_preds,
                "latest_experiment": latest_experiment,
                "medical_disclaimer": MEDICAL_DISCLAIMER
            }
        })

    # Error Handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Requested resource not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"success": False, "error": "Internal server processing error"}), 500

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    print(f"\n=======================================================")
    print(f" RetinaAI Backend API Server running on port {port}")
    print(f" Endpoints: http://127.0.0.1:{port}/api/health")
    print(f" Dashboard: http://127.0.0.1:{port}/api/dashboard")
    print(f"=======================================================\n")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
