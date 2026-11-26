import os
import json
from pathlib import Path
import numpy as np
import tensorflow as tf
from PIL import Image
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
MODEL_PATH = BASE_DIR / "waste_classifier (2).keras"
CLASS_NAMES_PATH = BASE_DIR / "class_names (2).json"
PHOTOS_DIR = BASE_DIR / "received_photos"

model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASS_NAMES_PATH, "r") as file:
    class_names = json.load(file)

print("AI Waste Classification Model Loaded Successfully!")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Welcome to Click2Clean! ♻️\n"
        "I can help you identify and sort waste.\n"
        "Send a message to get started!"
    )


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Click2Clean Bot Help ♻️\n\n"
        "Send me a message and I'll reply.\n"
        "Use /start to begin.\n"
        "Use /help to see this message."
    )


async def reply_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.lower()

    if "battery" in text:
        reply = "🔋 Battery: Hazardous waste. Please dispose of it at a battery collection point."
    elif "cfl" in text or "bulb" in text:
        reply = "💡 CFL bulb: Hazardous waste. Handle carefully and use a proper collection point."
    elif "tin can" in text or "metal" in text:
        reply = "🥫 Tin can: Non-biodegradable. Recycle it in the metal recycling bin."
    elif "plastic" in text or "bottle" in text:
        reply = "🧴 Plastic bottle: Non-biodegradable. Clean it and recycle it."
    elif "food" in text or "peel" in text:
        reply = "🍎 Food scraps: Biodegradable. Put them in the compost or wet-waste bin."
    elif "paper" in text or "cardboard" in text:
        reply = "📄 Paper/cardboard: Biodegradable. Keep it dry for recycling."
    else:
        reply = "♻️ Tell me the name of a waste item (e.g., battery, tin can, plastic bottle, food scraps)."

    await update.message.reply_text(reply)

async def photo_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    photo = update.message.photo[-1]

    os.makedirs(PHOTOS_DIR, exist_ok=True)

    image_file = await photo.get_file()

    image_path = os.path.join(
        PHOTOS_DIR,
        f"{update.message.message_id}.jpg"
    )

    await image_file.download_to_drive(image_path)

    try:
        image = Image.open(image_path).convert("RGB")
        image = image.resize((224, 224))

        image_array = np.array(image, dtype=np.float32)
        image_array = np.expand_dims(image_array, axis=0)

        predictions = model.predict(image_array, verbose=0)

        predicted_index = int(np.argmax(predictions[0]))
        confidence = float(predictions[0][predicted_index])

        predicted_class = class_names[predicted_index]

        await update.message.reply_text(
            f"♻️ Waste Classification Result\n\n"
            f"Category: {predicted_class}\n"
            f"Confidence: {confidence * 100:.2f}%"
        )

    except Exception as e:
        print("Prediction error:", e)
        await update.message.reply_text(
            "Sorry! I couldn't identify this image."
        )


def main():
    if not TOKEN:
        raise ValueError("Telegram bot token is missing from .env")

    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(MessageHandler(filters.PHOTO, photo_message))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, reply_message))

    print("Click2Clean Telegram Bot is running!")
    app.run_polling()


if __name__ == "__main__":
    main()