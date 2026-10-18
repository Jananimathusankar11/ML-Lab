"""
RetinaAI - Background Model Training Pipeline
Orchestrates TensorFlow training runs without blocking Flask HTTP event loop:
- Stratified dataset ingestion (70% train / 15% val / 15% test)
- Data augmentation applied exclusively to training set
- Class weight compensation for imbalanced severity distribution
- Custom Keras Callback emitting epoch-wise progress & metrics
- Best model checkpointing & automatic post-training test evaluation
- Non-blocking daemon worker thread with live status API
"""

import os
import time
import json
import threading
import numpy as np
import pandas as pd
import tensorflow as tf
from ml.metrics import train_test_split, compute_class_weights
from typing import Dict, Any, Optional

from config import (
    SAVED_MODELS_FOLDER,
    DEFAULT_MODEL_PATH,
    RANDOM_SEED,
    TARGET_IMAGE_SIZE
)
from database import save_training_run
from ml.preprocess import preprocess_image
from ml.dataset_loader import scan_and_validate_dataset, detect_dataset_format
from ml.model import build_custom_cnn, build_transfer_learning_model
from ml.evaluate import evaluate_model_on_test_set

# Global Training State Dictionary (thread-safe reads)
TRAINING_STATE = {
    "status": "idle",       # "idle", "running", "completed", "failed", "stopped"
    "progress": 0.0,
    "current_epoch": 0,
    "total_epochs": 0,
    "current_step": 0,
    "total_steps": 0,
    "model_architecture": "Custom CNN",
    "metrics": {
        "train_acc": [],
        "val_acc": [],
        "train_loss": [],
        "val_loss": []
    },
    "current_metrics": {
        "train_acc": 0.0,
        "val_acc": 0.0,
        "train_loss": 0.0,
        "val_loss": 0.0
    },
    "logs": [],
    "start_time": None,
    "end_time": None,
    "error_message": None,
    "should_stop": False
}

TRAINING_LOCK = threading.Lock()

def get_training_status() -> Dict[str, Any]:
    """Retrieve snapshot of current training status."""
    with TRAINING_LOCK:
        # Shallow copy of dictionary
        return dict(TRAINING_STATE)

def stop_training():
    """Signal training worker to halt gracefully."""
    with TRAINING_LOCK:
        TRAINING_STATE["should_stop"] = True

class LiveMetricsCallback(tf.keras.callbacks.Callback):
    """Custom callback reporting epoch-by-epoch loss and accuracy to TRAINING_STATE."""

    def __init__(self, total_epochs: int):
        super().__init__()
        self.total_epochs = total_epochs

    def on_epoch_begin(self, epoch, logs=None):
        with TRAINING_LOCK:
            TRAINING_STATE["current_epoch"] = epoch + 1
            log_entry = f"Epoch {epoch + 1}/{self.total_epochs} started..."
            TRAINING_STATE["logs"].append(log_entry)
            if len(TRAINING_STATE["logs"]) > 100:
                TRAINING_STATE["logs"].pop(0)

    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        tr_acc = float(logs.get("accuracy", 0.0))
        val_acc = float(logs.get("val_accuracy", 0.0))
        tr_loss = float(logs.get("loss", 0.0))
        val_loss = float(logs.get("val_loss", 0.0))

        with TRAINING_LOCK:
            TRAINING_STATE["progress"] = round(((epoch + 1) / self.total_epochs) * 100, 1)
            TRAINING_STATE["metrics"]["train_acc"].append(round(tr_acc * 100, 2))
            TRAINING_STATE["metrics"]["val_acc"].append(round(val_acc * 100, 2))
            TRAINING_STATE["metrics"]["train_loss"].append(round(tr_loss, 4))
            TRAINING_STATE["metrics"]["val_loss"].append(round(val_loss, 4))

            TRAINING_STATE["current_metrics"] = {
                "train_acc": round(tr_acc * 100, 2),
                "val_acc": round(val_acc * 100, 2),
                "train_loss": round(tr_loss, 4),
                "val_loss": round(val_loss, 4)
            }

            log_msg = f"Epoch {epoch + 1}: Train Acc={tr_acc*100:.1f}%, Val Acc={val_acc*100:.1f}%, Train Loss={tr_loss:.4f}, Val Loss={val_loss:.4f}"
            TRAINING_STATE["logs"].append(log_msg)

            if TRAINING_STATE["should_stop"]:
                self.model.stop_training = True
                TRAINING_STATE["logs"].append("Training halted by user request.")

