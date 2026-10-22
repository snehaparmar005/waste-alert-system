# Click-2-Clean: ML Model

Classifies a waste photo as Biodegradable, Non-biodegradable or Hazardous.
Trained on the Kaggle "Garbage Classification (12 classes)" dataset. Test accuracy 97%.

## Files
- train_local.py: training script (not needed to use the model)
- classifier.py: loads the model and gives predict(image_path)
- class_names.json: category names

## Download the model
waste_classifier.keras: [Download from Google Drive](https://drive.google.com/file/d/1DWwIwbP6zsg3qICpeA1v9ED3qHK1ddfn/view?usp=sharing)

Put it in the same folder as classifier.py and class_names.json.

## Use
```text
pip install tensorflow pillow numpy
python classifier.py path/to/photo.jpg
-> {'category': 'Hazardous', 'confidence': 0.93, 'needs_retake': False}
```

(TensorFlow version used for training: 2.21.0)
