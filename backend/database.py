import os
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv  # <-- Make sure this says load_dotenv

# Load credentials from the hidden .env file
load_dotenv()  # <-- Make sure this says load_dotenv

def get_db_connection():
    connection = pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME", "waste_db"),
        port=int(os.getenv("DB_PORT", 3306)),
        cursorclass=DictCursor
    )
    return connection

