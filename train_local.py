"""
Click-2-Clean: train model v2 and compare it with model v1.

What this script does
  1. Reads your old split (data/) so it knows exactly what model v1 trained on.
  2. Reads the new dataset, removes images that are already in the old data (duplicates),
     and keeps the rest as NEW images.
  3. Builds data_v2/ = old train + old val + new images (new images are split 70/15/15).
  4. Trains model v2 in 2 stages (head first, then fine-tune the top layers).
  5. Tests model v1 AND model v2 on the SAME test sets that neither of them trained on,
     prints a comparison table and tells you which one is better.
  6. Saves everything in model_v2/. Your v1 files are never touched.

Folder layout expected (run the script from the Click-2-Clean folder):
  model_v1_backup/waste_classifier.keras, class_names.json
  garbage_classification/     (old dataset, 12 class folders)
  <new dataset folder>/       (new dataset, 12 class folders) -> add its name in DATASET_FOLDERS
  data/                       (old split created by the first train_local.py: train, val, test)
  phone_test/                 (OPTIONAL: your own phone photos, see PHONE_TEST_DIR below)

Install once:  pip install tensorflow pillow numpy scikit-learn matplotlib
Run:           python train_local.py
"""
import hashlib
import json
import os
import random
import shutil
import time

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from sklearn.metrics import classification_report, confusion_matrix
from PIL import Image
import matplotlib
matplotlib.use('Agg')          # save plots to files, no window needed
import matplotlib.pyplot as plt

# =========================== SETTINGS YOU MAY CHANGE ===========================
# Folders that contain the 12 class folders (battery, biological, ...).
# Put the name of the NEW dataset folder here. Listing the old one too is fine,
# the old images are recognised and skipped. If you copied the new images into the
# old folder, keep just that one name.
DATASET_FOLDERS = ['garbage_classification', 'garbage_classification_new']

OLD_SPLIT_DIR = 'data'                  # old split made by the first script (train / val / test)
V1_DIR = 'model_v1_backup'              # folder with the v1 model
V2_DIR = 'model_v2'                     # everything new is saved here
DATA_V2 = 'data_v2'                     # new split is created here
PHONE_TEST_DIR = 'phone_test'           # optional: phone_test/<Biodegradable|Hazardous|Non-biodegradable>/photo.jpg

MODEL_NAME = 'efficientnetv2b0'         # 'efficientnetv2b0' (more accurate, slower) or 'mobilenetv2' (faster)
IMG = (224, 224)
BS = 32
HEAD_EPOCHS = 4                         # stage 1: train only the new top layer
FINE_EPOCHS = 10                        # stage 2: fine-tune the top of the backbone (stops early if not improving)
SEED = 42
# ===============================================================================

CATEGORIES = ['Biodegradable', 'Hazardous', 'Non-biodegradable']   # alphabetical = Keras class order
MAPPING = {
    'battery': 'Hazardous',
    'biological': 'Biodegradable', 'cardboard': 'Biodegradable', 'paper': 'Biodegradable',
    'brown-glass': 'Non-biodegradable', 'green-glass': 'Non-biodegradable', 'white-glass': 'Non-biodegradable',
    'metal': 'Non-biodegradable', 'plastic': 'Non-biodegradable', 'clothes': 'Non-biodegradable',
    'shoes': 'Non-biodegradable', 'trash': 'Non-biodegradable',
}
ALIASES = {'batteries': 'battery'}
IMG_EXT = ('.jpg', '.jpeg', '.png', '.bmp', '.webp')
UNFREEZE_LAYERS = {'efficientnetv2b0': 80, 'mobilenetv2': 50}

random.seed(SEED)
np.random.seed(SEED)
tf.keras.utils.set_random_seed(SEED)
T0 = time.time()
print('TensorFlow version:', tf.__version__)
print('GPU found:', tf.config.list_physical_devices('GPU') or 'No (CPU training, slower)')


