from fastapi.testclient import TestClient
from main import app
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
