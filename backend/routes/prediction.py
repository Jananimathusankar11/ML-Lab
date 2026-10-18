"""
RetinaAI - Prediction and Preprocessing API Routes
Endpoints:
- POST /api/predict
- POST /api/preprocess
"""

import os
import uuid
import cv2
import base64
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

from config import UPLOAD_FOLDER, ALLOWED_EXTENSIONS, MAX_CONTENT_LENGTH, DEFAULT_MODEL_PATH
from ml.predict import predict_retinal_image, get_model
from ml.preprocess import generate_preprocessing_steps, load_retinal_image, TARGET_IMAGE_SIZE

prediction_bp = Blueprint("prediction", __name__)

def allowed_file(filename: str) -> bool:
    """Validate allowed file format."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@prediction_bp.route("/predict", methods=["POST"])
def predict():
    """
    POST /api/predict
    Accepts multipart/form-data with file field 'image'.
    Executes end-to-end inference, preprocessing, Grad-CAM, and database logging.
    """
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image file provided in upload request"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"success": False, "error": "Empty filename"}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "success": False,
            "error": f"Invalid file extension. Supported formats are: {', '.join(ALLOWED_EXTENSIONS)}"
        }), 400

    try:
        # Save uploaded image safely
        unique_id = uuid.uuid4().hex[:8]
        safe_name = secure_filename(file.filename)
        saved_filename = f"orig_{unique_id}_{safe_name}"
        save_path = os.path.join(UPLOAD_FOLDER, saved_filename)
        file.save(save_path)

        # Check if model exists
        if not os.path.exists(DEFAULT_MODEL_PATH):
            return jsonify({
                "success": False,
                "error": "Trained CNN model is not available yet. Please train a model via the Model Training page first.",
                "image_saved_url": f"/api/uploads/{saved_filename}"
            }), 404

        # Run inference pipeline
        result = predict_retinal_image(save_path)
        result["original_image_url"] = f"/api/uploads/{saved_filename}"

        return jsonify({
            "success": True,
            "data": result
        })

    except Exception as e:
        import traceback
        current_app.logger.error(f"Prediction failed: {traceback.format_exc()}")
        return jsonify({
            "success": False,
            "error": f"Inference processing failed: {str(e)}"
        }), 500

@prediction_bp.route("/preprocess", methods=["POST"])
def preprocess_view():
    """
    POST /api/preprocess
    Accepts image file or JSON with 'image_url'/'image_path'.
    Returns multi-step image preprocessing pipeline breakdown for educational inspection.
    """
    temp_path = None
    try:
        if "image" in request.files:
            file = request.files["image"]
            if not allowed_file(file.filename):
                return jsonify({"success": False, "error": "Invalid image extension"}), 400

            unique_id = uuid.uuid4().hex[:8]
            safe_name = secure_filename(file.filename)
            temp_path = os.path.join(UPLOAD_FOLDER, f"prep_inspect_{unique_id}_{safe_name}")
            file.save(temp_path)
        else:
            # Check JSON body for existing image filename or path
            body = request.get_json(silent=True) or {}
            img_ref = body.get("image_path") or body.get("filename")
            if not img_ref:
                return jsonify({"success": False, "error": "No image uploaded or specified"}), 400

            if os.path.exists(img_ref):
                temp_path = img_ref
            else:
                # Check uploads directory
                possible = os.path.join(UPLOAD_FOLDER, os.path.basename(img_ref))
                if os.path.exists(possible):
                    temp_path = possible
                else:
                    return jsonify({"success": False, "error": f"Image file not found: {img_ref}"}), 404

        # Generate step-by-step transformations
        steps_data = generate_preprocessing_steps(temp_path)

        # Encode step images to Base64 data URLs for seamless frontend display
        serialized_steps = []
        for step in steps_data["steps"]:
            img_rgb = step["image"]
            img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
            _, buffer = cv2.imencode(".png", img_bgr)
            b64_str = base64.b64encode(buffer).decode("utf-8")
            serialized_steps.append({
                "name": step["name"],
                "description": step["description"],
                "data_url": f"data:image/png;base64,{b64_str}",
                "dimensions": f"{img_rgb.shape[1]}x{img_rgb.shape[0]}"
            })

        return jsonify({
            "success": True,
            "data": {
                "original_dimensions": steps_data["original_dimensions"],
                "cropped_dimensions": steps_data["cropped_dimensions"],
                "target_dimensions": steps_data["target_dimensions"],
                "steps": serialized_steps
            }
        })

    except Exception as e:
        return jsonify({"success": False, "error": f"Preprocessing inspection failed: {str(e)}"}), 500
