import pyotp
from tests.conftest import register_and_login


def _h(tok): return {"Authorization": f"Bearer {tok}"}


def test_2fa_full_flow(client):
    tok, user = register_and_login(client)
    phone = user["phone"]
    password = "secret123"

    setup = client.post("/api/auth/2fa/setup", headers=_h(tok)).json()
    secret = setup["secret"]
    assert setup["qr"].startswith("data:image/png;base64,")

    bad = client.post("/api/auth/2fa/verify", json={"code": "000000"}, headers=_h(tok))
    assert bad.status_code == 400

    good_code = pyotp.TOTP(secret).now()
    r = client.post("/api/auth/2fa/verify", json={"code": good_code}, headers=_h(tok))
    assert r.status_code == 200
    backup = r.json()["backupCodes"]
    assert len(backup) == 8

    # login now requires totp
    no_code = client.post("/api/auth/login", json={"phone": phone, "password": password})
    assert no_code.status_code == 401

    with_bad = client.post("/api/auth/login", json={"phone": phone, "password": password, "totpCode": "000000"})
    assert with_bad.status_code == 401

    with_good = client.post(
        "/api/auth/login",
        json={"phone": phone, "password": password, "totpCode": pyotp.TOTP(secret).now()},
    )
    assert with_good.status_code == 200

    # backup code works and is consumed
    r = client.post(
        "/api/auth/login",
        json={"phone": phone, "password": password, "totpCode": backup[0]},
    )
    assert r.status_code == 200
    r2 = client.post(
        "/api/auth/login",
        json={"phone": phone, "password": password, "totpCode": backup[0]},
    )
    assert r2.status_code == 401


def test_2fa_disable(client):
    tok, user = register_and_login(client)
    phone = user["phone"]
    password = "secret123"
    setup = client.post("/api/auth/2fa/setup", headers=_h(tok)).json()
    client.post(
        "/api/auth/2fa/verify",
        json={"code": pyotp.TOTP(setup["secret"]).now()},
        headers=_h(tok),
    )
    bad = client.post("/api/auth/2fa/disable", json={"password": "wrongpass"}, headers=_h(tok))
    assert bad.status_code == 401
    ok = client.post("/api/auth/2fa/disable", json={"password": password}, headers=_h(tok))
    assert ok.status_code == 200
    r = client.post("/api/auth/login", json={"phone": phone, "password": password})
    assert r.status_code == 200
