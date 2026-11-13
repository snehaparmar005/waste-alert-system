import os

import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


# ---------- fake MySQL so tests never touch your real database ----------
class FakeDB:
    def _init_(self):
        self.users = []    # dicts: user_id, name, email, password_hash
        self.reports = []  # dicts: report_id, image_path, address, latitude, longitude, status


class FakeCursor:
    def _init_(self, db):
        self.db = db
        self.result = None
        self.lastrowid = None

    def _enter_(self):
        return self

    def _exit_(self, *args):
        return False

    def execute(self, sql, params=()):
        s = " ".join(sql.split())
        if s.startswith("SELECT user_id FROM users WHERE email"):
            hit = [u for u in self.db.users if u["email"] == params[0]]
            self.result = hit[0] if hit else None
        elif s.startswith("INSERT INTO users"):
            row = {
                "user_id": len(self.db.users) + 1,
                "name": params[0],
                "email": params[1],
                "password_hash": params[2],
            }
            self.db.users.append(row)
            self.lastrowid = row["user_id"]
        elif s.startswith("INSERT INTO reports"):
            row = {
                "report_id": len(self.db.reports) + 1,
                "image_path": params[1],
                "latitude": params[4],
                "longitude": params[5],
                "address": params[6],
                "status": params[7],
            }
            self.db.reports.append(row)
            self.lastrowid = row["report_id"]
        elif s.startswith("SELECT report_id FROM reports WHERE report_id"):
            hit = [r for r in self.db.reports if r["report_id"] == params[0]]
            self.result = hit[0] if hit else None
        elif s.startswith("UPDATE reports SET status"):
            for r in self.db.reports:
                if r["report_id"] == params[1]:
                    r["status"] = params[0]
        elif s.startswith("SELECT report_id, image_path"):
            self.result = list(reversed(self.db.reports))
        else:
            raise AssertionError(f"Unexpected SQL in test: {s}")

    def fetchone(self):
        return self.result

    def fetchall(self):
        return self.result


class FakeConnection:
    def _init_(self, db):
        self.db = db

    def cursor(self):
        return FakeCursor(self.db)

    def commit(self):
        pass

    def close(self):
        pass


@pytest.fixture(autouse=True)
def fake_db(monkeypatch):
    db = FakeDB()
    monkeypatch.setattr(main, "get_db_connection", lambda: FakeConnection(db))
    return db


@pytest.fixture
def cleanup_uploads():
    before = set(os.listdir(main.UPLOAD_DIR))
    yield
    for name in set(os.listdir(main.UPLOAD_DIR)) - before:
        os.remove(os.path.join(main.UPLOAD_DIR, name))


# ---------- /register ----------
def test_register_success(fake_db):
    r = client.post(
        "/register",
        json={"name": "Test User", "email": "testuser@gmail.com", "password_hash": "Test@12345"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "success"
    # password must be hashed, not stored as plain text
    assert fake_db.users[0]["password_hash"] != "Test@12345"


def test_register_duplicate_returns_400_not_500():
    body = {"name": "Test User", "email": "dup@gmail.com", "password_hash": "Test@12345"}
    assert client.post("/register", json=body).status_code == 200
    r = client.post("/register", json=body)
    assert r.status_code == 400
    assert r.json()["detail"] == "Email is already registered!"


def test_register_missing_field_returns_422():
    r = client.post("/register", json={"name": "x"})
    assert r.status_code == 422


# ---------- /report ----------
def test_report_upload_success(cleanup_uploads):
    r = client.post(
        "/report",
        files={"file": ("photo.jpg", b"fake-image-bytes", "image/jpeg")},
        data={"address": "MG Road", "latitude": "12.97", "longitude": "77.59"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "success"
    assert r.json()["image_url"].startswith("/uploads/")


def test_report_rejects_non_image(cleanup_uploads):
    r = client.post(
        "/report",
        files={"file": ("notes.txt", b"hello", "text/plain")},
        data={"address": "MG Road", "latitude": "12.97", "longitude": "77.59"},
    )
    assert r.status_code == 400


def test_report_json_body_returns_422():
    # Sending JSON instead of form data is the classic cause of 422