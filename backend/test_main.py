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


def test_format_row_can_omit_image_payload():
    report = format_row(
        {
            "id": 8,
            "user_id": 7,
            "image_path": "data:image/webp;base64,large-image",
            "category_slug": "hazardous",
            "confidence": 0.9,
            "needs_retake": False,
            "latitude": 26.2,
            "longitude": 78.1,
            "status": "submitted",
        },
        include_image=False,
    )

    assert "image_url" not in report
    assert report["reference_id"] == "C2C-008"


def test_reports_list_is_paginated_and_omits_image_blob(monkeypatch):
    executed_queries = []
    user = {"id": 7, "name": "Test Citizen", "role": "citizen"}
    previous_override = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: user

    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, query, params=()):
            executed_queries.append((query, params))

        def fetchone(self):
            query, _params = executed_queries[-1]
            if "SUM(CASE" in query:
                return {
                    "total": 25,
                    "submitted": 10,
                    "assigned": 5,
                    "in_progress": 4,
                    "cleaned": 5,
                    "rejected": 1,
                }
            return {"total": 25}

        def fetchall(self):
            query, _params = executed_queries[-1]
            if "GROUP BY" in query:
                return [{"category_slug": "hazardous", "count": 25}]
            return [
                {
                    "id": 21,
                    "user_id": 7,
                    "user_name": "Test Citizen",
                    "category_slug": "hazardous",
                    "corrected_slug": None,
                    "confidence": 0.9,
                    "needs_retake": False,
                    "latitude": 26.2,
                    "longitude": 78.1,
                    "ward": "Ward 12",
                    "remarks": "Near park",
                    "description": "Plastic waste",
                    "status": "submitted",
                    "assigned_worker_id": None,
                    "assigned_worker_name": None,
                    "created_at": None,
                }
            ]

    class FakeConnection:
        def cursor(self):
            return FakeCursor()

        def close(self):
            pass

    monkeypatch.setattr(main, "get_db_connection", lambda: FakeConnection())
    try:
        response = client.get("/api/reports?page=2&limit=20")
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = previous_override

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 25
    assert result["page"] == 2
    assert result["total_pages"] == 2
    assert result["items"][0]["reference_id"] == "C2C-021"
    assert "image_url" not in result["items"][0]
    list_query, list_params = executed_queries[-1]
    assert "image_path" not in list_query
    assert list_params[-2:] == (20, 20)


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
