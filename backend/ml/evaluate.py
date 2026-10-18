"""
RetinaAI - Model Evaluation Pipeline
Performs rigorous evaluation on held-out test sets:
- Multi-class Confusion Matrix calculation
- Precision, Recall, Specificity, and F1-score (Macro & Weighted)
- Per-class clinical grading diagnostic performance
- Class imbalance impact explanation
- Test data leakage prevention
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional
from ml.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
    train_test_split
)

from config import (
    SAVED_MODELS_FOLDER,
    CLASS_NAMES,
    CLASS_SHORT_NAMES,
    CLASS_DETAILS,
    RANDOM_SEED
)
from database import save_evaluation, get_latest_evaluation
from ml.preprocess import preprocess_image, TARGET_IMAGE_SIZE
from ml.dataset_loader import scan_and_validate_dataset, detect_dataset_format

def evaluate_model_on_test_set(
    model,
    dataset_dir: Optional[str] = None,
    test_split_ratio: float = 0.15,
    save_results: bool = True
) -> Dict[str, Any]:
    """
    Evaluate trained model against held-out test data split:
    1. Ingest dataset and split with stratification
    2. Preprocess test images identically to training
    3. Run batch prediction
    4. Compute Scikit-learn medical metrics
    5. Save results to database and JSON artifacts
    """
    stats = scan_and_validate_dataset(dataset_dir)
    if not stats.get("valid"):
        raise ValueError(f"Cannot evaluate: {stats.get('error', 'Dataset is invalid')}")

    # Check for existing test_split.csv or create stratified split
    dataset_dir = stats["dataset_dir"]
    fmt = detect_dataset_format(dataset_dir)

    test_images = []
    test_labels = []

    if fmt["format"] == "csv_labels":
        csv_path = fmt["csv_path"]
        img_dir = fmt["images_dir"]
        df = pd.read_csv(csv_path)

        id_col = df.columns[0]
        diag_col = df.columns[1]

        # Check if saved_models/test_split.csv exists
        saved_test_csv = os.path.join(SAVED_MODELS_FOLDER, "test_split.csv")
        test_df = None
        if os.path.exists(saved_test_csv):
            try:
                test_df = pd.read_csv(saved_test_csv)
            except Exception:
                test_df = None

        if test_df is None or len(test_df) == 0:
            # Stratified sampling using pandas
            test_df = df.groupby(diag_col, group_keys=False).apply(
                lambda x: x.sample(max(1, int(len(x) * test_split_ratio)), random_state=RANDOM_SEED)
            )

        # Ingest test images
        for _, row in test_df.iterrows():
            iid = str(row[id_col]).strip()
            diag = int(float(row[diag_col]))
            for ext in [".png", ".jpg", ".jpeg", ""]:
                p = os.path.join(img_dir, f"{iid}{ext}")
                if os.path.exists(p):
                    test_images.append(p)
                    test_labels.append(diag)
                    break

    elif fmt["format"] == "class_subfolders":
        # Subfolder format: take last 15% of images from each class
        for i in range(5):
            for subdir in fmt["subfolders"]:
                if str(i) in subdir.lower() or CLASS_SHORT_NAMES[i].lower() in subdir.lower():
                    sub_p = os.path.join(dataset_dir, subdir)
                    files = [os.path.join(sub_p, f) for f in os.listdir(sub_p) if f.lower().endswith((".png", ".jpg", ".jpeg"))]
                    split_idx = int(len(files) * (1 - test_split_ratio))
                    for f in files[split_idx:]:
                        test_images.append(f)
                        test_labels.append(i)
                    break

    if len(test_images) == 0:
        raise ValueError("No valid test images could be loaded for evaluation.")

    # Batch preprocess test images
    X_test = []
    y_test = []

    for img_path, label in zip(test_images, test_labels):
        try:
            prep = preprocess_image(img_path, target_size=TARGET_IMAGE_SIZE)
            X_test.append(prep)
            y_test.append(label)
        except Exception:
            continue

    X_test = np.array(X_test, dtype=np.float32)
    y_test = np.array(y_test, dtype=np.int32)

    # Model inference
    preds_prob = model.predict(X_test, verbose=0)
    y_pred = np.argmax(preds_prob, axis=1)

    # Compute Metrics
    acc = float(accuracy_score(y_test, y_pred))
    macro_prec = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    macro_rec = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    weighted_f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

    # Confusion Matrix (5x5)
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1, 2, 3, 4]).tolist()

    # Per-Class Precision, Recall, F1
    per_class_prec = precision_score(y_test, y_pred, average=None, labels=[0, 1, 2, 3, 4], zero_division=0).tolist()
    per_class_rec = recall_score(y_test, y_pred, average=None, labels=[0, 1, 2, 3, 4], zero_division=0).tolist()
    per_class_f1 = f1_score(y_test, y_pred, average=None, labels=[0, 1, 2, 3, 4], zero_division=0).tolist()

    class_metrics = []
    for i in range(5):
        support = int((y_test == i).sum())
        class_metrics.append({
            "class_id": i,
            "name": CLASS_NAMES[i],
            "short_name": CLASS_SHORT_NAMES[i],
            "precision": round(per_class_prec[i] * 100, 2),
            "recall": round(per_class_rec[i] * 100, 2),
            "f1_score": round(per_class_f1[i] * 100, 2),
            "support": support,
            "color": CLASS_DETAILS[i]["color"]
        })

    # Sklearn classification report dictionary
    cr_dict = classification_report(
        y_test, y_pred,
        labels=[0, 1, 2, 3, 4],
        target_names=CLASS_SHORT_NAMES,
        output_dict=True,
        zero_division=0
    )

    result_payload = {
        "model_version": getattr(model, "name", "dr_model.keras"),
        "timestamp": pd.Timestamp.now().strftime("%Y-%m-%d %H:%M:%S"),
        "test_samples_count": len(y_test),
        "accuracy": round(acc * 100, 2),
        "accuracy_raw": acc,
        "macro_precision": round(macro_prec * 100, 2),
        "macro_recall": round(macro_rec * 100, 2),
        "macro_f1": round(macro_f1 * 100, 2),
        "weighted_f1": round(weighted_f1 * 100, 2),
        "confusion_matrix": cm,
        "class_metrics": class_metrics,
        "classification_report": cr_dict,
        "class_names": CLASS_SHORT_NAMES,
        "clinical_notes": (
            "In diabetic retinopathy diagnosis, recall (sensitivity) on Class 3 (Severe) and Class 4 "
            "(Proliferative DR) is clinically paramount to prevent catastrophic blindness. "
            "Macro F1 gives equal weight to all severity grades, ensuring rare high-risk stages are not obscured by majority No-DR classes."
        )
    }

    # Save to SQLite
    if save_results:
        save_evaluation(result_payload)

        # Export evaluation_metrics.json artifact
        eval_json_path = os.path.join(SAVED_MODELS_FOLDER, "evaluation_metrics.json")
        try:
            with open(eval_json_path, "w") as f:
                json.dump(result_payload, f, indent=2)
        except Exception:
            pass

    return result_payload

def load_or_generate_evaluation(model) -> Dict[str, Any]:
    """Retrieve existing evaluation from database or JSON, or generate if pending."""
    # Check database first
    latest = get_latest_evaluation()
    if latest:
        return latest

    # Check JSON file in saved_models
    json_path = os.path.join(SAVED_MODELS_FOLDER, "evaluation_metrics.json")
    if os.path.exists(json_path):
        try:
            with open(json_path, "r") as f:
                data = json.load(f)
                return data
        except Exception:
            pass

    # If neither exists, evaluate on test set
    return evaluate_model_on_test_set(model)
