import pytest
from fastapi.testclient import TestClient

import main
from main import app, get_current_user, hash_pw, verify_pw


client = TestClient(app)


class FakeCursor:
    def __init__(self, user):
        self.user = user
        self.query = ""

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, query, params=()):
        self.query = query
        if query.startswith("UPDATE users SET "):
            assignments = query.split(" SET ", 1)[1].split(" WHERE", 1)[0].split(", ")
            for assignment, value in zip(assignments, params[:-1]):
                column = assignment.split(" = ", 1)[0]
                self.user[column] = value

    def fetchone(self):
        if self.query.startswith("SELECT COUNT(*)"):
            return {"total": 3}
        if self.query.startswith("SELECT password_hash"):
            return {"password_hash": self.user["password_hash"]}
        if self.query.startswith("SELECT id, name, email, role FROM users"):
            return {key: self.user[key] for key in ("id", "name", "email", "role")}
        return None


class FakeConnection:
    def __init__(self, user):
        self.user = user

    def cursor(self):
        return FakeCursor(self.user)

    def commit(self):
        pass

    def close(self):
        pass


def use_test_user(user):
    previous_override = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: user
    return previous_override


def restore_test_user(previous_override):
    if previous_override is None:
        app.dependency_overrides.pop(get_current_user, None)
    else:
        app.dependency_overrides[get_current_user] = previous_override


def test_get_profile_returns_authenticated_user_and_report_count(monkeypatch):
    user = {"id": 7, "name": "Test Citizen", "email": "citizen@test.com", "role": "citizen"}
    previous_override = use_test_user(user)
    monkeypatch.setattr(main, "get_db_connection", lambda: FakeConnection(dict(user)))

    try:
        response = client.get("/api/profile")
    finally:
        restore_test_user(previous_override)

    assert response.status_code == 200
    assert response.json() == {
        **user,
        "phone": None,
        "organisation": None,
        "report_count": 3,
    }


@pytest.mark.parametrize("method", ["put", "patch"])
def test_profile_update_changes_name_and_returns_public_user(monkeypatch, method):
    user = {
        "id": 7,
        "name": "Test Citizen",
        "email": "citizen@test.com",
        "role": "citizen",
        "password_hash": hash_pw("old-pass"),
    }
    previous_override = use_test_user({key: value for key, value in user.items() if key != "password_hash"})
    monkeypatch.setattr(main, "get_db_connection", lambda: FakeConnection(user))

    try:
        response = getattr(client, method)(
            "/api/profile",
            json={"name": "Updated Citizen"},
        )
    finally:
        restore_test_user(previous_override)

    assert response.status_code == 200
    assert response.json() == {
        "id": 7,
        "name": "Updated Citizen",
        "email": "citizen@test.com",
        "role": "citizen",
    }


@pytest.mark.parametrize(
    ("payload", "message"),
    [
        (
            {"new_password": "updated-pass", "confirm_password": "updated-pass"},
            "Current password is required",
        ),
        (
            {
                "current_password": "old-pass",
                "new_password": "updated-pass",
                "confirm_password": "different-pass",
            },
            "do not match",
        ),
        (
            {
                "current_password": "old-pass",
                "new_password": "short",
                "confirm_password": "short",
            },
            "at least 6 characters",
        ),
    ],
)
def test_profile_update_validates_password_fields(monkeypatch, payload, message):
    user = {"id": 7, "name": "Test Citizen", "email": "citizen@test.com", "role": "citizen"}
    previous_override = use_test_user(user)
    monkeypatch.setattr(
        main,
        "get_db_connection",
        lambda: pytest.fail("Invalid password updates should not access the database."),
    )

    try:
        response = client.put("/api/profile", json=payload)
    finally:
        restore_test_user(previous_override)

    assert response.status_code == 400
    assert message in response.json()["detail"]


def test_profile_update_verifies_and_changes_password(monkeypatch):
    user = {
        "id": 7,
        "name": "Test Citizen",
        "email": "citizen@test.com",
        "role": "citizen",
        "password_hash": hash_pw("old-pass"),
    }
    public_user = {key: value for key, value in user.items() if key != "password_hash"}
    previous_override = use_test_user(public_user)
    monkeypatch.setattr(main, "get_db_connection", lambda: FakeConnection(user))

    try:
        response = client.put(
            "/api/profile",
            json={
                "current_password": "old-pass",
                "new_password": "updated-pass",
                "confirm_password": "updated-pass",
            },
        )
    finally:
        restore_test_user(previous_override)

    assert response.status_code == 200
    assert response.json() == public_user
    assert verify_pw("updated-pass", user["password_hash"])


def test_profile_update_rejects_incorrect_current_password(monkeypatch):
    user = {
        "id": 7,
        "name": "Test Citizen",
        "email": "citizen@test.com",
        "role": "citizen",
        "password_hash": hash_pw("old-pass"),
    }
    previous_override = use_test_user(
        {key: value for key, value in user.items() if key != "password_hash"}
    )
    monkeypatch.setattr(main, "get_db_connection", lambda: FakeConnection(user))

    try:
        response = client.put(
            "/api/profile",
            json={
                "current_password": "wrong-pass",
                "new_password": "updated-pass",
                "confirm_password": "updated-pass",
            },
        )
    finally:
        restore_test_user(previous_override)

    assert response.status_code == 400
    assert response.json()["detail"] == "Current password is incorrect."
