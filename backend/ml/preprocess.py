"""
RetinaAI - Image Preprocessing Pipeline
Specialized medical image preprocessing for retinal fundus photography:
- Circular mask extraction & margin cropping
- Contrast Limited Adaptive Histogram Equalization (CLAHE) in LAB color space
- Ben Graham's method (Gaussian blur illumination correction)
- Standardized resizing to 224x224 pixels
- Dynamic float normalization
"""

import os
import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Dict, Any

TARGET_IMAGE_SIZE = (224, 224)

def load_retinal_image(image_path: str) -> np.ndarray:
    """Load an image from disk and guarantee 3-channel RGB format."""
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at path: {image_path}")

    # Read image using OpenCV
    img = cv2.imread(image_path)
    if img is None:
        # Fallback to PIL in case of exotic image format
        pil_img = Image.open(image_path).convert("RGB")
        return np.array(pil_img)

    # Convert BGR (OpenCV default) to RGB
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    return img_rgb

def crop_circular_fundus(image: np.ndarray, tolerance: int = 15) -> np.ndarray:
    """
    Remove uninformative black camera borders by detecting the fundus circle.
    """
    # Convert to grayscale to locate dark borders
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    mask = gray > tolerance

    # If the mask covers the image or failed, return original
    if not mask.any():
        return image

    # Find coordinates of active fundus region
    row_nonzero = np.where(mask.any(axis=1))[0]
    col_nonzero = np.where(mask.any(axis=0))[0]

    if len(row_nonzero) == 0 or len(col_nonzero) == 0:
        return image

    rmin, rmax = row_nonzero[0], row_nonzero[-1]
    cmin, cmax = col_nonzero[0], col_nonzero[-1]

    # Crop bounding box of fundus
    cropped = image[rmin:rmax + 1, cmin:cmax + 1]
    return cropped

def apply_clahe(image: np.ndarray, clip_limit: float = 2.5, tile_grid_size: Tuple[int, int] = (8, 8)) -> np.ndarray:
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) in LAB color space.
    Enhances contrast on the Luminance (L) channel while keeping color fidelity (A & B channels).
    Crucial for accentuating microaneurysms and hard exudates.
    """
    lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
    enhanced_l = clahe.apply(l_channel)

    merged_lab = cv2.merge([enhanced_l, a_channel, b_channel])
    enhanced_rgb = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2RGB)
    return enhanced_rgb

def apply_ben_graham_filter(image: np.ndarray, sigma: int = 10) -> np.ndarray:
    """
    Ben Graham's method (standard for Kaggle APTOS and EyePACS):
    Subtracts local average color via Gaussian blur to normalize illumination across fundus photos.
    """
    # Rescaled image weighted addition
    blurred = cv2.GaussianBlur(image, (0, 0), sigma)
    normalized = cv2.addWeighted(image, 4, blurred, -4, 128)
    return normalized

def preprocess_image(
    image_input,
    target_size: Tuple[int, int] = TARGET_IMAGE_SIZE,
    apply_crop: bool = True,
    apply_clahe_flag: bool = True,
    apply_ben_graham_flag: bool = False
) -> np.ndarray:
    """
    Standard preprocessing pipeline used consistently for both training and real-time prediction.
    Returns normalized float32 image array with shape (224, 224, 3) and values in [0, 1].
    """
    if isinstance(image_input, str):
        img = load_retinal_image(image_input)
    elif isinstance(image_input, np.ndarray):
        img = image_input.copy()
    elif isinstance(image_input, Image.Image):
        img = np.array(image_input.convert("RGB"))
    else:
        raise ValueError(f"Unsupported image input type: {type(image_input)}")

    # 1. Circular margin crop
    if apply_crop:
        img = crop_circular_fundus(img)

    # 2. Resize to canonical target dimension
    img = cv2.resize(img, target_size, interpolation=cv2.INTER_AREA)

    # 3. Contrast / Illumination enhancement
    if apply_clahe_flag:
        img = apply_clahe(img)
    elif apply_ben_graham_flag:
        img = apply_ben_graham_filter(img)

    # 4. Pixel normalization to [0.0, 1.0]
    normalized = img.astype(np.float32) / 255.0
    return normalized

def generate_preprocessing_steps(image_path: str) -> Dict[str, Any]:
    """
    Generate step-by-step visualizations of each preprocessing phase for the UI:
    1. Original Image
    2. Circular Border Cropped
    3. Resized (224x224)
    4. CLAHE Enhanced (LAB space)
    5. Ben Graham Illumination Filtered
    """
    original = load_retinal_image(image_path)
    orig_h, orig_w, orig_c = original.shape

    # Step 1: Crop
    cropped = crop_circular_fundus(original)
    crop_h, crop_w, _ = cropped.shape

    # Step 2: Resize
    resized = cv2.resize(cropped, TARGET_IMAGE_SIZE, interpolation=cv2.INTER_AREA)

    # Step 3: CLAHE
    clahe_img = apply_clahe(resized)

    # Step 4: Ben Graham
    ben_img = apply_ben_graham_filter(resized)

    return {
        "original_dimensions": {"width": orig_w, "height": orig_h, "channels": orig_c},
        "cropped_dimensions": {"width": crop_w, "height": crop_h},
        "target_dimensions": {"width": TARGET_IMAGE_SIZE[0], "height": TARGET_IMAGE_SIZE[1], "channels": 3},
        "steps": [
            {
                "name": "1. Raw Retinal Fundus",
                "description": "Original high-resolution fundus photograph as acquired by fundus camera.",
                "image": original
            },
            {
                "name": "2. Circular Margin Cropping",
                "description": "Removes non-informative black circular border mask to focus only on retinal tissue.",
                "image": cropped
            },
            {
                "name": "3. Canonical Resizing (224x224)",
                "description": "Interpolated scaling with anti-aliasing to standardize CNN tensor input dimensions.",
                "image": resized
            },
            {
                "name": "4. CLAHE Contrast Enhancement",
                "description": "Contrast Limited Adaptive Histogram Equalization in LAB space; highlights microaneurysms.",
                "image": clahe_img
            },
            {
                "name": "5. Ben Graham Illumination Normalization",
                "description": "Gaussian blur high-pass subtraction; standardizes uneven lighting across different patient scans.",
                "image": ben_img
            }
        ]
    }
