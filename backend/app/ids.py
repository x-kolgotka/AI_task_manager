import secrets


def cuid() -> str:
    return "c" + secrets.token_hex(12)
