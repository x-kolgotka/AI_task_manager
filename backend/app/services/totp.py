import base64
import io
import secrets
import pyotp
import qrcode


def new_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, account_name: str, issuer: str = "TaskAI") -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=account_name, issuer_name=issuer)


def qr_png_data_url(uri: str) -> str:
    img = qrcode.make(uri)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def verify(secret: str, code: str) -> bool:
    if not secret or not code or not code.isdigit() or len(code) != 6:
        return False
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def generate_backup_codes(n: int = 8) -> list[str]:
    return [secrets.token_hex(4) for _ in range(n)]
