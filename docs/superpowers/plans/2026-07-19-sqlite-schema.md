# SQLite Schema & Migrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `backend/db.py` — SQLite connection handling, path resolution, and a `PRAGMA user_version`-based migration mechanism creating the `usage_events` table.

**Architecture:** Single module `backend/db.py` using the `sqlite3` stdlib (no new dependencies). Migrations are ordered SQL scripts in a `MIGRATIONS` list; `PRAGMA user_version` tracks which have run. `connect()` resolves the DB path (argument → `HEIMDALL_DB` env var → `~/.heimdall/heimdall.db`), creates the parent directory, and applies pending migrations.

**Tech Stack:** Python 3.11+ `sqlite3`/`pathlib`/`os` stdlib; pytest with `tmp_path`/`monkeypatch` fixtures.

**Spec:** `docs/superpowers/specs/2026-07-19-sqlite-schema-design.md`

**Project workflow note:** Commits require the user's explicit go ("Go"-Freigabe). At each commit step, propose the commit and wait for approval unless the user has delegated committing for this session.

---

### Task 1: Schema creation on connect

**Files:**
- Create: `backend/db.py`
- Test: `tests/test_db.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_db.py`:

```python
import sqlite3

from backend import db


def _connect(tmp_path):
    return db.connect(tmp_path / "heimdall.db")


def test_connect_creates_usage_events_schema(tmp_path):
    conn = _connect(tmp_path)

    columns = {row[1] for row in conn.execute("PRAGMA table_info(usage_events)")}

    assert columns == {
        "id",
        "uuid",
        "timestamp",
        "model",
        "input_tokens",
        "output_tokens",
        "cache_creation_tokens",
        "cache_read_tokens",
        "session_id",
        "project",
    }


def test_duplicate_uuid_is_ignored(tmp_path):
    conn = _connect(tmp_path)
    insert = (
        "INSERT OR IGNORE INTO usage_events "
        "(uuid, timestamp, model, input_tokens, output_tokens) "
        "VALUES (?, ?, ?, ?, ?)"
    )
    row = ("u1", "2026-07-19T10:00:00Z", "claude-opus-4-8", 100, 50)

    conn.execute(insert, row)
    conn.execute(insert, row)

    count = conn.execute("SELECT COUNT(*) FROM usage_events").fetchone()[0]
    assert count == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest tests/test_db.py -v`
Expected: FAIL at collection with `ImportError`/`AttributeError` — `backend.db` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `backend/db.py`:

```python
"""Heimdall storage — SQLite connection and schema migrations."""

import sqlite3
from pathlib import Path

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
]


def connect(path) -> sqlite3.Connection:
    """Open the Heimdall database, creating schema as needed."""
    db_path = Path(path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    for script in MIGRATIONS:
        conn.executescript(script)
    conn.commit()
    return conn
```

(Deliberately naive: re-running migrations on an existing DB will fail — Task 3 drives the `user_version` tracking that fixes this.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest tests/test_db.py -v`
Expected: 2 passed. Also run the full suite: `.venv/bin/python -m pytest -q` → 3 passed.

- [ ] **Step 5: Commit (after user go)**

```bash
git add backend/db.py tests/test_db.py
git commit -m "feat: create usage_events schema on connect"
```

---

### Task 2: DB path resolution (argument → env var → default)

**Files:**
- Modify: `backend/db.py`
- Test: `tests/test_db.py`

- [ ] **Step 1: Write the failing tests**

Append to `tests/test_db.py`:

```python
def test_resolve_db_path_prefers_explicit_argument(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "env.db"))

    assert db.resolve_db_path(tmp_path / "arg.db") == tmp_path / "arg.db"


def test_resolve_db_path_falls_back_to_env_var(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "env.db"))

    assert db.resolve_db_path(None) == tmp_path / "env.db"


def test_resolve_db_path_defaults_to_home_dotfolder(monkeypatch):
    monkeypatch.delenv("HEIMDALL_DB", raising=False)

    assert db.resolve_db_path(None) == db.DEFAULT_DB_PATH


def test_connect_uses_env_var_when_no_argument(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "env.db"))

    db.connect()

    assert (tmp_path / "env.db").exists()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `.venv/bin/python -m pytest tests/test_db.py -v`
Expected: the 4 new tests FAIL (`AttributeError: module 'backend.db' has no attribute 'resolve_db_path'`; `connect()` missing default argument). The 2 Task-1 tests still PASS.

- [ ] **Step 3: Write minimal implementation**

