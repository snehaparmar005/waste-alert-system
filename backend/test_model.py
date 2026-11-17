import os
import numpy as np
import tensorflow as tf
from PIL import Image

MODEL_PATH = "waste_classifier.keras"
TEST_FOLDER = "uploads"
CLASSES = ["Biodegradable", "Hazardous", "Non-biodegradable"]

print("Loading waste_classifier.keras...")
model = tf.keras.models.load_model(MODEL_PATH)

valid_ext = (".jpg", ".jpeg", ".png", ".webp")
files = [f for f in os.listdir(TEST_FOLDER) if f.lower().endswith(valid_ext)]

if not files:
    print(f"No images found in '{TEST_FOLDER}/'.")
else:
    print(f"\nTesting {len(files)} images from '{TEST_FOLDER}/':\n" + "-" * 75)
    for fname in sorted(files):
        fpath = os.path.join(TEST_FOLDER, fname)
        img = Image.open(fpath).convert("RGB").resize((224, 224))
        arr = np.asarray(img, dtype=np.float32)
        preds = model.predict(np.expand_dims(arr, axis=0), verbose=0)[0]

        top_idx = int(np.argmax(preds))
        top_label = CLASSES[top_idx]
        top_conf = preds[top_idx] * 100

        all_scores = " | ".join(f"{CLASSES[i]}: {preds[i]*100:.1f}%" for i in range(3))
        print(f"{fname:<36} -> {top_label:<18} ({top_conf:.1f}%)   [{all_scores}]")
