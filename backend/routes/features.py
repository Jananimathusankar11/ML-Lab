"""
RetinaAI - Feature Extraction and Layer Visualization API Routes
Endpoints:
- GET /api/features/architecture
- POST /api/features/gradcam
"""

import os
import cv2
import uuid
import base64
from flask import Blueprint, request, jsonify
from config import DEFAULT_MODEL_PATH, UPLOAD_FOLDER
from ml.predict import get_model
from ml.model import get_model_architecture_details
from ml.preprocess import preprocess_image, load_retinal_image, TARGET_IMAGE_SIZE
from ml.gradcam import compute_gradcam_heatmap, generate_gradcam_overlay, explain_gradcam_regions

features_bp = Blueprint("features", __name__)

@features_bp.route("/features/architecture", methods=["GET"])
def get_architecture():
    """
    GET /api/features/architecture
    Returns structural inspection of CNN layers, output tensor dimensions, and parameters.
    """
    if not os.path.exists(DEFAULT_MODEL_PATH):
        return jsonify({
            "success": False,
            "error": "Model has not been trained or loaded yet."
        }), 404

    try:
        model = get_model(DEFAULT_MODEL_PATH)
        arch_details = get_model_architecture_details(model)
        return jsonify({
            "success": True,
            "data": arch_details
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@features_bp.route("/features/gradcam", methods=["POST"])
def get_gradcam():
    """
    POST /api/features/gradcam
    Compute Grad-CAM for an image with custom class or layer target.
    """
    if not os.path.exists(DEFAULT_MODEL_PATH):
        return jsonify({"success": False, "error": "Model not available"}), 404

    try:
        model = get_model(DEFAULT_MODEL_PATH)
        body = request.get_json(silent=True) or {}
        img_path = body.get("image_path")
        target_class = body.get("class_id")

        if not img_path or not os.path.exists(img_path):
            return jsonify({"success": False, "error": f"Image not found: '{img_path}'"}), 404

        # Preprocess
        raw = load_retinal_image(img_path)
        prep = preprocess_image(raw, target_size=TARGET_IMAGE_SIZE)
        input_tensor = prep[None, ...]

        # Heatmap
        heatmap = compute_gradcam_heatmap(model, input_tensor, target_class_idx=target_class)
        colored_map, overlay = generate_gradcam_overlay(prep, heatmap)

        # Base64 encode for direct response
        _, buffer = cv2.imencode(".png", cv2.cvtColor(overlay, cv2.COLOR_RGB2BGR))
        overlay_b64 = base64.b64encode(buffer).decode("utf-8")

        _, buf_hm = cv2.imencode(".png", cv2.cvtColor(colored_map, cv2.COLOR_RGB2BGR))
        heatmap_b64 = base64.b64encode(buf_hm).decode("utf-8")

        return jsonify({
            "success": True,
            "data": {
                "overlay_url": f"data:image/png;base64,{overlay_b64}",
                "heatmap_url": f"data:image/png;base64,{heatmap_b64}",
                "explanation": explain_gradcam_regions(target_class if target_class is not None else 0)
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
