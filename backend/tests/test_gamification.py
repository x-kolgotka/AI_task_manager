from tests.conftest import register_and_login
from app.services import ai as ai_svc


def _h(tok): return {"Authorization": f"Bearer {tok}"}


def test_first_task_badge_and_points(client):
    tok, _ = register_and_login(client)
    r = client.post("/api/tasks", json={"title": "t1"}, headers=_h(tok))
    tid = r.json()["task"]["id"]
    r = client.put(f"/api/tasks/{tid}", json={"status": "DONE"}, headers=_h(tok))
    assert r.status_code == 200
    assert "first_task" in r.json()["awarded"]
    pts = client.get("/api/users/points", headers=_h(tok)).json()["points"]
    assert pts >= 10
    ach = client.get("/api/users/achievements", headers=_h(tok)).json()
    assert any(a["badge"] == "first_task" for a in ach)


def test_no_duplicate_badge(client):
    tok, _ = register_and_login(client)
    r = client.post("/api/tasks", json={"title": "t1"}, headers=_h(tok))
    tid = r.json()["task"]["id"]
    client.put(f"/api/tasks/{tid}", json={"status": "DONE"}, headers=_h(tok))
    client.put(f"/api/tasks/{tid}", json={"status": "TODO"}, headers=_h(tok))
    r2 = client.put(f"/api/tasks/{tid}", json={"status": "DONE"}, headers=_h(tok))
    assert "first_task" not in r2.json()["awarded"]


def test_preferences_and_email(client):
    tok, _ = register_and_login(client)
    r = client.get("/api/users/preferences", headers=_h(tok))
    assert r.status_code == 200
    assert r.json()["theme"] == "light"
    r = client.put("/api/users/preferences", json={"theme": "dark", "dailyDigest": True}, headers=_h(tok))
    assert r.json()["theme"] == "dark"
    assert r.json()["dailyDigest"] is True
    from app.services import email as email_svc
    r = client.put("/api/users/email", json={"email": "u@example.com"}, headers=_h(tok))
    assert r.json()["codeSent"] is True
    code = next(e for e in reversed(email_svc.sent_log()) if e["to"] == "u@example.com")["text"].split(": ")[1]
    vr = client.post("/api/users/email/verify", json={"code": code}, headers=_h(tok))
    assert vr.json()["emailVerified"] is True


def test_ai_master_badge_after_ten_ai_uses(client, db):
    tok, user = register_and_login(client)
    for _ in range(10):
        ai_svc.record_usage(db, user["id"], "split")

    ach = client.get("/api/users/achievements", headers=_h(tok)).json()
    assert any(a["badge"] == "ai_master" for a in ach)
    pts = client.get("/api/users/points", headers=_h(tok)).json()["points"]
    assert pts >= 40