def norm(name):
    n = name.lower().strip().replace('_', '-').replace(' ', '-')
    return ALIASES.get(n, n)


def md5(path):
    h = hashlib.md5()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def count_images(folder):
    if not os.path.isdir(folder):
        return 0
    return sum(1 for r, _, fs in os.walk(folder) for f in fs if f.lower().endswith(IMG_EXT))


# ----------------------------------------------------------------------------
# STEP 1: read the old split (what v1 used)
# ----------------------------------------------------------------------------
print('\n=== STEP 1: reading the old split in "%s" ===' % OLD_SPLIT_DIR)
assert os.path.isdir(OLD_SPLIT_DIR), (
    'Folder "%s" not found. It is the train/val/test split created by your first training run. '
    'It is needed to compare v1 and v2 fairly.' % OLD_SPLIT_DIR)

old = {'train': [], 'val': [], 'test': []}        # lists of (hash, category, path)
for split in old:
    for cat in os.listdir(os.path.join(OLD_SPLIT_DIR, split)):
        d = os.path.join(OLD_SPLIT_DIR, split, cat)
        for f in os.listdir(d):
            if f.lower().endswith(IMG_EXT):
                p = os.path.join(d, f)
                old[split].append((md5(p), cat, p))
    print('  old %-5s %d images' % (split, len(old[split])))

# images in the old test set must never be used for training v2
seen = {h for h, _, _ in old['test']}
train_files, val_files, leaked = [], [], 0
for h, cat, p in old['train']:
    if h in seen:
        leaked += 1
        continue
    seen.add(h)
    train_files.append((h, cat, p))
for h, cat, p in old['val']:
    if h in seen:
        leaked += 1
        continue
    seen.add(h)
    val_files.append((h, cat, p))
if leaked:
    print('  removed %d old train/val images that were exact copies of old TEST images (stops fake scores)' % leaked)

# ----------------------------------------------------------------------------
# STEP 2: find the NEW images (not in the old data)
# ----------------------------------------------------------------------------
print('\n=== STEP 2: scanning dataset folders for new images ===')
new_pool = {}          # hash -> (category, path)
conflicts = set()
dup_count = bad_count = 0
for folder in DATASET_FOLDERS:
    if not os.path.isdir(folder):
        print('  WARNING: folder "%s" not found, skipping it' % folder)
        continue
    found_classes = set()
    for root, dirs, files in os.walk(folder):
        cls = norm(os.path.basename(root))
        if cls not in MAPPING:
            continue
        imgs = [f for f in files if f.lower().endswith(IMG_EXT)]
        if not imgs:
            continue
        found_classes.add(cls)
        cat = MAPPING[cls]
        for f in imgs:
            p = os.path.join(root, f)
            h = md5(p)
            if h in seen:
                dup_count += 1
                continue
            if h in new_pool:
                if new_pool[h][0] != cat:
                    conflicts.add(h)
                else:
                    dup_count += 1
                continue
            try:
                with Image.open(p) as im:
                    im.verify()
            except Exception:
                bad_count += 1
                continue
            new_pool[h] = (cat, p)
    missing = [c for c in MAPPING if c not in found_classes]
    print('  %-28s class folders found: %d of 12%s' % (folder, len(found_classes),
          ('  (missing: ' + ', '.join(missing) + ')') if missing else ''))
for h in conflicts:
    new_pool.pop(h, None)
print('  already in old data (skipped duplicates): %d' % dup_count)
print('  unreadable images skipped: %d' % bad_count)
print('  same image under 2 different labels (dropped): %d' % len(conflicts))
print('  NEW unique images: %d' % len(new_pool))

# split the new images 70 / 15 / 15 inside each category
new_split = {'train': [], 'val': [], 'test_new': []}
by_cat = {c: [] for c in CATEGORIES}
for h, (cat, p) in new_pool.items():
    by_cat[cat].append((h, cat, p))
