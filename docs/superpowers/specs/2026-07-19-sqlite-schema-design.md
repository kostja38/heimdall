# SQLite Schema & Migration Mechanism — Design

**Date:** 2026-07-19
**Scope:** Commit 3 — local storage foundation for usage tracking.
**Status:** Approved

## Context

Heimdall stores Claude usage data locally in SQLite. Data comes from a hybrid
source model: parsed Claude Code JSONL logs (`~/.claude/projects/**/*.jsonl`)
as the zero-setup default, plus an optional Anthropic Admin API path later.
Each assistant log entry carries `message.model`, `message.usage`
(`input_tokens`, `output_tokens`, `cache_creation_input_tokens`,
`cache_read_input_tokens`), a unique `uuid`, `timestamp`, `sessionId`, and
`cwd`.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Granularity | One row per API call (event) | Flexible aggregation in SQL; idempotent re-imports; local data volumes stay small |
| Access layer | `sqlite3` stdlib | Zero dependencies; sync is fine for a local single-user tool |
| Migrations | SQL strings in `backend/db.py`, tracked via `PRAGMA user_version` | Simplest mechanism that supports schema evolution (accounts table lands in a later migration) |
| DB location | `~/.heimdall/heimdall.db`, overridable via argument or `HEIMDALL_DB` env var | Discoverable dotfolder convention (like `~/.claude`); env override for tests |
| Accounts table | Deferred to the keyring commit | YAGNI — columns should be shaped by the consuming code |
| Cost storage | Not stored; computed at query time (price × tokens) | Price changes never leave stale data behind |

## Module: `backend/db.py`

- `MIGRATIONS: list[str]` — ordered SQL scripts; index `i` runs when
  `user_version < i + 1`; after each script, `user_version` is bumped.
- `connect(path: str | Path | None = None) -> sqlite3.Connection` —
  resolves the DB path (argument → `HEIMDALL_DB` → default), creates the
  parent directory, opens the connection, enables `PRAGMA foreign_keys`,
  and applies pending migrations. Idempotent: reopening never re-runs
  applied migrations.
- If `user_version` is greater than `len(MIGRATIONS)`, raise an error
  (database was created by a newer Heimdall).

## Migration 1: `usage_events`

```sql
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
```

`uuid UNIQUE` is the dedup key: the importer uses `INSERT OR IGNORE`, so
re-parsing the same log files is idempotent.

Deliberately excluded (added later via migration if needed): `git_branch`,
`version`, `request_id`, a `source` column (Admin API data arrives as daily
aggregates and gets its own table), any cost column.

## Testing (TDD)

- Fresh connect creates the schema (`usage_events` exists, correct columns).
- Reconnecting an existing DB does not fail and does not duplicate schema.
- Inserting two events with the same `uuid` (via `INSERT OR IGNORE`) leaves one row.
- `HEIMDALL_DB` env var and explicit path argument override the default location.
- `user_version` newer than known migrations raises.

## Out of Scope

Log parser, API endpoints, accounts/keyring, cost computation, Admin API.
