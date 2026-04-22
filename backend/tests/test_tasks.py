from tests.conftest import register_and_login


def _h(tok): return {"Authorization": f"Bearer {tok}"}


def test_create_list_task(client):
    tok, _ = register_and_login(client)
    r = client.post("/api/tasks", json={"title": "Write docs", "priority": "HIGH"}, headers=_h(tok))
    assert r.status_code == 201
    tid = r.json()["task"]["id"]
    r = client.get("/api/tasks", headers=_h(tok))
    assert r.status_code == 200
    tasks = r.json()["tasks"]
    assert len(tasks) == 1 and tasks[0]["id"] == tid


def test_status_filter(client):
    tok, _ = register_and_login(client)
    client.post("/api/tasks", json={"title": "A"}, headers=_h(tok))
    r = client.post("/api/tasks", json={"title": "B"}, headers=_h(tok))
    tid = r.json()["task"]["id"]
    client.put(f"/api/tasks/{tid}", json={"status": "DONE"}, headers=_h(tok))
    done = client.get("/api/tasks?status=DONE", headers=_h(tok)).json()["tasks"]
    assert len(done) == 1 and done[0]["id"] == tid


def test_update_delete(client):
    tok, _ = register_and_login(client)
    r = client.post("/api/tasks", json={"title": "A"}, headers=_h(tok))
    tid = r.json()["task"]["id"]
    r = client.put(f"/api/tasks/{tid}", json={"title": "B"}, headers=_h(tok))
    assert r.json()["task"]["title"] == "B"
    r = client.delete(f"/api/tasks/{tid}", headers=_h(tok))
    assert r.status_code == 204
    assert client.get(f"/api/tasks/{tid}", headers=_h(tok)).status_code == 404


def test_user_isolation(client):
    a, _ = register_and_login(client, phone="+12025551111")
    b, _ = register_and_login(client, phone="+12025552222")
    r = client.post("/api/tasks", json={"title": "mine"}, headers=_h(a))
    tid = r.json()["task"]["id"]
    assert client.get(f"/api/tasks/{tid}", headers=_h(b)).status_code == 404


def test_reorder(client):
    tok, _ = register_and_login(client)
    ids = []
    for t in ["A", "B", "C"]:
        ids.append(client.post("/api/tasks", json={"title": t}, headers=_h(tok)).json()["task"]["id"])
    reversed_ids = list(reversed(ids))
    r = client.post("/api/tasks/reorder", json={"order": reversed_ids}, headers=_h(tok))
    assert r.status_code == 200
    got = [t["id"] for t in client.get("/api/tasks", headers=_h(tok)).json()["tasks"]]
    assert got == reversed_ids


def test_unauth(client):
    assert client.get("/api/tasks").status_code == 401
