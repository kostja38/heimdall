"""Heimdall accounts — named Admin-key accounts; keys live in the OS keychain."""

import keyring

SERVICE_NAME = "heimdall"


def create_account(conn, name: str, api_key: str) -> int:
    """Create an account row and store its key in the OS keychain."""
    cursor = conn.execute("INSERT INTO accounts (name) VALUES (?)", (name,))
    keyring.set_password(SERVICE_NAME, name, api_key)
    conn.commit()
    return cursor.lastrowid


def get_api_key(name: str) -> str | None:
    """Return the account's key from the OS keychain, or None."""
    return keyring.get_password(SERVICE_NAME, name)
