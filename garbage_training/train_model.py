"""Step 2: Train the garbage classifier (run this in Google Colab with GPU).

Needs a folder called "dataset" with 3 sub-folders:
    dataset/biodegradable, dataset/non_biodegradable, dataset/hazardous

Outputs:
    waste_model.keras        -> the trained model (used by the app)
    class_names.json         -> class order
    evaluation_report.txt    -> accuracy, precision, recall, F1 per class
    confusion_matrix.png     -> confusion matrix picture
    training_curves.png      -> accuracy/loss graph
"""
import json
import numpy as np
import tensorflow as tf
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import classification_report, confusion_matrix, ConfusionMatrixDisplay

DATA_DIR = "dataset"
IMG_SIZE = (224, 224)
BATCH = 32
EPOCHS = 8
SEED = 42

train_ds = tf.keras.utils.image_dataset_from_directory(
    DATA_DIR, validation_split=0.2, subset="training", seed=SEED,
    image_size=IMG_SIZE, batch_size=BATCH,
)
val_ds = tf.keras.utils.image_dataset_from_directory(
    DATA_DIR, validation_split=0.2, subset="validation", seed=SEED,
    image_size=IMG_SIZE, batch_size=BATCH, shuffle=False,
)
class_names = train_ds.class_names
print("Classes:", class_names)

# Balance classes (hazardous usually has fewer images)
counts = np.zeros(len(class_names))
for _, labels in train_ds:
    for l in labels.numpy():
        counts[l] += 1
total = counts.sum()
class_weight = {i: float(total / (len(class_names) * c)) for i, c in enumerate(counts)}
print("Class weights:", class_weight)

AUTOTUNE = tf.data.AUTOTUNE
train_ds = train_ds.prefetch(AUTOTUNE)
val_ds = val_ds.prefetch(AUTOTUNE)

augment = tf.keras.Sequential([
    tf.keras.layers.RandomFlip("horizontal"),
    tf.keras.layers.RandomRotation(0.1),
    tf.keras.layers.RandomZoom(0.1),
])

base = tf.keras.applications.MobileNetV2(
    input_shape=IMG_SIZE + (3,), include_top=False, weights="imagenet"
)
base.trainable = False

inputs = tf.keras.Input(shape=IMG_SIZE + (3,))
x = augment(inputs)
x = tf.keras.layers.Rescaling(1.0 / 127.5, offset=-1)(x)  # MobileNetV2 preprocessing
x = base(x, training=False)
x = tf.keras.layers.GlobalAveragePooling2D()(x)
x = tf.keras.layers.Dropout(0.2)(x)
outputs = tf.keras.layers.Dense(len(class_names), activation="softmax")(x)
model = tf.keras.Model(inputs, outputs)

model.compile(
    optimizer=tf.keras.optimizers.Adam(1e-3),
    loss="sparse_categorical_crossentropy",
    metrics=["accuracy"],
)
history = model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS, class_weight=class_weight)

# ---- Evaluation ----
y_true, y_pred = [], []
for images, labels in val_ds:
    probs = model.predict(images, verbose=0)
    y_pred.extend(np.argmax(probs, axis=1))
    y_true.extend(labels.numpy())

report = classification_report(y_true, y_pred, target_names=class_names, digits=3)
print(report)
with open("evaluation_report.txt", "w") as f:
    f.write(report)

cm = confusion_matrix(y_true, y_pred)
ConfusionMatrixDisplay(cm, display_labels=class_names).plot(cmap="Blues", xticks_rotation=20)
plt.tight_layout()
plt.savefig("confusion_matrix.png", dpi=150)
plt.close()

plt.figure(figsize=(9, 3.5))
plt.subplot(1, 2, 1)
plt.plot(history.history["accuracy"], label="train")
plt.plot(history.history["val_accuracy"], label="validation")
plt.title("Accuracy"); plt.legend()
plt.subplot(1, 2, 2)
plt.plot(history.history["loss"], label="train")
plt.plot(history.history["val_loss"], label="validation")
plt.title("Loss"); plt.legend()
plt.tight_layout()
plt.savefig("training_curves.png", dpi=150)

model.save("waste_model.keras")
with open("class_names.json", "w") as f:
    json.dump(class_names, f)
print("Saved: waste_model.keras, class_names.json, evaluation_report.txt, confusion_matrix.png, training_curves.png")