In `backend/db.py`, add imports and the resolver, and change `connect`'s signature:

```python
import os
import sqlite3
from pathlib import Path

DEFAULT_DB_PATH = Path.home() / ".heimdall" / "heimdall.db"
```

```python
def resolve_db_path(path=None) -> Path:
    """Resolve the DB location: explicit argument > HEIMDALL_DB env var > default."""
    if path is not None:
        return Path(path)
    env_path = os.environ.get("HEIMDALL_DB")
    if env_path:
        return Path(env_path)
    return DEFAULT_DB_PATH


def connect(path=None) -> sqlite3.Connection:
    """Open the Heimdall database, creating schema as needed."""
    db_path = resolve_db_path(path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    for script in MIGRATIONS:
        conn.executescript(script)
    conn.commit()
    return conn
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest -q`
Expected: 7 passed (6 db + 1 health).

- [ ] **Step 5: Commit (after user go)**

```bash
git add backend/db.py tests/test_db.py
git commit -m "feat: resolve database path from argument, env var, or default"
```

---

### Task 3: Idempotent migrations via PRAGMA user_version

**Files:**
- Modify: `backend/db.py`
- Test: `tests/test_db.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_db.py`:

```python
def test_reconnect_does_not_rerun_migrations(tmp_path):
    db_file = tmp_path / "heimdall.db"

    db.connect(db_file).close()
    conn = db.connect(db_file)  # naive impl raises "table already exists"

    version = conn.execute("PRAGMA user_version").fetchone()[0]
    assert version == len(db.MIGRATIONS)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_db.py::test_reconnect_does_not_rerun_migrations -v`
Expected: FAIL with `sqlite3.OperationalError: table usage_events already exists`.

- [ ] **Step 3: Write minimal implementation**

In `backend/db.py`, replace the migration loop in `connect` with a `_migrate` helper:

```python
def connect(path=None) -> sqlite3.Connection:
    """Open the Heimdall database, creating or upgrading schema as needed."""
    db_path = resolve_db_path(path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    _migrate(conn)
    return conn


def _migrate(conn: sqlite3.Connection) -> None:
    """Apply pending migrations, tracked via PRAGMA user_version."""
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    for index in range(version, len(MIGRATIONS)):
        conn.executescript(MIGRATIONS[index])
        conn.execute(f"PRAGMA user_version = {index + 1}")
    conn.commit()
```

(`PRAGMA user_version` cannot be parameterized; `index` is a trusted int.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest -q`
Expected: 8 passed.

- [ ] **Step 5: Commit (after user go)**

```bash
git add backend/db.py tests/test_db.py
git commit -m "feat: track schema version for idempotent migrations"
```

---

### Task 4: Reject databases from newer Heimdall versions

**Files:**
- Modify: `backend/db.py`
- Test: `tests/test_db.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/test_db.py` (add `import pytest` at the top of the file):

```python
def test_newer_schema_version_raises(tmp_path):
    db_file = tmp_path / "heimdall.db"
    raw = sqlite3.connect(db_file)
    raw.execute("PRAGMA user_version = 999")
    raw.commit()
    raw.close()

    with pytest.raises(db.SchemaVersionError, match="999"):
        db.connect(db_file)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/python -m pytest tests/test_db.py::test_newer_schema_version_raises -v`
Expected: FAIL with `AttributeError: module 'backend.db' has no attribute 'SchemaVersionError'`.

- [ ] **Step 3: Write minimal implementation**

In `backend/db.py`, add the exception class and the guard at the top of `_migrate`:

```python
class SchemaVersionError(RuntimeError):
    """Database schema is newer than this Heimdall version supports."""
```

```python
def _migrate(conn: sqlite3.Connection) -> None:
    """Apply pending migrations, tracked via PRAGMA user_version."""
    version = conn.execute("PRAGMA user_version").fetchone()[0]
    if version > len(MIGRATIONS):
        raise SchemaVersionError(
            f"database schema version {version} is newer than supported "
            f"({len(MIGRATIONS)}); upgrade Heimdall"
        )
    for index in range(version, len(MIGRATIONS)):
        conn.executescript(MIGRATIONS[index])
        conn.execute(f"PRAGMA user_version = {index + 1}")
    conn.commit()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `.venv/bin/python -m pytest -q`
Expected: 9 passed, no warnings from our code.

- [ ] **Step 5: Commit (after user go)**

```bash
git add backend/db.py tests/test_db.py
git commit -m "feat: reject databases from newer schema versions"
```
