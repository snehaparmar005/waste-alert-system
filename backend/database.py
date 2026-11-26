import os
from urllib.parse import parse_qs, unquote, urlparse

import pymysql
from dotenv import load_dotenv
from pymysql.cursors import DictCursor

load_dotenv()


def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        parsed = urlparse(database_url.replace("mysql+pymysql://", "mysql://", 1))
        if parsed.scheme != "mysql":
            raise RuntimeError("DATABASE_URL must use the MySQL scheme.")
        query = parse_qs(parsed.query)
        ssl_mode = query.get("ssl-mode", [""])[0].upper()
        use_ssl = ssl_mode in {"REQUIRED", "VERIFY_CA", "VERIFY_IDENTITY"}
        ssl_config = {"ssl": {}} if use_ssl else {}
        return pymysql.connect(
            host=parsed.hostname,
            port=parsed.port or 3306,
            user=unquote(parsed.username or ""),
            password=unquote(parsed.password or ""),
            database=unquote(parsed.path.lstrip("/")),
            charset=query.get("charset", ["utf8mb4"])[0],
            cursorclass=DictCursor,
            autocommit=False,
            **ssl_config,
        )

    use_ssl = os.getenv("DB_SSL", "false").lower() == "true"
    ssl_config = {"ssl": {}} if use_ssl else {}
    return pymysql.connect(
        host=os.getenv("DB_HOST", "127.0.0.1"),
        port=int(os.getenv("DB_PORT", 3306)),
        user=os.getenv("DB_USER", "root"),
        password=os.getenv("DB_PASSWORD", ""),
        database=os.getenv("DB_NAME", "waste_db"),
        charset="utf8mb4",
        cursorclass=DictCursor,
        autocommit=False,
        **ssl_config,
    )
