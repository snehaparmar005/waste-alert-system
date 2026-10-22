"""
Click-2-Clean waste classifier for the backend.

Install:  pip install tensorflow pillow numpy
Put waste_classifier.keras and class_names.json in the same folder as this file.

Usage:
    from classifier import predict
    result = predict('uploads/photo1.jpg')
    # {'category': 'Hazardous', 'confidence': 0.93, 'needs_retake': False}
"""
import json
import os

import numpy as np
import tensorflow as tf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIDENCE_LIMIT = 0.6   # below this, ask the user to retake the photo

# the model is loaded once, when the backend starts
model = tf.keras.models.load_model(os.path.join(HERE, 'waste_classifier.keras'))
with open(os.path.join(HERE, 'class_names.json')) as f:
    class_names = json.load(f)


def predict(image_path):
    img = Image.open(image_path).convert('RGB').resize((224, 224))
    arr = np.expand_dims(np.array(img, dtype='float32'), 0)   # raw 0-255 pixels, the model scales them itself
    probs = model.predict(arr, verbose=0)[0]
    i = int(np.argmax(probs))
    confidence = float(probs[i])
    return {
        'category': class_names[i],
        'confidence': round(confidence, 3),
        'needs_retake': confidence < CONFIDENCE_LIMIT,
    }


if __name__ == '__main__':
    import sys
    print(predict(sys.argv[1]))
