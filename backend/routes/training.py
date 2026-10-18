"""
RetinaAI - Model Training API Routes
Endpoints:
- POST /api/train
- GET /api/train/status
- POST /api/train/stop
"""

from flask import Blueprint, request, jsonify
from config import ACTIVE_DATASET_DIR
from ml.train import start_training_in_background, get_training_status, stop_training
from ml.dataset_loader import scan_and_validate_dataset
from database import get_setting

training_bp = Blueprint("training", __name__)

@training_bp.route("/train", methods=["POST"])
def train():
    """
    POST /api/train
    Launches non-blocking background model training.
    Body JSON:
    - architecture: 'Custom CNN', 'MobileNetV2', 'EfficientNetB0'
    - epochs: int (default 15)
    - batch_size: int (default 16)
    - learning_rate: float (default 0.0005)
    - dataset_dir: optional path
    """
    body = request.get_json(silent=True) or {}

    architecture = body.get("architecture", "Custom CNN")
    epochs = int(body.get("epochs", 15))
    batch_size = int(body.get("batch_size", 16))
    learning_rate = float(body.get("learning_rate", 0.0005))

    target_dir = body.get("dataset_dir") or get_setting("active_dataset_dir") or ACTIVE_DATASET_DIR

    # Validate dataset before starting
    stats = scan_and_validate_dataset(target_dir)
    if not stats.get("valid"):
        return jsonify({
            "success": False,
            "error": f"Cannot begin training: {stats.get('error', 'Invalid dataset')}"
        }), 400

    # Ensure valid hyperparameter limits
    epochs = max(1, min(epochs, 100))
    batch_size = max(2, min(batch_size, 64))

    launched = start_training_in_background(
        dataset_dir=target_dir,
        architecture=architecture,
        epochs=epochs,
        batch_size=batch_size,
        learning_rate=learning_rate
    )

    if not launched:
        return jsonify({
            "success": False,
            "error": "A model training experiment is already running. Please wait or stop the ongoing run."
        }), 409

    return jsonify({
        "success": True,
        "message": f"Training started in background ({architecture}, {epochs} epochs)",
        "config": {
            "architecture": architecture,
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "dataset_dir": target_dir
        }
    })

@training_bp.route("/train/status", methods=["GET"])
def train_status():
    """
    GET /api/train/status
    Returns live training telemetry, metrics, and log stream.
    """
    status = get_training_status()
    return jsonify({
        "success": True,
        "data": status
    })

@training_bp.route("/train/stop", methods=["POST"])
def halt_training():
    """POST /api/train/stop: Gracefully stop training."""
    stop_training()
    return jsonify({
        "success": True,
        "message": "Signal sent to halt training at next epoch completion."
    })
