import json
from tests.conftest import register_and_login
from app.services import ai as ai_svc


def _h(tok): return {"Authorization": f"Bearer {tok}"}


def _mktask(client, tok, title="P", desc="do stuff"):
    return client.post("/api/tasks", json={"title": title, "description": desc}, headers=_h(tok)).json()["task"]["id"]


def test_split_returns_subtasks(client):
    tok, _ = register_and_login(client)
    tid = _mktask(client, tok)
    ai_svc.set_chat_impl(lambda p: json.dumps({"subtasks": [
        {"title": "a", "estimateHours": 1},
        {"title": "b", "estimateHours": 2},
        {"title": "c"},
    ]}))
    try:
        r = client.post("/api/ai/split", json={"taskId": tid}, headers=_h(tok))
        assert r.status_code == 200
        subs = r.json()["subtasks"]
        assert len(subs) == 3
        assert subs[0]["title"] == "a"
    finally:
        ai_svc.set_chat_impl(None)


def test_split_apply_persists(client):
    tok, _ = register_and_login(client)
    tid = _mktask(client, tok)
    ai_svc.set_chat_impl(lambda p: json.dumps({"subtasks": [{"title": "x"}]}))
    try:
        client.post("/api/ai/split", json={"taskId": tid, "apply": True}, headers=_h(tok))
        t = client.get(f"/api/tasks/{tid}", headers=_h(tok)).json()["task"]
        assert len(t["subtasks"]) == 1
        assert t["subtasks"][0]["title"] == "x"
    finally:
        ai_svc.set_chat_impl(None)


def test_split_cached(client):
    tok, _ = register_and_login(client)
    tid = _mktask(client, tok)
    calls = {"n": 0}
    def chat(p):
        calls["n"] += 1
        return json.dumps({"subtasks": [{"title": "a"}]})
    ai_svc.set_chat_impl(chat)
    try:
        client.post("/api/ai/split", json={"taskId": tid}, headers=_h(tok))
        client.post("/api/ai/split", json={"taskId": tid}, headers=_h(tok))
        assert calls["n"] == 1
    finally:
        ai_svc.set_chat_impl(None)


def test_prioritize_returns_order(client):
    tok, _ = register_and_login(client)
    t1 = _mktask(client, tok, "A")
    t2 = _mktask(client, tok, "B")
    ai_svc.set_chat_impl(lambda p: json.dumps({"order": [t2, t1]}))
    try:
        r = client.post("/api/ai/prioritize", headers=_h(tok))
        assert r.status_code == 200
        assert r.json()["order"] == [t2, t1]
    finally:
        ai_svc.set_chat_impl(None)


def test_prioritize_needs_two(client):
    tok, _ = register_and_login(client)
    _mktask(client, tok)
    r = client.post("/api/ai/prioritize", headers=_h(tok))
    assert r.status_code == 400
