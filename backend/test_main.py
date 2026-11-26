from fastapi.testclient import TestClient
import base64
import io

import main
import pytest
from PIL import Image
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


def test_worker_reports_include_fallback_assignments(monkeypatch):
    executed_queries = []
    user = {"id": 7, "name": "Test Worker", "role": "worker"}
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: user)

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
                    "total": 1,
                    "submitted": 0,
                    "assigned": 1,
                    "in_progress": 0,
                    "cleaned": 0,
                    "rejected": 0,
                }
            return {"total": 1}

        def fetchall(self):
            query, _params = executed_queries[-1]
            if "GROUP BY" in query:
                return []
            return [
                {
                    "id": 21,
                    "user_id": 99,
                    "user_name": "Report Owner",
                    "category_slug": "hazardous",
                    "corrected_slug": None,
                    "confidence": 0.9,
                    "needs_retake": False,
                    "latitude": 26.2,
                    "longitude": 78.1,
                    "ward": "Ward 12",
                    "remarks": "Near park",
                    "description": "Plastic waste",
                    "status": "assigned",
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

    response = client.get("/api/reports?assigned_only=true")

    assert response.status_code == 200
    result = response.json()
    assert result["total"] == 1
    assert result["items"][0]["status"] == "assigned"
    assert result["items"][0]["assigned_worker_id"] is None
    assert result["items"][0]["assigned_worker_name"] is None
    worker_scope_query, worker_scope_params = executed_queries[0]
    assert "NOT EXISTS" in worker_scope_query
    assert worker_scope_params == (7, 7)


def test_format_row_normalizes_assigned_worker_id():
    report = format_row(
        {
            "id": 8,
            "user_id": 7,
            "category_slug": "hazardous",
            "confidence": 0.9,
            "needs_retake": False,
            "latitude": 26.2,
            "longitude": 78.1,
            "status": "assigned",
            "assigned_worker_id": "3",
        }
    )

    assert report["assigned_worker_id"] == 3
    assert report["assigned_worker_name"] is None


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


@pytest.mark.parametrize(
    ("color", "expected_slug"),
    [
        ((20, 170, 35), "biodegradable"),
        ((25, 25, 25), "hazardous"),
        ((240, 40, 210), "non_biodegradable"),
    ],
)
def test_predict_waste_uses_image_fallback_when_model_is_missing(
    monkeypatch, tmp_path, capsys, color, expected_slug
):
    image_path = tmp_path / "sample.png"
    Image.new("RGB", (32, 32), color).save(image_path)
    monkeypatch.setattr(main, "_model", None)
    monkeypatch.setattr(main, "MODEL_PATH", str(tmp_path / "missing.keras"))

    prediction = main.predict_waste(str(image_path))

    assert prediction == {
        "slug": expected_slug,
        "label": main.LABEL_MAP[expected_slug],
        "confidence": 0.78,
        "needs_retake": False,
    }
    assert "ML inference fallback:" in capsys.readouterr().out


def test_predict_waste_falls_back_when_inference_runs_out_of_memory(
    monkeypatch, tmp_path, capsys
):
    image_path = tmp_path / "sample.png"
    Image.new("RGB", (32, 32), (25, 25, 25)).save(image_path)

    class OutOfMemoryModel:
        def predict(self, *_args, **_kwargs):
            raise MemoryError("not enough memory")

    monkeypatch.setattr(main, "_model", OutOfMemoryModel())

    prediction = main.predict_waste(str(image_path))

    assert prediction["slug"] == "hazardous"
    assert prediction["confidence"] == 0.78
    assert main._model is None
    assert "ML inference fallback: MemoryError('not enough memory')" in capsys.readouterr().out


def test_encode_report_image_falls_back_to_jpeg(monkeypatch, tmp_path):
    image_path = tmp_path / "sample.png"
    Image.new("RGB", (640, 320), (80, 120, 160)).save(image_path)
    original_save = Image.Image.save

    def fail_webp_save(self, fp, format=None, **params):
        if format == "WEBP":
            raise OSError("WebP encoder unavailable")
        return original_save(self, fp, format=format, **params)

    monkeypatch.setattr(Image.Image, "save", fail_webp_save)

    data_uri = main._encode_report_image(str(image_path))
    encoded_image = base64.b64decode(data_uri.split(",", 1)[1])

    assert data_uri.startswith("data:image/jpeg;base64,")
    with Image.open(io.BytesIO(encoded_image)) as encoded:
        assert encoded.format == "JPEG"
        assert encoded.size == (480, 240)


def test_create_report_returns_readable_json_for_unexpected_errors(monkeypatch):
    user = {"id": 7, "name": "Test Citizen", "role": "citizen"}
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: user)
    monkeypatch.setattr(main, "predict_waste", lambda _path: {
        "slug": "biodegradable",
        "confidence": 0.78,
        "needs_retake": False,
    })

    def fail_db_connection():
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(main, "get_db_connection", fail_db_connection)
    image_buffer = io.BytesIO()
    Image.new("RGB", (8, 8), (20, 170, 35)).save(image_buffer, format="PNG")

    response = client.post(
        "/api/reports",
        data={"latitude": "26.2", "longitude": "78.1"},
        files={"file": ("waste.png", image_buffer.getvalue(), "image/png")},
    )

    assert response.status_code == 500
    assert response.json()["detail"] == "Report error: RuntimeError: database unavailable"


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


def test_officer_can_list_workers_with_case_insensitive_role(monkeypatch):
    user = {"id": 7, "name": "Test Officer", "role": "OFFICER"}
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: user)

    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, *_args):
            pass

        def fetchall(self):
            return [{"id": 3, "name": "Test Worker"}]

    class FakeConnection:
        def cursor(self):
            return FakeCursor()

        def close(self):
            pass

    monkeypatch.setattr(main, "get_db_connection", lambda: FakeConnection())

    response = client.get("/api/workers")

    assert response.status_code == 200
    assert response.json() == [{"id": 3, "name": "Test Worker"}]


