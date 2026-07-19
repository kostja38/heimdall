"""Heimdall accounts — named Admin-key accounts; keys live in the OS keychain."""

import sqlite3

import keyring
import keyring.errors

SERVICE_NAME = "heimdall"


class DuplicateAccountError(ValueError):
    """An account with this name already exists."""


class AccountNotFoundError(KeyError):
    """No account with this name exists."""


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
    try:
        keyring.set_password(SERVICE_NAME, name, api_key)
    except Exception:
        conn.rollback()
        raise
    conn.commit()
    return cursor.lastrowid


def get_api_key(name: str) -> str | None:
    """Return the account's key from the OS keychain, or None."""
    return keyring.get_password(SERVICE_NAME, name)


def delete_account(conn, name: str) -> None:
    """Delete the account row and its keychain entry."""
    cursor = conn.execute("DELETE FROM accounts WHERE name = ?", (name,))
    if cursor.rowcount == 0:
        raise AccountNotFoundError(name)
    conn.commit()
    try:
        keyring.delete_password(SERVICE_NAME, name)
    except keyring.errors.PasswordDeleteError:
        pass  # keychain entry already gone — tolerate


def list_accounts(conn) -> list[dict]:
    """Return id, name, created_at for all accounts. Never key material."""
    rows = conn.execute(
        "SELECT id, name, created_at FROM accounts ORDER BY name"
    ).fetchall()
    return [{"id": r[0], "name": r[1], "created_at": r[2]} for r in rows]
