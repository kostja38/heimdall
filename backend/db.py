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
