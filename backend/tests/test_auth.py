from tests.conftest import register_and_login
from app.services import sms as sms_svc


def test_register_sends_sms(client):
    r = client.post("/api/auth/register", json={"phone": "+12025551212", "password": "secret123"})
    assert r.status_code == 201
    assert len(sms_svc.sent_log()) == 1
    assert len(sms_svc.sent_log()[0]["code"]) == 6


def test_verify_sms_issues_tokens(client):
    client.post("/api/auth/register", json={"phone": "+12025551212", "password": "secret123"})
    code = sms_svc.sent_log()[-1]["code"]
    r = client.post("/api/auth/verify-sms", json={"phone": "+12025551212", "code": code})
    assert r.status_code == 200
    body = r.json()
    assert body["accessToken"] and body["refreshToken"]
    assert body["user"]["phoneVerified"] is True


def test_verify_wrong_code(client):
    client.post("/api/auth/register", json={"phone": "+12025551212", "password": "secret123"})
    r = client.post("/api/auth/verify-sms", json={"phone": "+12025551212", "code": "000000"})
    assert r.status_code == 400


def test_login_requires_verified(client):
    client.post("/api/auth/register", json={"phone": "+12025551212", "password": "secret123"})
    r = client.post("/api/auth/login", json={"phone": "+12025551212", "password": "secret123"})
    assert r.status_code == 403


def test_login_works_after_verify(client):
    register_and_login(client)
    r = client.post("/api/auth/login", json={"phone": "+12025551212", "password": "secret123"})
    assert r.status_code == 200
    assert r.json()["accessToken"]


def test_login_bad_password(client):
    register_and_login(client)
    r = client.post("/api/auth/login", json={"phone": "+12025551212", "password": "wrongpass"})
    assert r.status_code == 401


def test_me_endpoint(client):
    token, user = register_and_login(client)
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["id"] == user["id"]


def test_me_requires_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_refresh_access(client):
    client.post("/api/auth/register", json={"phone": "+12025551212", "password": "secret123"})
    code = sms_svc.sent_log()[-1]["code"]
    v = client.post("/api/auth/verify-sms", json={"phone": "+12025551212", "code": code}).json()
    r = client.post("/api/auth/refresh", json={"refreshToken": v["refreshToken"]})
    assert r.status_code == 200
    assert r.json()["accessToken"]


def test_refresh_rejects_bad(client):
    r = client.post("/api/auth/refresh", json={"refreshToken": "a" * 40 + ".b" * 10 + ".c" * 20})
    assert r.status_code == 401


def test_resend_sms_ok(client):
    client.post("/api/auth/register", json={"phone": "+12025551212", "password": "secret123"})
    r = client.post("/api/auth/resend-sms", json={"phone": "+12025551212"})
    assert r.status_code == 200
    assert len(sms_svc.sent_log()) == 2


def test_resend_rate_limit(client):
    client.post("/api/auth/register", json={"phone": "+12025551212", "password": "secret123"})
    client.post("/api/auth/resend-sms", json={"phone": "+12025551212"})
    client.post("/api/auth/resend-sms", json={"phone": "+12025551212"})
    r = client.post("/api/auth/resend-sms", json={"phone": "+12025551212"})
    assert r.status_code == 429


def test_duplicate_registration_rejected(client):
    register_and_login(client)
    r = client.post("/api/auth/register", json={"phone": "+12025551212", "password": "secret123"})
    assert r.status_code == 409
