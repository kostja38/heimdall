# Encrypted API-Key Storage & Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `accounts` table (migration 2) and `backend/accounts.py` — named accounts whose Anthropic Admin keys live exclusively in the OS keychain via `keyring`.

**Architecture:** Migration 2 extends the existing `MIGRATIONS` list in `backend/db.py`. A single module `backend/accounts.py` owns the account unit (DB row + keychain entry): create with rollback-on-keychain-failure, key retrieval, deletion tolerant of missing keychain entries, listing without key material. Tests replace the real keychain with an in-memory `KeyringBackend` via an autouse fixture.

**Tech Stack:** Python `sqlite3` stdlib, `keyring>=25` (new runtime dependency), pytest with `tmp_path`/`monkeypatch`.

**Spec:** `docs/superpowers/specs/2026-07-19-keyring-storage-design.md`

**Project workflow note:** Commits require the user's explicit go ("Go"-Freigabe). At each commit step, propose the commit and wait for approval unless the user has delegated committing for this session.

---

### Task 1: Migration 2 — accounts table

**Files:**
- Modify: `backend/db.py` (append to `MIGRATIONS`)
- Test: `tests/test_db.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_db.py`:

```python
def test_connect_creates_accounts_schema(tmp_path):
    conn = _connect(tmp_path)

    columns = {row[1] for row in conn.execute("PRAGMA table_info(accounts)")}

    assert columns == {"id", "name", "created_at"}


def test_v1_database_upgrades_to_v2(tmp_path):
    db_file = tmp_path / "heimdall.db"
    raw = sqlite3.connect(db_file)
    raw.executescript(db.MIGRATIONS[0])
    raw.execute("PRAGMA user_version = 1")
    raw.commit()
    raw.close()

    conn = db.connect(db_file)

    tables = {
        row[0]
        for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    }
    assert "accounts" in tables
    assert conn.execute("PRAGMA user_version").fetchone()[0] == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest tests/test_db.py -v`
Expected: the 2 new tests FAIL (`assert set() == {"id", ...}` and missing `accounts` table). The existing tests PASS (including `test_reconnect_does_not_rerun_migrations`, which compares against `len(db.MIGRATIONS)` and is therefore migration-count-agnostic).

- [ ] **Step 3: Write minimal implementation**

In `backend/db.py`, append a second entry to `MIGRATIONS`:

```python
MIGRATIONS: list[str] = [
    """
    CREATE TABLE usage_events (
        id                     INTEGER PRIMARY KEY,
        uuid                   TEXT    NOT NULL UNIQUE,
        timestamp              TEXT    NOT NULL,  -- ISO-8601 UTC
        model                  TEXT    NOT NULL,
        input_tokens           INTEGER NOT NULL DEFAULT 0,
        output_tokens          INTEGER NOT NULL DEFAULT 0,
        cache_creation_tokens  INTEGER NOT NULL DEFAULT 0,
        cache_read_tokens      INTEGER NOT NULL DEFAULT 0,
        session_id             TEXT,
        project                TEXT               -- derived from cwd
    );
    CREATE INDEX idx_usage_events_timestamp ON usage_events (timestamp);
    CREATE INDEX idx_usage_events_project   ON usage_events (project);
    """,
    """
    CREATE TABLE accounts (
        id         INTEGER PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    );
    """,
]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest -q`
Expected: 11 passed.

- [ ] **Step 5: Commit (after user go)**

```bash
git add backend/db.py tests/test_db.py
git commit -m "feat: add accounts table migration"
```

---

### Task 2: Keychain storage — create/get roundtrip

**Files:**
- Modify: `pyproject.toml` (add `keyring>=25` to `dependencies`)
- Create: `tests/conftest.py`
- Create: `tests/test_accounts.py`
- Create: `backend/accounts.py`

- [ ] **Step 1: Add the dependency**

In `pyproject.toml`, extend `dependencies`:

```toml
dependencies = [
    "fastapi>=0.110",
    "uvicorn>=0.29",
    "keyring>=25",
]
```

Run: `.venv/bin/pip install "keyring>=25"`
Expected: `Successfully installed keyring-...` (plus its own deps).

- [ ] **Step 2: Write the in-memory keyring fixture**

Create `tests/conftest.py`:

```python
import keyring
import keyring.backend
import keyring.errors
import pytest


class InMemoryKeyring(keyring.backend.KeyringBackend):
    """Test double so tests never touch the real OS keychain."""

    priority = 1

    def __init__(self):
        super().__init__()
        self._store = {}

    def set_password(self, service, username, password):
        self._store[(service, username)] = password

    def get_password(self, service, username):
        return self._store.get((service, username))

    def delete_password(self, service, username):
        try:
            del self._store[(service, username)]
        except KeyError:
            raise keyring.errors.PasswordDeleteError(username)


@pytest.fixture(autouse=True)
def fake_keyring():
    previous = keyring.get_keyring()
    backend = InMemoryKeyring()
    keyring.set_keyring(backend)
    yield backend
    keyring.set_keyring(previous)
```

- [ ] **Step 3: Write the failing test**

Create `tests/test_accounts.py`:

```python
from backend import accounts, db


def _conn(tmp_path):
    return db.connect(tmp_path / "heimdall.db")


def test_create_and_get_api_key_roundtrip(tmp_path):
    conn = _conn(tmp_path)

    account_id = accounts.create_account(conn, "client-a", "sk-ant-admin-test")

    assert isinstance(account_id, int)
    assert accounts.get_api_key("client-a") == "sk-ant-admin-test"
    row = conn.execute("SELECT name FROM accounts").fetchone()
    assert row == ("client-a",)
```

