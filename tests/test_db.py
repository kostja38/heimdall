import sqlite3

import pytest

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


def test_reconnect_does_not_rerun_migrations(tmp_path):
    db_file = tmp_path / "heimdall.db"

    db.connect(db_file).close()
    conn = db.connect(db_file)  # naive impl raises "table already exists"

    version = conn.execute("PRAGMA user_version").fetchone()[0]
    assert version == len(db.MIGRATIONS)


def test_newer_schema_version_raises(tmp_path):
    db_file = tmp_path / "heimdall.db"
    raw = sqlite3.connect(db_file)
    raw.execute("PRAGMA user_version = 999")
    raw.commit()
    raw.close()

    with pytest.raises(db.SchemaVersionError, match="999"):
        db.connect(db_file)
