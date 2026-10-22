"""
Click-2-Clean: train the waste classifier on your own laptop.

Before running:
  1. pip install tensorflow pillow numpy scikit-learn matplotlib
  2. Download the Kaggle 'Garbage Classification' (12 classes) dataset and unzip it.
  3. Set DATASET_FOLDER below to the folder that contains the 12 class folders
     (battery, biological, brown-glass, cardboard, ...), or to any parent folder of it.

Run:  python train_local.py
"""
import json
import os
import random
import shutil

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib
matplotlib.use('Agg')          # save plots to a file, no window needed
import matplotlib.pyplot as plt

# ---------------- settings you may change ----------------
DATASET_FOLDER = 'garbage_classification'   # path to the unzipped dataset
EPOCHS = 8                                  # lower (like 4) if your laptop is slow
FINE_TUNE = False                           # set True for a few extra points of accuracy (slower)
IMG = (224, 224)                            # use (160, 160) to train faster on a weak laptop
BS = 32
DATA_DIR = 'data'                           # the split dataset is created here
# ----------------------------------------------------------

print('TensorFlow version:', tf.__version__)
print('GPU found:', tf.config.list_physical_devices('GPU') or 'No (training will use CPU, this is slower)')

# 1. find the folder that contains the 'battery' class folder
SRC = None
for root, dirs, files in os.walk(DATASET_FOLDER):
    if 'battery' in dirs:
        SRC = root
        break
assert SRC, 'Could not find the dataset. Check DATASET_FOLDER at the top of this file.'
print('Dataset folder:', SRC)

# 2. map 12 classes to our 3 categories and split 70 / 15 / 15
mapping = {
    'battery': 'Hazardous',
    'biological': 'Biodegradable', 'cardboard': 'Biodegradable', 'paper': 'Biodegradable',
    'brown-glass': 'Non-biodegradable', 'green-glass': 'Non-biodegradable', 'white-glass': 'Non-biodegradable',
    'metal': 'Non-biodegradable', 'plastic': 'Non-biodegradable', 'clothes': 'Non-biodegradable',
    'shoes': 'Non-biodegradable', 'trash': 'Non-biodegradable',
}
missing = [c for c in mapping if c not in os.listdir(SRC)]
assert not missing, 'These class folders were not found: ' + str(missing)

if not os.path.exists(DATA_DIR):
    random.seed(42)
    for cls, new in mapping.items():
        files = os.listdir(os.path.join(SRC, cls))
        random.shuffle(files)
        n = len(files)
        a, b = int(0.7 * n), int(0.85 * n)
        parts = {'train': files[:a], 'val': files[a:b], 'test': files[b:]}
        for split, flist in parts.items():
            out = os.path.join(DATA_DIR, split, new)
            os.makedirs(out, exist_ok=True)
            for f in flist:
                shutil.copy(os.path.join(SRC, cls, f), os.path.join(out, cls + '_' + f))
    print('Split created in', DATA_DIR)
else:
    print('Using the existing', DATA_DIR, 'folder (delete it if you want a fresh split)')

# 3. load images
train = tf.keras.utils.image_dataset_from_directory(os.path.join(DATA_DIR, 'train'), image_size=IMG, batch_size=BS)
val = tf.keras.utils.image_dataset_from_directory(os.path.join(DATA_DIR, 'val'), image_size=IMG, batch_size=BS, shuffle=False)
test = tf.keras.utils.image_dataset_from_directory(os.path.join(DATA_DIR, 'test'), image_size=IMG, batch_size=BS, shuffle=False)
class_names = train.class_names
print('Classes:', class_names)
train = train.prefetch(tf.data.AUTOTUNE)
val = val.prefetch(tf.data.AUTOTUNE)
test = test.prefetch(tf.data.AUTOTUNE)

# 4. build the model (transfer learning with MobileNetV2)
aug = models.Sequential([layers.RandomFlip('horizontal'), layers.RandomRotation(0.1), layers.RandomZoom(0.1)])
base = tf.keras.applications.MobileNetV2(input_shape=IMG + (3,), include_top=False, weights='imagenet')
base.trainable = False

inputs = tf.keras.Input(shape=IMG + (3,))
x = aug(inputs)
x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
x = base(x, training=False)
x = layers.GlobalAveragePooling2D()(x)
x = layers.Dropout(0.3)(x)
outputs = layers.Dense(3, activation='softmax')(x)
model = tf.keras.Model(inputs, outputs)
model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
              loss='sparse_categorical_crossentropy', metrics=['accuracy'])

# class weights, because Hazardous has far fewer images
counts = [len(os.listdir(os.path.join(DATA_DIR, 'train', c))) for c in class_names]
total = sum(counts)
class_weight = {i: total / (3 * c) for i, c in enumerate(counts)}
print('Class weights:', class_weight)

# 5. train
model.fit(train, validation_data=val, epochs=EPOCHS, class_weight=class_weight)

if FINE_TUNE:
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-5),
                  loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.fit(train, validation_data=val, epochs=4, class_weight=class_weight)

# 6. evaluate on the test set
y_true = np.concatenate([y.numpy() for _, y in test])
y_pred = np.argmax(model.predict(test), axis=1)
print(classification_report(y_true, y_pred, target_names=class_names))

cm = confusion_matrix(y_true, y_pred)
plt.imshow(cm, cmap='Blues')
plt.xticks(range(3), class_names, rotation=30)
plt.yticks(range(3), class_names)
for i in range(3):
    for j in range(3):
        plt.text(j, i, cm[i, j], ha='center', va='center')
plt.xlabel('Predicted')
plt.ylabel('Actual')
plt.title('Confusion matrix')
plt.tight_layout()
plt.savefig('confusion_matrix.png')
print('Saved confusion_matrix.png')

# 7. save the model and class names
model.save('waste_classifier.keras')
with open('class_names.json', 'w') as f:
    json.dump(class_names, f)
print('Saved waste_classifier.keras and class_names.json')
print('TensorFlow version used for training:', tf.__version__)
