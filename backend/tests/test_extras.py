from tests.conftest import register_and_login


def _h(tok): return {"Authorization": f"Bearer {tok}"}


def test_analytics_dashboard(client):
    tok, _ = register_and_login(client)
    client.post("/api/tasks", json={"title": "a", "priority": "HIGH", "tags": ["backend"]}, headers=_h(tok))
    b = client.post("/api/tasks", json={"title": "b", "tags": ["frontend"]}, headers=_h(tok)).json()["task"]
    client.put(f"/api/tasks/{b['id']}", json={"status": "DONE"}, headers=_h(tok))
    r = client.get("/api/analytics/dashboard", headers=_h(tok))
    assert r.status_code == 200
    j = r.json()
    assert j["total"] == 2
    assert j["byStatus"]["DONE"] == 1
    assert j["byPriority"]["HIGH"] == 1
    assert "backend" in j["tags"]
    assert len(j["weekly"]) == 7


def test_semantic_search(client):
    tok, _ = register_and_login(client)
    client.post("/api/tasks", json={"title": "написать письмо клиенту", "tags": ["email"]}, headers=_h(tok))
    client.post("/api/tasks", json={"title": "fix broken button in dashboard"}, headers=_h(tok))
    r = client.post("/api/search/semantic", json={"query": "письмо", "limit": 5}, headers=_h(tok))
    assert r.status_code == 200
    results = r.json()["results"]
    assert len(results) >= 1
    assert "письмо" in results[0]["title"].lower() or "email" in results[0]["title"].lower()


def test_task_comments(client):
    tok, _ = register_and_login(client)
    t = client.post("/api/tasks", json={"title": "t"}, headers=_h(tok)).json()["task"]
    r = client.post(f"/api/tasks/{t['id']}/comments", json={"text": "hi"}, headers=_h(tok))
    assert r.status_code == 201
    cid = r.json()["id"]
    lst = client.get(f"/api/tasks/{t['id']}/comments", headers=_h(tok)).json()
    assert len(lst) == 1
    assert lst[0]["text"] == "hi"
    d = client.delete(f"/api/tasks/{t['id']}/comments/{cid}", headers=_h(tok))
    assert d.status_code == 204
    assert client.get(f"/api/tasks/{t['id']}/comments", headers=_h(tok)).json() == []


def test_import_text(client):
    tok, _ = register_and_login(client)
    body = {"text": "[ ] Write code\n[x] Code review\n- Deploy to prod\n"}
    r = client.post("/api/ai/import-text", json=body, headers=_h(tok))
    assert r.status_code == 200
    drafts = r.json()["drafts"]
    assert len(drafts) == 3
    assert drafts[1]["status"] == "DONE"
    assert drafts[2]["title"].startswith("Deploy")


def test_deadline_reminder_outbox(client):
    from datetime import datetime, timedelta
    from app.services import email as email_svc
    tok, _ = register_and_login(client)
    # request email → get code from stub log → verify
    client.put("/api/users/email", json={"email": "u@example.com"}, headers=_h(tok))
    code = next(e for e in reversed(email_svc.sent_log()) if e["to"] == "u@example.com")["text"].split(": ")[1]
    client.post("/api/users/email/verify", json={"code": code}, headers=_h(tok))
    due = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    client.post("/api/tasks", json={"title": "soon", "dueDate": due}, headers=_h(tok))
    r = client.post("/api/users/notifications/deadline-check", headers=_h(tok))
    assert r.status_code == 200
    assert r.json()["sent"] == 1
    ob = client.get("/api/users/notifications/outbox", headers=_h(tok)).json()
    assert any("Deadline" in e["subject"] for e in ob["items"])
