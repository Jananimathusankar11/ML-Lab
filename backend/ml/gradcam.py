"""
RetinaAI - Gradient-Weighted Class Activation Mapping (Grad-CAM)
Generates visual explanations for model predictions:
- Identifies discriminative regions in retinal fundus photography
- Computes gradients of the target class score with respect to the last convolutional feature map
- Overlays thermal activation heatmap over the preprocessed retinal photograph
"""

import os
import cv2
import numpy as np
import tensorflow as tf
from typing import Optional, Tuple, Dict, Any

def find_last_conv_layer(model: tf.keras.Model) -> Optional[str]:
    """Find the name of the final convolutional layer in the network."""
    for layer in reversed(model.layers):
        if "conv" in layer.name.lower():
            return layer.name
    return None

def compute_gradcam_heatmap(
    model: tf.keras.Model,
    img_array: np.ndarray,
    target_class_idx: Optional[int] = None,
    conv_layer_name: Optional[str] = None
) -> np.ndarray:
    """
    Compute Grad-CAM heatmap for a preprocessed input image batch.
    - img_array: Shape (1, 224, 224, 3), float32 in [0, 1]
    """
    if conv_layer_name is None:
        conv_layer_name = find_last_conv_layer(model)
        if not conv_layer_name:
            raise ValueError("No convolutional layer found in the given model.")

    # Create sub-model that outputs both the target layer's activations and predictions
    grad_model = tf.keras.models.Model(
        inputs=[model.inputs],
        outputs=[model.get_layer(conv_layer_name).output, model.output]
    )

    # Convert numpy array to tensor if needed
    img_tensor = tf.cast(img_array, tf.float32)

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(img_tensor)
        if target_class_idx is None:
            target_class_idx = tf.argmax(predictions[0])
        class_channel = predictions[:, target_class_idx]

    # Compute gradient of class score with respect to feature map activations
    grads = tape.gradient(class_channel, conv_outputs)

    # Global average pooling of gradients (importance weights for each channel)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # Multiply each channel in the feature map array by 'how important this channel is'
    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)

    # Apply ReLU to retain only features that contribute positively to the class of interest
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
    return heatmap.numpy()

def generate_gradcam_overlay(
    original_image: np.ndarray,
    heatmap: np.ndarray,
    alpha: float = 0.45,
    colormap: int = cv2.COLORMAP_JET
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Superimpose Grad-CAM heatmap over the retinal image:
    Returns (raw_colored_heatmap, blended_overlay) in uint8 RGB format.
    """
    # Resize heatmap to match image dimensions
    h, w = original_image.shape[:2]
    resized_heatmap = cv2.resize(heatmap, (w, h))

    # Convert to 8-bit unsigned integer (0-255)
    heatmap_uint8 = np.uint8(255 * resized_heatmap)

    # Apply pseudo-color map (Jet colormap: Blue = Low, Yellow/Red = High salience)
    colored_heatmap = cv2.applyColorMap(heatmap_uint8, colormap)
    colored_heatmap_rgb = cv2.cvtColor(colored_heatmap, cv2.COLOR_BGR2RGB)

    # Ensure original image is uint8 RGB
    if original_image.dtype != np.uint8:
        if original_image.max() <= 1.0:
            orig_uint8 = np.uint8(original_image * 255)
        else:
            orig_uint8 = np.uint8(original_image)
    else:
        orig_uint8 = original_image

    # Alpha blending: Superimpose heatmap over retinal fundus photo
    overlay = cv2.addWeighted(colored_heatmap_rgb, alpha, orig_uint8, 1 - alpha, 0)
    return colored_heatmap_rgb, overlay

def explain_gradcam_regions(class_idx: int) -> Dict[str, str]:
    """
    Clinical educational guidance for interpreting heatmaps across DR severity grades.
    """
    explanations = {
        0: "Heatmap highlights normal retinal vascular arcades and optic disc baseline landmarks.",
        1: "Warm salience areas (red/yellow) correlate with detected focal microaneurysms.",
        2: "Heatmap focuses on clusters of hard lipid exudates and intraretinal blot hemorrhages.",
        3: "Concentrated activation across multiple quadrants reflecting extensive hemorrhages and venous beading.",
        4: "Strong focal salience over neovascularization complexes and preretinal proliferative changes."
    }
    return {
        "interpretation": explanations.get(class_idx, "Discriminative retinal regions identified by deep CNN."),
        "disclaimer": "Grad-CAM visualizes network attention patterns for academic research and does not replace ophthalmological diagnostic confirmation."
    }
