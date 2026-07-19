"""Heimdall storage — SQLite connection and schema migrations."""

import os
import sqlite3
from pathlib import Path

DEFAULT_DB_PATH = Path.home() / ".heimdall" / "heimdall.db"

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


class SchemaVersionError(RuntimeError):
    """Database schema is newer than this Heimdall version supports."""


def resolve_db_path(path=None) -> Path:
    """Resolve the DB location: explicit argument > HEIMDALL_DB env var > default."""
    if path is not None:
        return Path(path)
    env_path = os.environ.get("HEIMDALL_DB")
    if env_path:
        return Path(env_path)
    return DEFAULT_DB_PATH


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
    if version > len(MIGRATIONS):
        raise SchemaVersionError(
            f"database schema version {version} is newer than supported "
            f"({len(MIGRATIONS)}); upgrade Heimdall"
        )
    for index in range(version, len(MIGRATIONS)):
        conn.executescript(MIGRATIONS[index])
        # PRAGMA cannot be parameterized; index is a trusted int.
        conn.execute(f"PRAGMA user_version = {index + 1}")
    conn.commit()
