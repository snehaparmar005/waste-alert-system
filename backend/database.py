import os
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    use_ssl = os.getenv("DB_SSL", "false").lower() == "true"
    ssl_config = {"ssl": {}} if use_ssl else {}

    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "waste_db"),
        cursorclass=DictCursor,
        autocommit=False,
        **ssl_config,
    )
