"""
RetinaAI - Real-Time Inference Engine
Handles retinal fundus prediction:
- Model cache & dynamic reload
- Standardized image preprocessing
- Multi-class probability distribution
- Automated Grad-CAM saliency extraction
- Database persistence & audit logging
"""

import os
import time
import uuid
import cv2
import numpy as np
import tensorflow as tf
from typing import Dict, Any, Optional

from config import (
    DEFAULT_MODEL_PATH,
    SAVED_MODELS_FOLDER,
    UPLOAD_FOLDER,
    CLASS_NAMES,
    CLASS_SHORT_NAMES,
    CLASS_DETAILS,
    MEDICAL_DISCLAIMER
)
from ml.preprocess import preprocess_image, load_retinal_image, crop_circular_fundus, TARGET_IMAGE_SIZE
from ml.gradcam import compute_gradcam_heatmap, generate_gradcam_overlay, explain_gradcam_regions
from database import save_prediction

# Global Model Cache
_LOADED_MODEL: Optional[tf.keras.Model] = None
_LOADED_MODEL_PATH: Optional[str] = None

def get_model(model_path: Optional[str] = None) -> tf.keras.Model:
    """Load model with caching. Thread-safe for read operations."""
    global _LOADED_MODEL, _LOADED_MODEL_PATH

    target_path = model_path or DEFAULT_MODEL_PATH

    if _LOADED_MODEL is not None and _LOADED_MODEL_PATH == target_path:
        return _LOADED_MODEL

    if not os.path.exists(target_path):
        raise FileNotFoundError(
            f"Trained model not found at '{target_path}'. "
            "Please train the model via the Model Training page or place 'dr_model.keras' in 'backend/saved_models/'."
        )

    # Load model
    model = tf.keras.models.load_model(target_path, compile=False)
    _LOADED_MODEL = model
    _LOADED_MODEL_PATH = target_path
    return _LOADED_MODEL

def reload_model(model_path: Optional[str] = None):
    """Force reload of the cached model (called after training finishes)."""
    global _LOADED_MODEL, _LOADED_MODEL_PATH
    _LOADED_MODEL = None
    _LOADED_MODEL_PATH = None
    return get_model(model_path)

def predict_retinal_image(
    image_path: str,
    model_path: Optional[str] = None,
    save_to_db: bool = True,
    generate_gradcam: bool = True
) -> Dict[str, Any]:
    """
    Execute full inference pipeline on a retinal image:
    1. Verify file & load original image
    2. Apply standard preprocessing (crop, resize, CLAHE, normalize)
    3. Pass through CNN model
    4. Extract softmax probabilities across 5 classes
    5. Compute Grad-CAM heatmap
    6. Record in SQLite database
    """
    start_time = time.time()

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at path: {image_path}")

    # Load model
    model = get_model(model_path)

    # Load original image for visualization & dimensions
    original_rgb = load_retinal_image(image_path)
    orig_h, orig_w, _ = original_rgb.shape

    # Preprocess image
    preprocessed = preprocess_image(original_rgb, target_size=TARGET_IMAGE_SIZE)
    input_tensor = np.expand_dims(preprocessed, axis=0)  # Shape (1, 224, 224, 3)

    # Run inference
    raw_preds = model.predict(input_tensor, verbose=0)
    probabilities = raw_preds[0].tolist()

    # Determine predicted class and confidence
    pred_class_idx = int(np.argmax(probabilities))
    confidence = float(probabilities[pred_class_idx])

    # Save preprocessed image for display
    unique_id = uuid.uuid4().hex[:8]
    prep_filename = f"prep_{unique_id}_{os.path.basename(image_path)}"
    prep_save_path = os.path.join(UPLOAD_FOLDER, prep_filename)

    # Convert float normalized [0, 1] to uint8 [0, 255] RGB for saving
    prep_uint8 = np.uint8(preprocessed * 255)
    prep_bgr = cv2.cvtColor(prep_uint8, cv2.COLOR_RGB2BGR)
    cv2.imwrite(prep_save_path, prep_bgr)

    # Generate Grad-CAM heatmap
    gradcam_filename = None
    gradcam_save_path = None
    gradcam_info = None

    if generate_gradcam:
        try:
            heatmap = compute_gradcam_heatmap(model, input_tensor, target_class_idx=pred_class_idx)
            _, overlay_rgb = generate_gradcam_overlay(prep_uint8, heatmap)

            gradcam_filename = f"gradcam_{unique_id}_{os.path.basename(image_path)}"
            gradcam_save_path = os.path.join(UPLOAD_FOLDER, gradcam_filename)
            overlay_bgr = cv2.cvtColor(overlay_rgb, cv2.COLOR_RGB2BGR)
            cv2.imwrite(gradcam_save_path, overlay_bgr)

            gradcam_info = explain_gradcam_regions(pred_class_idx)
        except Exception as e:
            # Saliency map error shouldn't crash primary prediction
            gradcam_info = {"error": f"Grad-CAM generation skipped: {str(e)}"}

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    # Class details
    class_info = CLASS_DETAILS[pred_class_idx]

    # Format class-wise probability breakdown
    probability_breakdown = []
    for idx, prob in enumerate(probabilities):
        probability_breakdown.append({
            "class_id": idx,
            "name": CLASS_NAMES[idx],
            "short_name": CLASS_SHORT_NAMES[idx],
            "probability": round(float(prob) * 100, 2),
            "raw_score": float(prob),
            "color": CLASS_DETAILS[idx]["color"]
        })

    # Save to SQLite
    pred_id = None
    if save_to_db:
        pred_id = save_prediction(
            filename=os.path.basename(image_path),
            image_path=image_path,
            predicted_class=pred_class_idx,
            class_name=CLASS_NAMES[pred_class_idx],
            confidence=confidence,
            probabilities=probabilities,
            processing_time_ms=elapsed_ms,
            preprocessed_path=prep_save_path,
            gradcam_path=gradcam_save_path,
            model_version=os.path.basename(_LOADED_MODEL_PATH or "dr_model.keras")
        )

    # Uncertainty flag
    is_uncertain = confidence < 0.50

    return {
        "id": pred_id,
        "filename": os.path.basename(image_path),
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "dimensions": {"width": orig_w, "height": orig_h, "channels": 3},
        "predicted_class": pred_class_idx,
        "class_name": CLASS_NAMES[pred_class_idx],
        "short_name": CLASS_SHORT_NAMES[pred_class_idx],
        "confidence_percentage": round(confidence * 100, 2),
        "confidence_score": round(confidence, 4),
        "is_uncertain": is_uncertain,
        "uncertainty_note": "Model prediction confidence is below 50%. Manual clinical review is strongly advised." if is_uncertain else None,
        "urgency": class_info["urgency"],
        "description": class_info["description"],
        "lesions": class_info["lesions"],
        "clinical_action": class_info["clinical_action"],
        "color": class_info["color"],
        "probabilities": probability_breakdown,
        "preprocessed_image_url": f"/api/uploads/{prep_filename}",
        "gradcam_image_url": f"/api/uploads/{gradcam_filename}" if gradcam_filename else None,
        "gradcam_info": gradcam_info,
        "processing_time_ms": elapsed_ms,
        "model_version": os.path.basename(_LOADED_MODEL_PATH or "dr_model.keras"),
        "medical_disclaimer": MEDICAL_DISCLAIMER
    }