for cat, items in by_cat.items():
    items.sort()
    random.shuffle(items)
    n = len(items)
    a, b = int(0.7 * n), int(0.85 * n)
    new_split['train'] += items[:a]
    new_split['val'] += items[a:b]
    new_split['test_new'] += items[b:]

# ----------------------------------------------------------------------------
# STEP 3: build data_v2
# ----------------------------------------------------------------------------
print('\n=== STEP 3: building "%s" ===' % DATA_V2)
if os.path.exists(DATA_V2):
    shutil.rmtree(DATA_V2)
for split in ('train', 'val', 'test_new'):
    for cat in CATEGORIES:
        os.makedirs(os.path.join(DATA_V2, split, cat), exist_ok=True)


def put(items, split):
    for h, cat, p in items:
        ext = os.path.splitext(p)[1].lower()
        shutil.copy(p, os.path.join(DATA_V2, split, cat, h[:16] + ext))


put(train_files, 'train')
put(val_files, 'val')
put(new_split['train'], 'train')
put(new_split['val'], 'val')
put(new_split['test_new'], 'test_new')

print('  %-10s %s' % ('', '  '.join('%-18s' % c for c in CATEGORIES)))
for split in ('train', 'val', 'test_new'):
    print('  %-10s %s' % (split, '  '.join('%-18d' % count_images(os.path.join(DATA_V2, split, c)) for c in CATEGORIES)))
print('  %-10s %s   (old split, shared by v1 and v2)' % ('old test', '  '.join(
    '%-18d' % count_images(os.path.join(OLD_SPLIT_DIR, 'test', c)) for c in CATEGORIES)))

# ----------------------------------------------------------------------------
# STEP 4: load images and train v2
# ----------------------------------------------------------------------------
print('\n=== STEP 4: training model v2 (%s) ===' % MODEL_NAME)


def load_ds(path, shuffle=False):
    return tf.keras.utils.image_dataset_from_directory(
        path, class_names=CATEGORIES, image_size=IMG, batch_size=BS,
        shuffle=shuffle, seed=SEED, verbose=False)


train = load_ds(os.path.join(DATA_V2, 'train'), shuffle=True).prefetch(tf.data.AUTOTUNE)
val = load_ds(os.path.join(DATA_V2, 'val')).prefetch(tf.data.AUTOTUNE)

counts = [count_images(os.path.join(DATA_V2, 'train', c)) for c in CATEGORIES]
total = sum(counts)
class_weight = {i: total / (3 * c) for i, c in enumerate(counts)}
print('  train images per class:', dict(zip(CATEGORIES, counts)))
print('  class weights:', {CATEGORIES[i]: round(w, 2) for i, w in class_weight.items()})

# stronger augmentation than v1, so the model copes better with real phone photos
augment = models.Sequential([
    layers.RandomFlip('horizontal'),
    layers.RandomRotation(0.15),
    layers.RandomZoom(0.15),
    layers.RandomTranslation(0.1, 0.1),
    layers.RandomContrast(0.2),
    layers.RandomBrightness(0.2),
], name='augmentation')


def build_model():
    inputs = tf.keras.Input(shape=IMG + (3,))
    x = augment(inputs)                      # only active during training
    if MODEL_NAME == 'efficientnetv2b0':
        base = tf.keras.applications.EfficientNetV2B0(include_top=False, weights='imagenet', input_shape=IMG + (3,))
    else:
        base = tf.keras.applications.MobileNetV2(include_top=False, weights='imagenet', input_shape=IMG + (3,))
        x = tf.keras.applications.mobilenet_v2.preprocess_input(x)
    base.trainable = False
    x = base(x, training=False)              # the model takes raw 0-255 pixels, same as v1
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.3)(x)
    outputs = layers.Dense(3, activation='softmax')(x)
    return tf.keras.Model(inputs, outputs), base


