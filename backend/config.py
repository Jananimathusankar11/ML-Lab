"""
RetinaAI - Backend Configuration
Diabetic Retinopathy Detection and Analysis System
"""

import os
from pathlib import Path

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Storage Directories
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
REPORTS_FOLDER = os.path.join(BASE_DIR, "reports")
SAVED_MODELS_FOLDER = os.path.join(BASE_DIR, "saved_models")
DATA_FOLDER = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_FOLDER, "retina_ai.db")

# Ensure required directories exist
for folder in [UPLOAD_FOLDER, REPORTS_FOLDER, SAVED_MODELS_FOLDER, DATA_FOLDER]:
    os.makedirs(folder, exist_ok=True)

# Dataset Paths
# Primary verified existing dataset locations
DEFAULT_DATASET_CANDIDATES = [
    r"C:\Users\Janani\Downloads\diabetic\dataset",
    r"C:\Users\Janani\.gemini\antigravity\scratch\diabetic_retinopathy_app\dataset",
]

# Configurable Active Dataset Path
ACTIVE_DATASET_DIR = os.getenv(
    "RETINA_DATASET_DIR",
    DEFAULT_DATASET_CANDIDATES[0] if os.path.exists(DEFAULT_DATASET_CANDIDATES[0]) else ""
)

# Active Trained Model Path
DEFAULT_MODEL_PATH = os.path.join(SAVED_MODELS_FOLDER, "dr_model.keras")

# ML Hyperparameters & Defaults
IMAGE_SIZE = (224, 224)
TARGET_IMAGE_SIZE = IMAGE_SIZE
BATCH_SIZE = 16
DEFAULT_EPOCHS = 15
DEFAULT_LEARNING_RATE = 0.0005
RANDOM_SEED = 42

# Allowed file extensions
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

# Clinical Severity Classes (APTOS 2019 / International Scale)
CLASS_NAMES = [
    "No Diabetic Retinopathy",
    "Mild",
    "Moderate",
    "Severe",
    "Proliferative Diabetic Retinopathy"
]

CLASS_SHORT_NAMES = [
    "No DR",
    "Mild",
    "Moderate",
    "Severe",
    "Proliferative DR"
]

CLASS_DETAILS = {
    0: {
        "id": 0,
        "name": "No Diabetic Retinopathy",
        "short": "No DR",
        "color": "#34D399",  # Emerald / Green
        "description": "Clear fundus with normal retinal vasculature, healthy optic disc, and macula. No visible microaneurysms or hemorrhages.",
        "lesions": "None detected",
        "urgency": "Routine",
        "clinical_action": "Annual dilated eye screening recommended for diabetic patients as part of preventative care."
    },
    1: {
        "id": 1,
        "name": "Mild Diabetic Retinopathy",
        "short": "Mild",
        "color": "#38BDF8",  # Sky Blue
        "description": "Earliest stage of diabetic retinopathy. Characterized by the presence of microaneurysms only (small saccular outpouchings in capillary walls).",
        "lesions": "Isolated retinal microaneurysms (< 5)",
        "urgency": "Non-urgent monitoring",
        "clinical_action": "Comprehensive eye exam within 6 to 12 months. Optimize glycemic, lipid, and blood pressure control."
    },
    2: {
        "id": 2,
        "name": "Moderate Diabetic Retinopathy",
        "short": "Moderate",
        "color": "#FBBF24",  # Amber / Warning
        "description": "Intermediate stage with visible progression. Shows microaneurysms, cotton wool spots, retinal blot hemorrhages, and lipid exudates.",
        "lesions": "Microaneurysms, intraretinal hemorrhages, hard exudates, cotton-wool spots",
        "urgency": "Moderate priority",
        "clinical_action": "Ophthalmology follow-up within 3 to 6 months. Evaluate for diabetic macular edema (DME) via OCT."
    },
    3: {
        "id": 3,
        "name": "Severe Diabetic Retinopathy",
        "short": "Severe",
        "color": "#FB923C",  # Orange
        "description": "High-risk non-proliferative retinopathy. Extensive intraretinal hemorrhages in all four quadrants, definite venous beading, or IRMA (4-2-1 rule).",
        "lesions": "Extensive hemorrhages in 4 quadrants, venous beading in 2+ quadrants, IRMA in 1+ quadrant",
        "urgency": "High priority",
        "clinical_action": "Urgent retinal specialist referral within 2 to 4 weeks. High probability of rapid progression to proliferative DR."
    },
    4: {
        "id": 4,
        "name": "Proliferative Diabetic Retinopathy",
        "short": "Proliferative DR",
        "color": "#FB7185",  # Rose / Alert
        "description": "Advanced, sight-threatening disease stage. Characterized by neovascularization (fragile abnormal new vessels) on disc (NVD) or elsewhere (NVE), and risk of vitreous hemorrhage.",
        "lesions": "Neovascularization, vitreous hemorrhage, preretinal hemorrhage, fibrous proliferation",
        "urgency": "Urgent / Sight-threatening",
        "clinical_action": "Immediate retinal specialist referral within 24-48 hours. Panretinal photocoagulation (PRP) or anti-VEGF therapy typically indicated."
    }
}

# Medical Disclaimer Text
MEDICAL_DISCLAIMER = (
    "RetinaAI is an academic and research prototype designed for educational demonstrations "
    "and computational medical imaging research. It is NOT a certified medical diagnostic device. "
    "Predictions and heatmaps produced by this software must NEVER replace an in-person clinical "
    "examination by an accredited ophthalmologist or qualified eye-care professional."
)
