import shutil
import sys
from pathlib import Path

SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("garbage_classification")
DST = Path("dataset")

# 12-class folder name  ->  our 3 classes
MAPPING = {
    "biological": "biodegradable",
    "paper": "biodegradable",
    "cardboard": "biodegradable",
    "battery": "hazardous",
    "plastic": "non_biodegradable",
    "metal": "non_biodegradable",
    "brown-glass": "non_biodegradable",
    "green-glass": "non_biodegradable",
    "white-glass": "non_biodegradable",
    "clothes": "non_biodegradable",
    "shoes": "non_biodegradable",
    "trash": "non_biodegradable",
}

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp"}


def main():
    if not SRC.exists():
        sys.exit(f"Folder not found: {SRC}")

    counts = {}
    for folder in SRC.rglob("*"):
        if folder.is_dir() and folder.name.lower() in MAPPING:
            target = DST / MAPPING[folder.name.lower()]
            target.mkdir(parents=True, exist_ok=True)
            for img in folder.iterdir():
                if img.suffix.lower() in IMAGE_EXTS:
                    new_name = f"{folder.name}_{img.name}"
                    shutil.copy(img, target / new_name)
                    counts[target.name] = counts.get(target.name, 0) + 1

    print("Done. Images per class:")
    for name, n in sorted(counts.items()):
        print(f"  {name}: {n}")
    if not counts:
        print("No images found. Check the folder path and folder names.")


if __name__ == "__main__":
    main()