model, base = build_model()
model.compile(optimizer=tf.keras.optimizers.Adam(1e-3),
              loss='sparse_categorical_crossentropy', metrics=['accuracy'])

print('\n  Stage 1: training the new top layer (backbone frozen)')
t1 = time.time()
h1 = model.fit(train, validation_data=val, epochs=HEAD_EPOCHS, class_weight=class_weight,
               callbacks=[tf.keras.callbacks.EarlyStopping(monitor='val_accuracy', patience=2, restore_best_weights=True)])
print('  stage 1 took %.1f minutes' % ((time.time() - t1) / 60))

print('\n  Stage 2: fine-tuning the top %d layers of the backbone' % UNFREEZE_LAYERS[MODEL_NAME])
base.trainable = True
for layer in base.layers[:-UNFREEZE_LAYERS[MODEL_NAME]]:
    layer.trainable = False
for layer in base.layers:
    if isinstance(layer, layers.BatchNormalization):
        layer.trainable = False              # keep BatchNorm stable while fine-tuning
model.compile(optimizer=tf.keras.optimizers.Adam(5e-5),
              loss='sparse_categorical_crossentropy', metrics=['accuracy'])
t2 = time.time()
h2 = model.fit(train, validation_data=val, epochs=FINE_EPOCHS, class_weight=class_weight, callbacks=[
    tf.keras.callbacks.EarlyStopping(monitor='val_accuracy', patience=3, restore_best_weights=True),
    tf.keras.callbacks.ReduceLROnPlateau(monitor='val_loss', factor=0.3, patience=1, min_lr=1e-7, verbose=1),
])
print('  stage 2 took %.1f minutes' % ((time.time() - t2) / 60))

os.makedirs(V2_DIR, exist_ok=True)
model.save(os.path.join(V2_DIR, 'waste_classifier.keras'))
with open(os.path.join(V2_DIR, 'class_names.json'), 'w') as f:
    json.dump(CATEGORIES, f)

# training curves
acc = h1.history['accuracy'] + h2.history['accuracy']
vacc = h1.history['val_accuracy'] + h2.history['val_accuracy']
plt.figure(figsize=(7, 4))
plt.plot(acc, label='train accuracy')
plt.plot(vacc, label='validation accuracy')
plt.axvline(len(h1.history['accuracy']) - 0.5, color='gray', linestyle='--', label='fine-tuning starts')
plt.xlabel('epoch')
plt.ylabel('accuracy')
plt.legend()
plt.tight_layout()
plt.savefig(os.path.join(V2_DIR, 'training_curves.png'))
plt.close()

# ----------------------------------------------------------------------------
# STEP 5: compare v1 and v2 on the same unseen test sets
# ----------------------------------------------------------------------------
print('\n=== STEP 5: comparing v1 and v2 ===')
v1_model_path = os.path.join(V1_DIR, 'waste_classifier.keras')
assert os.path.exists(v1_model_path), 'v1 model not found at ' + v1_model_path
v1 = tf.keras.models.load_model(v1_model_path)
with open(os.path.join(V1_DIR, 'class_names.json')) as f:
    assert json.load(f) == CATEGORIES, 'v1 class names are different from v2'

TEST_SETS = [
    ('Old test split', os.path.join(OLD_SPLIT_DIR, 'test')),
    ('New-data test split', os.path.join(DATA_V2, 'test_new')),
    ('Your phone photos', PHONE_TEST_DIR),
]
HAZ = CATEGORIES.index('Hazardous')


