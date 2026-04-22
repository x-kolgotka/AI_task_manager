import os
os.environ["PYTEST_RUNNING"] = "1"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.main import create_app
from app.db import engine, SessionLocal
from app.services import sms as sms_svc


@pytest.fixture(scope="session")
def app():
    return create_app()


@pytest.fixture()
def client(app):
    return TestClient(app)


@pytest.fixture(autouse=True)
def _clean_db():
    sms_svc._clear()
    with engine.begin() as conn:
        conn.execute(text(
            'TRUNCATE "AiCache","AiUsage","Preferences","Subtask","Task","SmsCode","User" RESTART IDENTITY CASCADE'
        ))
    yield


@pytest.fixture()
def db():
    s = SessionLocal()
    try:
        yield s
    finally:
        s.close()


def register_and_login(client, phone="+12025551212", password="secret123"):
    r = client.post("/api/auth/register", json={"phone": phone, "password": password})
    assert r.status_code == 201, r.text
    code = sms_svc.sent_log()[-1]["code"]
    r = client.post("/api/auth/verify-sms", json={"phone": phone, "code": code})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["accessToken"], data["user"]
