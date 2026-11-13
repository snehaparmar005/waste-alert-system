import hashlib
import json
import time
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image, ImageOps

MODEL_PATH = Path("waste_model.keras")
CLASSES_PATH = Path("class_names.json")
REPORTS_CSV = Path("reports.csv")
OUTBOX = Path("alerts_outbox")
IMAGES_DIR = Path("reports_images")
DEFAULT_CLASSES = ["biodegradable", "hazardous", "non_biodegradable"]

CONFIDENCE_THRESHOLD = 0.60  # below this -> "needs manual review"

# Days allowed for cleaning (hazardous is higher priority)
CLEANUP_DAYS = {"biodegradable": 7, "non_biodegradable": 7, "hazardous": 5}

# EDIT THIS: put the real zone / officer names of Gwalior Nagar Nigam here.
AUTHORITY_NAME = "Nagar Nigam Gwalior (Gwalior Municipal Corporation)"
ZONES = {
    "Zone 1": "Sanitary Inspector, Zone 1 (replace with real name)",
    "Zone 2": "Sanitary Inspector, Zone 2 (replace with real name)",
    "Zone 3": "Sanitary Inspector, Zone 3 (replace with real name)",
}

REPORT_COLUMNS = [
    "report_id", "reported_at", "photo_taken_at", "day", "latitude", "longitude",
    "address", "zone", "authority", "officer", "category", "confidence",
    "needs_review", "priority", "clean_by", "status", "mode",
]


# ---------------- Metadata (EXIF) ----------------
def _to_degrees(value, ref):
    d, m, s = [float(x) for x in value]
    deg = d + m / 60 + s / 3600
    return -deg if ref in ("S", "W") else deg


def extract_metadata(image):
    """Read GPS + capture time from the photo's EXIF. Missing values stay None."""
    meta = {"lat": None, "lon": None, "taken_at": None}
    try:
        exif = image.getexif()
        gps = exif.get_ifd(0x8825)
        if gps and 2 in gps and 4 in gps:
            meta["lat"] = _to_degrees(gps[2], gps.get(1, "N"))
            meta["lon"] = _to_degrees(gps[4], gps.get(3, "E"))
        stamp = exif.get_ifd(0x8769).get(0x9003) or exif.get(0x0132)
        if stamp:
            meta["taken_at"] = datetime.strptime(str(stamp)[:19], "%Y:%m:%d %H:%M:%S")
    except Exception:
        pass
    return meta


# ---------------- Classification ----------------
_model = None


def get_class_names():
    if CLASSES_PATH.exists():
        return json.loads(CLASSES_PATH.read_text())
    return DEFAULT_CLASSES


def load_model():
    global _model
    if _model is None and MODEL_PATH.exists():
        import tensorflow as tf
        _model = tf.keras.models.load_model(MODEL_PATH)
    return _model


def classify(image):
    """Returns dict: label, confidence (0-1), probs, demo (True if no trained model)."""
    names = get_class_names()
    model = load_model()
    start = time.time()
    if model is None:
        # DEMO MODE: no trained model found. Fake but repeatable result.
        h = int(hashlib.md5(image.tobytes()).hexdigest(), 16)
        idx = h % len(names)
        conf = 0.55 + (h % 4000) / 10000
        probs = {n: (1 - conf) / (len(names) - 1) for n in names}
        probs[names[idx]] = conf
        return {"label": names[idx], "confidence": conf, "probs": probs,
                "demo": True, "latency_ms": (time.time() - start) * 1000}

    img = ImageOps.exif_transpose(image).convert("RGB").resize((224, 224))
    arr = np.expand_dims(np.array(img, dtype="float32"), 0)
    p = model.predict(arr, verbose=0)[0]
    idx = int(np.argmax(p))
    return {"label": names[idx], "confidence": float(p[idx]),
            "probs": {n: float(v) for n, v in zip(names, p)},
            "demo": False, "latency_ms": (time.time() - start) * 1000}


# ---------------- Report + alert ----------------
def load_reports():
    if REPORTS_CSV.exists():
        return pd.read_csv(REPORTS_CSV)
    return pd.DataFrame(columns=REPORT_COLUMNS)


def create_report(image, result, meta, address, zone):
    """Save the report, save the photo, write the alert for  Nagar Nigam."""
    now = datetime.now()
    taken = meta.get("taken_at") or now
    label = result["label"]
    days = CLEANUP_DAYS.get(label, 7)
    clean_by = now + timedelta(days=days)
    needs_review = result["confidence"] < CONFIDENCE_THRESHOLD
    priority = "HIGH" if label == "hazardous" else "NORMAL"
    officer = ZONES.get(zone, "Not assigned")
    report_id = "GWL-" + now.strftime("%Y%m%d-%H%M%S-%f")[:21]

    IMAGES_DIR.mkdir(exist_ok=True)
    OUTBOX.mkdir(exist_ok=True)
    image.convert("RGB").save(IMAGES_DIR / f"{report_id}.jpg")

    row = {
        "report_id": report_id,
        "reported_at": now.strftime("%Y-%m-%d %H:%M"),
        "photo_taken_at": taken.strftime("%Y-%m-%d %H:%M"),
        "day": taken.strftime("%A"),
        "latitude": meta.get("lat"),
        "longitude": meta.get("lon"),
        "address": address,
        "zone": zone,
        "authority": AUTHORITY_NAME,
        "officer": officer,
        "category": label,
        "confidence": round(result["confidence"] * 100, 1),
        "needs_review": needs_review,
        "priority": priority,
        "clean_by": clean_by.strftime("%d %b %Y"),
        "status": "Alert sent",
        "mode": "demo" if result["demo"] else "model",
    }
    df = pd.concat([load_reports(), pd.DataFrame([row])], ignore_index=True)
    df.to_csv(REPORTS_CSV, index=False)

    alert = build_alert_text(row)
    (OUTBOX / f"{report_id}.txt").write_text(alert, encoding="utf-8")
    return row, alert


def build_alert_text(row):
    if pd.notna(row["latitude"]) and pd.notna(row["longitude"]):
        maps = f"https://www.google.com/maps?q={row['latitude']},{row['longitude']}"
    else:
        maps = "GPS not available"
    review = "YES - low confidence, please verify on site" if row["needs_review"] else "No"
    return (
        f"GARBAGE CLEANUP ALERT  [{row['priority']} PRIORITY]\n"
        f"{'-' * 46}\n"
        f"To        : {row['authority']}\n"
        f"Officer   : {row['officer']}\n"
        f"Zone      : {row['zone']}\n"
        f"Report ID : {row['report_id']}\n"
        f"Reported  : {row['reported_at']}\n"
        f"Photo time: {row['photo_taken_at']} ({row['day']})\n"
        f"Location  : {row['address']}\n"
        f"Map       : {maps}\n"
        f"Garbage   : {row['category']} (AI confidence {row['confidence']}%)\n"
        f"Needs manual review: {review}\n"
        f"ACTION    : Please clean this location by {row['clean_by']}.\n"
    )