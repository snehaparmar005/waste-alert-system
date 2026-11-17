import os
import threading
import numpy as np
from PIL import Image

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "waste_classifier.keras")

CANONICAL_CLASSES = [
    {"index": 0, "slug": "biodegradable", "label": "Biodegradable"},
    {"index": 1, "slug": "hazardous", "label": "Hazardous"},
    {"index": 2, "slug": "non_biodegradable", "label": "Non-biodegradable"},
]

_model = None
_model_lock = threading.Lock()
CONFIDENCE_THRESHOLD = 0.65

def get_model():
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                import tensorflow as tf
                if not os.path.exists(MODEL_PATH):
                    raise FileNotFoundError(f"Model artifact missing at {MODEL_PATH}")
                _model = tf.keras.models.load_model(MODEL_PATH)
    return _model

def is_model_ready() -> bool:
    return os.path.exists(MODEL_PATH)

def predict_image(image_path: str) -> dict:
    model = get_model()
    img = Image.open(image_path).convert("RGB").resize((224, 224))
    arr = np.asarray(img, dtype=np.float32)
    batch = np.expand_dims(arr, axis=0)

    preds = model.predict(batch, verbose=0)
    top_idx = int(np.argmax(preds))
    confidence = float(preds[top_idx])
    class_info = CANONICAL_CLASSES[top_idx]

    return {
        "slug": class_info["slug"],
        "label": class_info["label"],
        "confidence": round(confidence, 4),
        "needs_retake": confidence < CONFIDENCE_THRESHOLD,
    }
