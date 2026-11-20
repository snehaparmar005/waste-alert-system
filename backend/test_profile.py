from fastapi.testclient import TestClient

from main import app, get_current_user


client = TestClient(app)


def test_get_profile_returns_authenticated_user():
    user = {"id": 7, "name": "Test Citizen", "email": "citizen@test.com", "role": "citizen"}
    previous_override = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = lambda: user

    try:
        response = client.get("/api/profile")
    finally:
        if previous_override is None:
            app.dependency_overrides.pop(get_current_user)
        else:
            app.dependency_overrides[get_current_user] = previous_override

    assert response.status_code == 200
    assert response.json() == user
