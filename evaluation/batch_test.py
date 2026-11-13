from pathlib import Path

import pandas as pd
from PIL import Image

import pipeline as pl

FOLDER = Path("test_images")
rows = []
files = sorted(p for p in FOLDER.glob("*") if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
if not files:
    raise SystemExit("No images found in test_images/. Add some photos first.")

for path in files:
    image = Image.open(path)
    meta = pl.extract_metadata(image)
    res = pl.classify(image)
    expected = next((c for c in pl.get_class_names() if path.stem.lower().startswith(c)), "")
    rows.append({
        "file": path.name,
        "gps_found": meta["lat"] is not None,
        "time_found": meta["taken_at"] is not None,
        "expected": expected,
        "predicted": res["label"],
        "confidence_%": round(res["confidence"] * 100, 1),
        "correct": (res["label"] == expected) if expected else "",
        "latency_ms": round(res["latency_ms"]),
        "mode": "demo" if res["demo"] else "model",
    })

df = pd.DataFrame(rows)
df.to_csv("test_results.csv", index=False)
print(df.to_string(index=False))
labelled = df[df["expected"] != ""]
if len(labelled):
    print(f"\nAccuracy on labelled test images: {labelled['correct'].mean() * 100:.1f}%")
print(f"GPS found in {df['gps_found'].mean() * 100:.0f}% of images")
print(f"Average latency: {df['latency_ms'].mean():.0f} ms")