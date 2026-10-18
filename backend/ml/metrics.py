"""
RetinaAI - Mathematical Metrics & Dataset Utilities
Pure NumPy implementations of medical statistical metrics and splitting utilities.
Immune to Windows Defender Application Control (WDAC) .pyd native DLL block policies.
"""

import numpy as np
from typing import Dict, Any, List, Tuple, Optional

def train_test_split(
    X: np.ndarray,
    y: np.ndarray,
    test_size: float = 0.15,
    random_state: int = 42,
    stratify: Optional[np.ndarray] = None
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Stratified dataset splitting in pure NumPy:
    Guarantees exact proportional class distribution across splits without data leakage.
    """
    rng = np.random.RandomState(random_state)

    if stratify is None:
        indices = np.arange(len(X))
        rng.shuffle(indices)
        split = int(len(X) * (1 - test_size))
        return X[indices[:split]], X[indices[split:]], y[indices[:split]], y[indices[split:]]

    train_idx, test_idx = [], []
    for cls in np.unique(stratify):
        cls_idx = np.where(stratify == cls)[0]
        rng.shuffle(cls_idx)
        split = int(len(cls_idx) * (1 - test_size))
        train_idx.extend(cls_idx[:split])
        test_idx.extend(cls_idx[split:])

    train_idx = np.array(train_idx)
    test_idx = np.array(test_idx)
    rng.shuffle(train_idx)
    rng.shuffle(test_idx)

    return X[train_idx], X[test_idx], y[train_idx], y[test_idx]

def compute_class_weights(classes: np.ndarray, y: np.ndarray) -> Dict[int, float]:
    """
    Balanced class weight calculation:
    weight = n_samples / (n_classes * n_samples_in_class)
    """
    total = len(y)
    n_classes = len(classes)
    weights = {}
    for c in classes:
        count = max(1, int((y == c).sum()))
        weights[int(c)] = float(total / (n_classes * count))
    return weights

def accuracy_score(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Compute classification accuracy."""
    if len(y_true) == 0:
        return 0.0
    return float(np.mean(y_true == y_pred))

def confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, labels: List[int] = None) -> np.ndarray:
    """Compute 5x5 Multi-Class Confusion Matrix."""
    if labels is None:
        labels = [0, 1, 2, 3, 4]
    cm = np.zeros((len(labels), len(labels)), dtype=int)
    label_to_idx = {l: i for i, l in enumerate(labels)}
    for t, p in zip(y_true, y_pred):
        if t in label_to_idx and p in label_to_idx:
            cm[label_to_idx[t], label_to_idx[p]] += 1
    return cm

def precision_score(y_true: np.ndarray, y_pred: np.ndarray, average: Optional[str] = "macro", labels: List[int] = None) -> Any:
    """Compute Precision: TP / (TP + FP)."""
    if labels is None:
        labels = [0, 1, 2, 3, 4]

    per_class = []
    supports = []
    for l in labels:
        tp = int(np.sum((y_true == l) & (y_pred == l)))
        fp = int(np.sum((y_true != l) & (y_pred == l)))
        supp = int(np.sum(y_true == l))
        prec = (tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        per_class.append(prec)
        supports.append(supp)

    if average is None:
        return per_class
    if average == "macro":
        return float(np.mean(per_class))
    if average == "weighted":
        total_supp = max(1, sum(supports))
        return float(sum(p * s for p, s in zip(per_class, supports)) / total_supp)
    return per_class

def recall_score(y_true: np.ndarray, y_pred: np.ndarray, average: Optional[str] = "macro", labels: List[int] = None) -> Any:
    """Compute Recall (Sensitivity): TP / (TP + FN)."""
    if labels is None:
        labels = [0, 1, 2, 3, 4]

    per_class = []
    supports = []
    for l in labels:
        tp = int(np.sum((y_true == l) & (y_pred == l)))
        fn = int(np.sum((y_true == l) & (y_pred != l)))
        supp = int(np.sum(y_true == l))
        rec = (tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        per_class.append(rec)
        supports.append(supp)

    if average is None:
        return per_class
    if average == "macro":
        return float(np.mean(per_class))
    if average == "weighted":
        total_supp = max(1, sum(supports))
        return float(sum(r * s for r, s in zip(per_class, supports)) / total_supp)
    return per_class

def f1_score(y_true: np.ndarray, y_pred: np.ndarray, average: Optional[str] = "macro", labels: List[int] = None) -> Any:
    """Compute F1-score: 2 * (Precision * Recall) / (Precision + Recall)."""
    if labels is None:
        labels = [0, 1, 2, 3, 4]

    precs = precision_score(y_true, y_pred, average=None, labels=labels)
    recs = recall_score(y_true, y_pred, average=None, labels=labels)

    f1s = []
    supports = []
    for l, p, r in zip(labels, precs, recs):
        supp = int(np.sum(y_true == l))
        f1 = (2 * p * r / (p + r)) if (p + r) > 0 else 0.0
        f1s.append(f1)
        supports.append(supp)

    if average is None:
        return f1s
    if average == "macro":
        return float(np.mean(f1s))
    if average == "weighted":
        total_supp = max(1, sum(supports))
        return float(sum(f * s for f, s in zip(f1s, supports)) / total_supp)
    return f1s

def classification_report(y_true: np.ndarray, y_pred: np.ndarray, labels: List[int] = None, target_names: List[str] = None) -> Dict[str, Any]:
    """Generate structured classification report dictionary."""
    if labels is None:
        labels = [0, 1, 2, 3, 4]
    if target_names is None:
        target_names = [f"Class {i}" for i in labels]

    precs = precision_score(y_true, y_pred, average=None, labels=labels)
    recs = recall_score(y_true, y_pred, average=None, labels=labels)
    f1s = f1_score(y_true, y_pred, average=None, labels=labels)

    report = {}
    for idx, (l, name) in enumerate(zip(labels, target_names)):
        supp = int(np.sum(y_true == l))
        report[name] = {
            "precision": round(precs[idx], 4),
            "recall": round(recs[idx], 4),
            "f1-score": round(f1s[idx], 4),
            "support": supp
        }

    report["accuracy"] = round(accuracy_score(y_true, y_pred), 4)
    report["macro avg"] = {
        "precision": round(precision_score(y_true, y_pred, average="macro", labels=labels), 4),
        "recall": round(recall_score(y_true, y_pred, average="macro", labels=labels), 4),
        "f1-score": round(f1_score(y_true, y_pred, average="macro", labels=labels), 4),
        "support": len(y_true)
    }
    report["weighted avg"] = {
        "precision": round(precision_score(y_true, y_pred, average="weighted", labels=labels), 4),
        "recall": round(recall_score(y_true, y_pred, average="weighted", labels=labels), 4),
        "f1-score": round(f1_score(y_true, y_pred, average="weighted", labels=labels), 4),
        "support": len(y_true)
    }
    return report