def test_officer_can_assign_worker_to_any_report(monkeypatch):
    user = {"id": 7, "name": "Test Officer", "role": "OFFICER"}
    report = {
        "id": 1,
        "user_id": 99,
        "user_name": "Report Owner",
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
        "reference_id": "C2C-001",
        "assigned_worker_id": None,
        "assigned_worker_name": None,
        "created_at": None,
    }
    worker = {"id": 3, "nagar_nigam_id": None}
    updated_report = {**report, "status": "assigned", "assigned_worker_id": 3}
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: user)
    monkeypatch.setattr(main, "log_audit", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(main, "create_notification", lambda **_kwargs: None)

    class FakeCursor:
        def __init__(self):
            self.fetchone_results = [report, worker, updated_report]

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, *_args):
            pass

        def fetchone(self):
            return self.fetchone_results.pop(0)

    class FakeConnection:
        def cursor(self):
            return FakeCursor()

        def commit(self):
            pass

        def close(self):
            pass

    monkeypatch.setattr(main, "get_db_connection", lambda: FakeConnection())

    response = client.patch("/api/reports/1", json={"assigned_worker_id": 3})

    assert response.status_code == 200
    assert response.json()["status"] == "assigned"
    assert response.json()["assigned_worker_id"] == 3


def test_worker_can_update_report_status(monkeypatch):
    user = {"id": 3, "name": "Test Worker", "role": "WORKER"}
    report = {
        "id": 1,
        "user_id": 99,
        "user_name": "Report Owner",
        "category_slug": "hazardous",
        "corrected_slug": None,
        "confidence": 0.9,
        "needs_retake": False,
        "latitude": 26.2,
        "longitude": 78.1,
        "ward": "Ward 12",
        "remarks": "Near park",
        "description": "Plastic waste",
        "status": "assigned",
        "reference_id": "C2C-001",
        "assigned_worker_id": 3,
        "assigned_worker_name": "Test Worker",
        "created_at": None,
    }
    updated_report = {**report, "status": "in_progress"}
    monkeypatch.setitem(app.dependency_overrides, get_current_user, lambda: user)
    monkeypatch.setattr(main, "log_audit", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(main, "create_notification", lambda **_kwargs: None)

    class FakeCursor:
        def __init__(self):
            self.fetchone_results = [report, updated_report]

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def execute(self, *_args):
            pass

        def fetchone(self):
            return self.fetchone_results.pop(0)

    class FakeConnection:
        def cursor(self):
            return FakeCursor()

        def commit(self):
            pass

        def close(self):
            pass

    monkeypatch.setattr(main, "get_db_connection", lambda: FakeConnection())

    response = client.patch("/api/reports/1", json={"status": "in_progress"})

    assert response.status_code == 200
    assert response.json()["status"] == "in_progress"
