import os
import json
import numpy as np
import tensorflow as tf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

CONFIDENCE_LIMIT = 0.6

# Load the trained AI model
model = tf.keras.models.load_model(
    os.path.join(HERE, "waste_classifier.keras")
)

# Load waste category names
with open(os.path.join(HERE, "class_names.json")) as f:
    class_names = json.load(f)


def predict_image(image_path):
    img = Image.open(image_path).convert("RGB").resize((224, 224))

    arr = np.expand_dims(
        np.array(img, dtype="float32"), 0
    )

    probs = model.predict(arr, verbose=0)[0]

    i = int(np.argmax(probs))
    confidence = float(probs[i])

    return {
        "category": class_names[i],
        "confidence": round(confidence, 3),
        "needs_retake": confidence < CONFIDENCE_LIMIT
    }