def _train_worker(
    dataset_dir: str,
    architecture: str,
    epochs: int,
    batch_size: int,
    learning_rate: float
):
    """Worker function executed inside background thread."""
    global TRAINING_STATE

    try:
        with TRAINING_LOCK:
            TRAINING_STATE["status"] = "running"
            TRAINING_STATE["progress"] = 0.0
            TRAINING_STATE["current_epoch"] = 0
            TRAINING_STATE["total_epochs"] = epochs
            TRAINING_STATE["model_architecture"] = architecture
            TRAINING_STATE["metrics"] = {"train_acc": [], "val_acc": [], "train_loss": [], "val_loss": []}
            TRAINING_STATE["logs"] = [f"Ingesting retinal dataset from '{dataset_dir}'..."]
            TRAINING_STATE["start_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            TRAINING_STATE["error_message"] = None
            TRAINING_STATE["should_stop"] = False

        # Ingest dataset
        fmt = detect_dataset_format(dataset_dir)
        if not fmt["valid"]:
            raise ValueError(fmt.get("message", "Invalid dataset"))

        image_paths = []
        labels = []

        if fmt["format"] == "csv_labels":
            df = pd.read_csv(fmt["csv_path"])
            id_col = df.columns[0]
            diag_col = df.columns[1]
            img_dir = fmt["images_dir"]

            for _, row in df.iterrows():
                iid = str(row[id_col]).strip()
                diag = int(float(row[diag_col]))
                for ext in [".png", ".jpg", ".jpeg", ""]:
                    p = os.path.join(img_dir, f"{iid}{ext}")
                    if os.path.exists(p):
                        image_paths.append(p)
                        labels.append(diag)
                        break

        elif fmt["format"] == "class_subfolders":
            for i in range(5):
                for subdir in fmt["subfolders"]:
                    if str(i) in subdir.lower() or str(i) in subdir:
                        sub_p = os.path.join(dataset_dir, subdir)
                        files = [os.path.join(sub_p, f) for f in os.listdir(sub_p) if f.lower().endswith((".png", ".jpg", ".jpeg"))]
                        for f in files:
                            image_paths.append(f)
                            labels.append(i)
                        break

        if len(image_paths) == 0:
            raise ValueError("No images found in dataset directory.")

        with TRAINING_LOCK:
            TRAINING_STATE["logs"].append(f"Loaded {len(image_paths)} verified images. Preprocessing arrays...")

        # Batch load & preprocess
        X = []
        y = []
        for p, label in zip(image_paths, labels):
            try:
                prep = preprocess_image(p, target_size=TARGET_IMAGE_SIZE)
                X.append(prep)
                y.append(label)
            except Exception:
                continue

        X = np.array(X, dtype=np.float32)
        y = np.array(y, dtype=np.int32)

        # Stratified Split: 70% Train, 15% Validation, 15% Test
        # Avoid data leakage: held-out test split is completely untouched
        X_train_val, X_test, y_train_val, y_test = train_test_split(
            X, y, test_size=0.15, random_state=RANDOM_SEED, stratify=y
        )
        val_ratio_of_train = 0.15 / 0.85
        X_train, X_val, y_train, y_val = train_test_split(
            X_train_val, y_train_val, test_size=val_ratio_of_train, random_state=RANDOM_SEED, stratify=y_train_val
        )

        with TRAINING_LOCK:
            TRAINING_STATE["logs"].append(
                f"Data Split: Train={len(X_train)}, Validation={len(X_val)}, Held-out Test={len(X_test)}"
            )

        # Compute balanced class weights for imbalanced medical data
        unique_classes = np.unique(y_train)
        class_weight_dict = compute_class_weights(unique_classes, y_train)

        with TRAINING_LOCK:
            TRAINING_STATE["logs"].append(f"Class Weights applied: {class_weight_dict}")

        # Build CNN Model
        with TRAINING_LOCK:
            TRAINING_STATE["logs"].append(f"Compiling {architecture} architecture...")

        if architecture in ["MobileNetV2", "EfficientNetB0"]:
            model = build_transfer_learning_model(
                architecture=architecture,
                input_shape=(224, 224, 3),
                num_classes=5,
                learning_rate=learning_rate
            )
        else:
            model = build_custom_cnn(
                input_shape=(224, 224, 3),
                num_classes=5,
                learning_rate=learning_rate
            )

        # Data augmentation applied strictly on training images
        datagen = tf.keras.preprocessing.image.ImageDataGenerator(
            rotation_range=20,
            horizontal_flip=True,
            vertical_flip=True,
            zoom_range=0.15,
            fill_mode="constant",
            cval=0.0
        )
        train_generator = datagen.flow(X_train, y_train, batch_size=batch_size, shuffle=True)

        # Callbacks
        metrics_callback = LiveMetricsCallback(total_epochs=epochs)
        early_stop = tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=6, restore_best_weights=True, verbose=0
        )

        # Train model
        steps_per_epoch = max(1, len(X_train) // batch_size)
        history = model.fit(
            train_generator,
            steps_per_epoch=steps_per_epoch,
            epochs=epochs,
            validation_data=(X_val, y_val),
            class_weight=class_weight_dict,
            callbacks=[metrics_callback, early_stop],
            verbose=0
        )

        # Save Best Model Artifact
        os.makedirs(SAVED_MODELS_FOLDER, exist_ok=True)
        model.save(DEFAULT_MODEL_PATH)

        # Run Held-Out Test Evaluation
        with TRAINING_LOCK:
            TRAINING_STATE["logs"].append("Model saved to disk. Running independent test set evaluation...")

        eval_result = evaluate_model_on_test_set(model, dataset_dir=dataset_dir, save_results=True)

        # Record training experiment in SQLite
        final_tr_acc = float(history.history["accuracy"][-1]) if "accuracy" in history.history else 0.0
        final_val_acc = float(history.history["val_accuracy"][-1]) if "val_accuracy" in history.history else 0.0
        final_tr_loss = float(history.history["loss"][-1]) if "loss" in history.history else 0.0
        final_val_loss = float(history.history["val_loss"][-1]) if "val_loss" in history.history else 0.0

        save_training_run({
            "model_architecture": architecture,
            "epochs": epochs,
            "batch_size": batch_size,
            "learning_rate": learning_rate,
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "final_train_acc": round(final_tr_acc * 100, 2),
            "final_val_acc": round(final_val_acc * 100, 2),
            "final_train_loss": round(final_tr_loss, 4),
            "final_val_loss": round(final_val_loss, 4),
            "history": {
                "train_acc": [round(a * 100, 2) for a in history.history.get("accuracy", [])],
                "val_acc": [round(a * 100, 2) for a in history.history.get("val_accuracy", [])],
                "train_loss": [round(l, 4) for l in history.history.get("loss", [])],
                "val_loss": [round(l, 4) for l in history.history.get("val_loss", [])]
            },
            "status": "completed"
        })

        # Save training history JSON
        history_path = os.path.join(SAVED_MODELS_FOLDER, "training_history.json")
        try:
            with open(history_path, "w") as f:
                json.dump({
                    "epochs": epochs,
                    "architecture": architecture,
                    "accuracy": [round(a * 100, 2) for a in history.history.get("accuracy", [])],
                    "val_accuracy": [round(a * 100, 2) for a in history.history.get("val_accuracy", [])],
                    "loss": [round(l, 4) for l in history.history.get("loss", [])],
                    "val_loss": [round(l, 4) for l in history.history.get("val_loss", [])],
                    "test_accuracy": eval_result.get("accuracy", 0.0)
                }, f, indent=2)
        except Exception:
            pass

        with TRAINING_LOCK:
            TRAINING_STATE["status"] = "completed"
            TRAINING_STATE["progress"] = 100.0
            TRAINING_STATE["end_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            TRAINING_STATE["logs"].append(
                f"Training complete! Test Set Accuracy: {eval_result.get('accuracy')}%, Macro F1: {eval_result.get('macro_f1')}%"
            )

    except Exception as e:
        import traceback
        err_str = f"Training failed: {str(e)}\n{traceback.format_exc()}"
        with TRAINING_LOCK:
            TRAINING_STATE["status"] = "failed"
            TRAINING_STATE["error_message"] = str(e)
            TRAINING_STATE["logs"].append(err_str)

def start_training_in_background(
    dataset_dir: str,
    architecture: str = "Custom CNN",
    epochs: int = 15,
    batch_size: int = 16,
    learning_rate: float = 0.0005
) -> bool:
    """Launch asynchronous training thread."""
    with TRAINING_LOCK:
        if TRAINING_STATE["status"] == "running":
            return False  # Already in progress

    thread = threading.Thread(
        target=_train_worker,
        args=(dataset_dir, architecture, epochs, batch_size, learning_rate),
        daemon=True
    )
    thread.start()
    return True
