"""Heimdall accounts — named Admin-key accounts; keys live in the OS keychain."""

import sqlite3

import keyring

SERVICE_NAME = "heimdall"


class DuplicateAccountError(ValueError):
    """An account with this name already exists."""


def create_account(conn, name: str, api_key: str) -> int:
    """Create an account row and store its key in the OS keychain."""
    name = name.strip()
    api_key = api_key.strip()
    if not name:
        raise ValueError("account name must not be empty")
    if not api_key:
        raise ValueError("API key must not be empty")
    try:
        cursor = conn.execute("INSERT INTO accounts (name) VALUES (?)", (name,))
    except sqlite3.IntegrityError as exc:
        raise DuplicateAccountError(f"account {name!r} already exists") from exc
    keyring.set_password(SERVICE_NAME, name, api_key)
    conn.commit()
    return cursor.lastrowid


def get_api_key(name: str) -> str | None:
    """Return the account's key from the OS keychain, or None."""
    return keyring.get_password(SERVICE_NAME, name)
