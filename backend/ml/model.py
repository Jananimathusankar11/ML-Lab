"""
RetinaAI - CNN Model Architectures
Implements:
1. Custom Multi-Stage Deep CNN for Diabetic Retinopathy Detection
2. Optional MobileNetV2 / EfficientNetB0 Transfer Learning Backbone
3. Layer architecture introspector for Feature Analysis page
"""

import tensorflow as tf
from tensorflow.keras import layers, models, optimizers
from typing import Dict, Any, List, Tuple
from config import IMAGE_SIZE, CLASS_NAMES

def build_custom_cnn(
    input_shape: Tuple[int, int, int] = (224, 224, 3),
    num_classes: int = 5,
    learning_rate: float = 0.0005
) -> tf.keras.Model:
    """
    Build 4-stage Deep Convolutional Neural Network:
    - Stage 1: Conv2D(32, 3x3) + BatchNorm + ReLU + MaxPool(2x2)
    - Stage 2: Conv2D(64, 3x3) + BatchNorm + ReLU + MaxPool(2x2) + Dropout(0.25)
    - Stage 3: Conv2D(128, 3x3) + BatchNorm + ReLU + MaxPool(2x2) + Dropout(0.25)
    - Stage 4: Conv2D(256, 3x3) + BatchNorm + ReLU + MaxPool(2x2) + Dropout(0.3)
    - Latent Representation: GlobalAveragePooling2D
    - Dense Head: Dense(256) + BatchNorm + ReLU + Dropout(0.5)
    - Classifier: Dense(5, activation='softmax')
    """
    inputs = layers.Input(shape=input_shape, name="retinal_input")

    # Stage 1: Low-level features (retinal edges, vessel contours)
    x = layers.Conv2D(32, (3, 3), padding="same", name="conv1_1")(inputs)
    x = layers.BatchNormalization(name="bn1_1")(x)
    x = layers.Activation("relu", name="relu1_1")(x)
    x = layers.MaxPooling2D((2, 2), name="pool1")(x)

    # Stage 2: Intermediate features (vascular branching, optic disc boundary)
    x = layers.Conv2D(64, (3, 3), padding="same", name="conv2_1")(x)
    x = layers.BatchNormalization(name="bn2_1")(x)
    x = layers.Activation("relu", name="relu2_1")(x)
    x = layers.MaxPooling2D((2, 2), name="pool2")(x)
    x = layers.Dropout(0.25, name="dropout2")(x)

    # Stage 3: High-level lesion features (microaneurysms, cotton wool spots, exudates)
    x = layers.Conv2D(128, (3, 3), padding="same", name="conv3_1")(x)
    x = layers.BatchNormalization(name="bn3_1")(x)
    x = layers.Activation("relu", name="relu3_1")(x)
    x = layers.MaxPooling2D((2, 2), name="pool3")(x)
    x = layers.Dropout(0.25, name="dropout3")(x)

    # Stage 4: Advanced pathological patterns (neovascularization, vitreous hemorrhages)
    x = layers.Conv2D(256, (3, 3), padding="same", name="conv4_1")(x)
    x = layers.BatchNormalization(name="bn4_1")(x)
    x = layers.Activation("relu", name="relu4_1")(x)
    x = layers.MaxPooling2D((2, 2), name="pool4")(x)
    x = layers.Dropout(0.3, name="dropout4")(x)

    # Penultimate Latent Feature Layer
    latent = layers.GlobalAveragePooling2D(name="latent_features")(x)

    # Dense Classification Head
    dense = layers.Dense(256, name="dense_latent")(latent)
    dense = layers.BatchNormalization(name="bn_dense")(dense)
    dense = layers.Activation("relu", name="relu_dense")(dense)
    dense = layers.Dropout(0.5, name="dropout_dense")(dense)

    # 5-Class Softmax Output
    outputs = layers.Dense(num_classes, activation="softmax", name="dr_severity_prediction")(dense)

    model = models.Model(inputs=inputs, outputs=outputs, name="RetinaAI_DeepCNN")

    optimizer = optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model

def build_transfer_learning_model(
    architecture: str = "MobileNetV2",
    input_shape: Tuple[int, int, int] = (224, 224, 3),
    num_classes: int = 5,
    learning_rate: float = 0.0002
) -> tf.keras.Model:
    """
    Build transfer learning model with ImageNet pre-trained backbone:
    - MobileNetV2 or EfficientNetB0
    - Fine-tuned top layers for ophthalmological feature extraction
    """
    inputs = layers.Input(shape=input_shape, name="retinal_input")

    if architecture == "EfficientNetB0":
        backbone = tf.keras.applications.EfficientNetB0(
            include_top=False, weights="imagenet", input_tensor=inputs
        )
    else:
        backbone = tf.keras.applications.MobileNetV2(
            include_top=False, weights="imagenet", input_tensor=inputs
        )

    # Freeze base layers initially
    backbone.trainable = False

    x = backbone.output
    x = layers.GlobalAveragePooling2D(name="latent_features")(x)
    x = layers.Dense(256, activation="relu", name="dense_features")(x)
    x = layers.Dropout(0.4, name="dropout_features")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="dr_severity_prediction")(x)

    model = models.Model(inputs=inputs, outputs=outputs, name=f"RetinaAI_{architecture}")

    optimizer = optimizers.Adam(learning_rate=learning_rate)
    model.compile(
        optimizer=optimizer,
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model

def get_model_architecture_details(model: tf.keras.Model) -> Dict[str, Any]:
    """
    Extract structural details of model layers for the Feature Analysis dashboard:
    - Layer name, type, output tensor shape, parameter count
    - Identification of Conv, Pooling, and Dense blocks
    """
    layers_info = []
    total_params = 0
    trainable_params = 0

    for idx, layer in enumerate(model.layers):
        layer_params = layer.count_params()
        total_params += layer_params
        if layer.trainable:
            trainable_params += layer_params

        l_type = layer.__class__.__name__

        # Categorize layer purpose
        category = "Other"
        description = "Tensor transformation"
        if "Conv" in l_type:
            category = "Convolutional"
            description = "Extracts spatial features (edges, textures, lesion clusters)"
        elif "Pooling" in l_type:
            category = "Downsampling / Pooling"
            description = "Reduces spatial dimension while preserving dominant activations"
        elif "Dense" in l_type:
            category = "Dense / Classification"
            description = "Learns high-dimensional semantic mapping for 5 severity grades"
        elif "Dropout" in l_type:
            category = "Regularization"
            description = "Prevents clinical overfitting by stochastically deactivating neurons"
        elif "BatchNormalization" in l_type:
            category = "Normalization"
            description = "Stabilizes internal covariate shift across training batches"

        output_shape = None
        try:
            output_shape = str(layer.output.shape)
        except Exception:
            output_shape = "Variable"

        layers_info.append({
            "index": idx + 1,
            "name": layer.name,
            "type": l_type,
            "category": category,
            "description": description,
            "output_shape": output_shape,
            "parameters": layer_params
        })

    return {
        "model_name": model.name,
        "total_layers": len(model.layers),
        "total_parameters": total_params,
        "trainable_parameters": trainable_params,
        "non_trainable_parameters": total_params - trainable_params,
        "layers": layers_info
    }
