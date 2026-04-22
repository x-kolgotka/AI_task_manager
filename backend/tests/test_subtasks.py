from tests.conftest import register_and_login


def _h(tok): return {"Authorization": f"Bearer {tok}"}


def _mktask(client, tok, title="T"):
    return client.post("/api/tasks", json={"title": title}, headers=_h(tok)).json()["task"]["id"]


def test_create_subtask(client):
    tok, _ = register_and_login(client)
    tid = _mktask(client, tok)
    r = client.post(f"/api/tasks/{tid}/subtasks", json={"title": "step 1"}, headers=_h(tok))
    assert r.status_code == 201
    assert r.json()["subtask"]["title"] == "step 1"


def test_update_subtask(client):
    tok, _ = register_and_login(client)
    tid = _mktask(client, tok)
    sid = client.post(f"/api/tasks/{tid}/subtasks", json={"title": "a"}, headers=_h(tok)).json()["subtask"]["id"]
    r = client.put(f"/api/subtasks/{sid}", json={"completed": True, "estimateHours": 1.5}, headers=_h(tok))
    assert r.json()["subtask"]["completed"] is True
    assert r.json()["subtask"]["estimateHours"] == 1.5


def test_delete_subtask(client):
    tok, _ = register_and_login(client)
    tid = _mktask(client, tok)
    sid = client.post(f"/api/tasks/{tid}/subtasks", json={"title": "x"}, headers=_h(tok)).json()["subtask"]["id"]
    assert client.delete(f"/api/subtasks/{sid}", headers=_h(tok)).status_code == 204


def test_move_subtask(client):
    tok, _ = register_and_login(client)
    t1 = _mktask(client, tok, "P1")
    t2 = _mktask(client, tok, "P2")
    sid = client.post(f"/api/tasks/{t1}/subtasks", json={"title": "s"}, headers=_h(tok)).json()["subtask"]["id"]
    r = client.put(f"/api/subtasks/{sid}", json={"taskId": t2}, headers=_h(tok))
    assert r.json()["subtask"]["taskId"] == t2


def test_other_user_cannot_touch(client):
    a, _ = register_and_login(client, phone="+12025551111")
    b, _ = register_and_login(client, phone="+12025552222")
    tid = _mktask(client, a)
    sid = client.post(f"/api/tasks/{tid}/subtasks", json={"title": "s"}, headers=_h(a)).json()["subtask"]["id"]
    assert client.put(f"/api/subtasks/{sid}", json={"title": "x"}, headers=_h(b)).status_code == 404
