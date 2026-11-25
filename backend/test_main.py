from fastapi.testclient import TestClient
import main
from main import app, format_row, get_current_user
client = TestClient(app)
def test_root_heartbeat():
    res = client.get("/")
    assert res.status_code == 200
def test_login_citizen():
    res = client.post("/api/login", json={"email": "citizen@test.com", "password": "password123"})
    assert res.status_code == 200
    assert res.json()["role"] == "citizen"
def test_reports_list():
    res = client.get("/api/reports")
    assert res.status_code == 200


def test_format_row_normalizes_legacy_status_and_reference_id():
    report = format_row(
        {
            "id": 1,
            "user_id": 7,
            "image_path": "/uploads/waste.jpg",
            "category_slug": "biodegradable",
            "confidence": 0.9,
            "needs_retake": False,
            "latitude": 26.2183,
            "longitude": 78.1828,
            "status": "reported",
        }
    )

    assert report["status"] == "submitted"
    assert report["reference_id"] == "C2C-001"


def test_create_report_rejects_missing_gps():
    user = {"id": 7, "name": "Test Citizen", "role": "citizen"}
    previous_override = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        response = client.post(
            "/api/reports",
            files={"file": ("waste.jpg", b"image", "image/jpeg")},
        )
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = previous_override

    assert response.status_code == 400
    assert response.json()["detail"] == "Latitude and longitude are required to submit a report."


def test_create_report_rejects_zero_zero_gps():
    user = {"id": 7, "name": "Test Citizen", "role": "citizen"}
    previous_override = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: user
    try:
        response = client.post(
            "/api/reports",
            data={"latitude": "0", "longitude": "0"},
            files={"file": ("waste.jpg", b"image", "image/jpeg")},
        )
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = previous_override

    assert response.status_code == 400
    assert "(0, 0)" in response.json()["detail"]


def test_citizen_cannot_edit_report_after_assignment(monkeypatch):
    report = {"id": 1, "user_id": 7, "status": "assigned"}
    user = {"id": 7, "name": "Test Citizen", "role": "citizen"}
    previous_override = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: user

    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, _query, _params=()):
            pass

        def fetchone(self):
            return report

    class FakeConnection:
        def cursor(self):
            return FakeCursor()

        def close(self):
            pass

    monkeypatch.setattr(main, "get_db_connection", lambda: FakeConnection())
    try:
        response = client.patch(
            "/api/reports/1",
            json={"remarks": "Updated landmark"},
        )
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = previous_override

    assert response.status_code == 403
