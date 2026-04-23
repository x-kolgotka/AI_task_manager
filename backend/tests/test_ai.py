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


def test_parse_text(client):
    tok, _ = register_and_login(client)
    ai_svc.set_chat_impl(lambda p: json.dumps({
        "title": "Write docs", "dueDate": "2026-05-01", "priority": "HIGH", "confidence": 0.9
    }))
    try:
        r = client.post("/api/ai/parse-text", json={"text": "Написать доки на 1 мая срочно"}, headers=_h(tok))
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "Write docs"
        assert d["dueDate"] == "2026-05-01"
        assert d["priority"] == "HIGH"
    finally:
        ai_svc.set_chat_impl(None)


def test_extract_tags(client):
    tok, _ = register_and_login(client)
    ai_svc.set_chat_impl(lambda p: json.dumps({"tags": ["backend", "api", "REST"], "confidence": 0.9}))
    try:
        r = client.post("/api/ai/extract-tags", json={"text": "Write REST API"}, headers=_h(tok))
        assert r.status_code == 200
        d = r.json()
        assert d["tags"] == ["backend", "api", "rest"]
    finally:
        ai_svc.set_chat_impl(None)


def test_patterns_needs_history(client):
    tok, _ = register_and_login(client)
    r = client.get("/api/ai/patterns", headers=_h(tok))
    assert r.status_code == 200
    assert r.json()["patterns"] == []


def test_patterns_with_history(client):
    tok, _ = register_and_login(client)
    for i in range(3):
        _mktask(client, tok, f"t{i}")
    ai_svc.set_chat_impl(lambda p: json.dumps({
        "patterns": [{"category": "dev", "avgHours": 2.0, "count": 3}],
        "insights": ["You work fast on Mondays"],
        "prediction": {"hours": 1.5, "confidence": 0.7},
    }))
    try:
        r = client.get("/api/ai/patterns", headers=_h(tok))
        assert r.status_code == 200
        assert r.json()["insights"] == ["You work fast on Mondays"]
    finally:
        ai_svc.set_chat_impl(None)


def test_coach(client):
    tok, _ = register_and_login(client)
    for i in range(3):
        _mktask(client, tok, f"t{i}")
    ai_svc.set_chat_impl(lambda p: json.dumps({"insights": [
        {"type": "tip", "message": "slow down", "recommendation": "take a break"}
    ]}))
    try:
        r = client.get("/api/ai/coach", headers=_h(tok))
        assert r.status_code == 200
        assert r.json()["insights"][0]["message"] == "slow down"
    finally:
        ai_svc.set_chat_impl(None)


def test_weekly_report(client):
    tok, _ = register_and_login(client)
    _mktask(client, tok, "recent")
    ai_svc.set_chat_impl(lambda p: json.dumps({"recommendations": ["focus more"]}))
    try:
        r = client.get("/api/ai/weekly-report", headers=_h(tok))
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d
        assert d["recommendations"] == ["focus more"]
    finally:
        ai_svc.set_chat_impl(None)
