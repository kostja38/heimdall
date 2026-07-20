"""Heimdall backend — FastAPI application entry point."""

import sqlite3
from collections.abc import Iterator
from datetime import UTC, datetime, timedelta

from fastapi import Depends, FastAPI, HTTPException

from backend import claude_logs, db, usage

app = FastAPI(
    title="Heimdall",
    description="Local usage & cost tracking for Claude accounts.",
    version="0.1.0",
)


def get_conn() -> Iterator[sqlite3.Connection]:
    """Request-scoped DB connection, closed after the request."""
    conn = db.connect()
    try:
        yield conn
    finally:
        conn.close()


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe. Returns a static OK payload."""
    return {"status": "ok"}


@app.get("/api/usage/summary")
def get_usage_summary(
    since: str | None = None,
    until: str | None = None,
    group_by: str = "day",
    conn: sqlite3.Connection = Depends(get_conn),
) -> dict:
    """Aggregate usage_events into cost-annotated buckets. Defaults to the
    last 30 days, grouped by day."""
    if until is None:
        # +1s buffer so an event landing in the same second as "now" isn't
        # excluded by the exclusive upper bound.
        until = (datetime.now(UTC) + timedelta(seconds=1)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
    if since is None:
        since = (
            datetime.strptime(until, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=UTC)
            - timedelta(days=30)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        return usage.summarize(conn, since=since, until=until, group_by=group_by)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/import/logs")
def post_import_logs(conn: sqlite3.Connection = Depends(get_conn)) -> dict[str, int]:
    """Import usage events from local Claude Code logs. Re-imports are safe."""
    stats = claude_logs.import_usage(conn)
    return {"inserted": stats.inserted, "skipped": stats.skipped}