- [ ] **Step 4: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_accounts.py -v`
Expected: FAIL at collection with `ImportError: cannot import name 'accounts' from 'backend'`.

- [ ] **Step 5: Write minimal implementation**

Create `backend/accounts.py`:

```python
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest -q`
Expected: 12 passed.

- [ ] **Step 7: Commit (after user go)**

```bash
git add pyproject.toml tests/conftest.py tests/test_accounts.py backend/accounts.py
git commit -m "feat: store account keys in the OS keychain"
```

---

### Task 3: Input validation and duplicate rejection

**Files:**
- Modify: `backend/accounts.py`
- Test: `tests/test_accounts.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_accounts.py` (add `import pytest` at the top of the file):

```python
def test_empty_or_whitespace_name_raises(tmp_path):
    conn = _conn(tmp_path)

    with pytest.raises(ValueError):
        accounts.create_account(conn, "   ", "sk-ant-admin-test")

    count = conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    assert count == 0
    assert accounts.get_api_key("   ") is None


def test_empty_or_whitespace_key_raises(tmp_path):
    conn = _conn(tmp_path)

    with pytest.raises(ValueError):
        accounts.create_account(conn, "client-a", "")

    count = conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    assert count == 0


def test_duplicate_name_raises(tmp_path):
    conn = _conn(tmp_path)
    accounts.create_account(conn, "client-a", "key-1")

    with pytest.raises(accounts.DuplicateAccountError):
        accounts.create_account(conn, "client-a", "key-2")

    count = conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    assert count == 1
    assert accounts.get_api_key("client-a") == "key-1"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest tests/test_accounts.py -v`
Expected: 3 new tests FAIL (no `ValueError` raised; `AttributeError` for `DuplicateAccountError`). Roundtrip test still PASSES.

- [ ] **Step 3: Write minimal implementation**

In `backend/accounts.py`, add `import sqlite3` at the top, then the exception and validation:

```python
class DuplicateAccountError(ValueError):
    """An account with this name already exists."""
```

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest -q`
Expected: 15 passed.

- [ ] **Step 5: Commit (after user go)**

```bash
git add backend/accounts.py tests/test_accounts.py
git commit -m "feat: validate account input and reject duplicates"
```

---

### Task 4: Roll back the DB row when the keychain write fails

**Files:**
- Modify: `backend/accounts.py`
- Test: `tests/test_accounts.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_accounts.py`:

```python
def test_keyring_failure_rolls_back_db_row(tmp_path, monkeypatch):
    conn = _conn(tmp_path)

    def boom(service, username, password):
        raise RuntimeError("keychain unavailable")

    monkeypatch.setattr(accounts.keyring, "set_password", boom)

    with pytest.raises(RuntimeError, match="keychain unavailable"):
        accounts.create_account(conn, "client-a", "sk-ant-admin-test")

    count = conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    assert count == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_accounts.py::test_keyring_failure_rolls_back_db_row -v`
Expected: FAIL — the `RuntimeError` propagates, but `count == 1` (the INSERT was not rolled back).

- [ ] **Step 3: Write minimal implementation**

In `backend/accounts.py`, wrap the keychain write:

```python
    try:
        keyring.set_password(SERVICE_NAME, name, api_key)
    except Exception:
        conn.rollback()
        raise
    conn.commit()
    return cursor.lastrowid
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest -q`
Expected: 16 passed.

- [ ] **Step 5: Commit (after user go)**

```bash
git add backend/accounts.py tests/test_accounts.py
git commit -m "feat: roll back account creation when keychain write fails"
```

---

### Task 5: Deletion and listing

**Files:**
- Modify: `backend/accounts.py`
- Test: `tests/test_accounts.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_accounts.py`:

```python
def test_delete_removes_row_and_keychain_entry(tmp_path):
    conn = _conn(tmp_path)
    accounts.create_account(conn, "client-a", "key-1")

    accounts.delete_account(conn, "client-a")

    count = conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    assert count == 0
    assert accounts.get_api_key("client-a") is None


def test_delete_tolerates_missing_keychain_entry(tmp_path, fake_keyring):
    conn = _conn(tmp_path)
    accounts.create_account(conn, "client-a", "key-1")
    fake_keyring._store.clear()  # simulate manually cleaned keychain

    accounts.delete_account(conn, "client-a")

    count = conn.execute("SELECT COUNT(*) FROM accounts").fetchone()[0]
    assert count == 0


def test_delete_unknown_name_raises(tmp_path):
    conn = _conn(tmp_path)

    with pytest.raises(accounts.AccountNotFoundError):
        accounts.delete_account(conn, "nope")


def test_list_accounts_returns_metadata_without_keys(tmp_path):
    conn = _conn(tmp_path)
    accounts.create_account(conn, "client-b", "key-b")
    accounts.create_account(conn, "client-a", "key-a")

    result = accounts.list_accounts(conn)

    assert [entry["name"] for entry in result] == ["client-a", "client-b"]
    for entry in result:
        assert set(entry) == {"id", "name", "created_at"}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest tests/test_accounts.py -v`
Expected: 4 new tests FAIL with `AttributeError` (`delete_account`, `AccountNotFoundError`, `list_accounts` missing). Existing tests PASS.

- [ ] **Step 3: Write minimal implementation**

In `backend/accounts.py`, add `import keyring.errors` below `import keyring`, then:

```python
class AccountNotFoundError(KeyError):
    """No account with this name exists."""
```

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest -q`
Expected: 20 passed.

- [ ] **Step 5: Commit (after user go)**

```bash
git add backend/accounts.py tests/test_accounts.py
git commit -m "feat: add account deletion and listing"
```
