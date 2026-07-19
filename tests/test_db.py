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