def evaluate(m, path):
    ds = load_ds(path)
    y_true = np.concatenate([y.numpy() for _, y in ds])
    y_pred = np.argmax(m.predict(ds, verbose=0), axis=1)
    rep = classification_report(y_true, y_pred, labels=[0, 1, 2], target_names=CATEGORIES,
                                output_dict=True, zero_division=0)
    return {'n': len(y_true), 'acc': rep['accuracy'], 'f1': rep['macro avg']['f1-score'],
            'haz_p': rep['Hazardous']['precision'], 'haz_r': rep['Hazardous']['recall'],
            'cm': confusion_matrix(y_true, y_pred, labels=[0, 1, 2]), 'text': classification_report(
                y_true, y_pred, labels=[0, 1, 2], target_names=CATEGORIES, zero_division=0)}


def save_cm(cm, title, filename):
    plt.figure(figsize=(5, 4))
    plt.imshow(cm, cmap='Blues')
    plt.xticks(range(3), CATEGORIES, rotation=30)
    plt.yticks(range(3), CATEGORIES)
    for i in range(3):
        for j in range(3):
            plt.text(j, i, cm[i, j], ha='center', va='center')
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title(title)
    plt.tight_layout()
    plt.savefig(os.path.join(V2_DIR, filename))
    plt.close()


lines = []
results = []
header = '%-22s %-6s %7s %9s %8s %12s %12s' % ('Test set', 'Model', 'Images', 'Accuracy', 'Macro-F1', 'Haz.precis.', 'Haz.recall')
lines += [header, '-' * len(header)]
for name, path in TEST_SETS:
    if count_images(path) == 0:
        lines.append('%-22s (no images, skipped)' % name)
        continue
    r1, r2 = evaluate(v1, path), evaluate(model, path)
    results.append((name, r1, r2))
    for tag, r in (('v1', r1), ('v2', r2)):
        lines.append('%-22s %-6s %7d %8.2f%% %8.3f %12.3f %12.3f' % (
            name, tag, r['n'], r['acc'] * 100, r['f1'], r['haz_p'], r['haz_r']))
    save_cm(r2['cm'], 'v2: ' + name, 'confusion_matrix_v2_' + name.lower().replace(' ', '_').replace('-', '_') + '.png')
lines.append('')

# verdict
verdict = []
if not results:
    verdict.append('No test images found, nothing to compare.')
else:
    ok = True
    for name, r1, r2 in results:
        if r2['acc'] < r1['acc'] - 0.005:
            ok = False
            verdict.append('v2 is worse on "%s" (%.2f%% vs %.2f%%).' % (name, r2['acc'] * 100, r1['acc'] * 100))
        if r2['haz_r'] < r1['haz_r'] - 0.02:
            ok = False
            verdict.append('v2 finds fewer Hazardous items on "%s" (recall %.3f vs %.3f).' % (name, r2['haz_r'], r1['haz_r']))
    mean1 = np.mean([r1['acc'] for _, r1, _ in results])
    mean2 = np.mean([r2['acc'] for _, _, r2 in results])
    if ok and mean2 > mean1:
        verdict.append('RESULT: v2 is BETTER (average accuracy %.2f%% vs %.2f%%). Use the files in %s/.' % (mean2 * 100, mean1 * 100, V2_DIR))
    elif ok:
        verdict.append('RESULT: v2 is about the same as v1 (%.2f%% vs %.2f%%). Keep v1 unless the phone photos favour v2.' % (mean2 * 100, mean1 * 100))
    else:
        verdict.append('RESULT: do NOT replace v1 with v2 yet.')
lines += verdict
lines.append('')
lines.append('Detailed v2 reports:')
for name, r1, r2 in results:
    lines.append('--- ' + name + ' (v2) ---')
    lines.append(r2['text'])

report = '\n'.join(lines)
print(report)
with open(os.path.join(V2_DIR, 'comparison.txt'), 'w') as f:
    f.write('Backbone: %s | TensorFlow %s\n\n' % (MODEL_NAME, tf.__version__) + report)

print('\nSaved in %s/: waste_classifier.keras, class_names.json, comparison.txt, training_curves.png and confusion matrices' % V2_DIR)
print('Total time: %.1f minutes' % ((time.time() - T0) / 60))