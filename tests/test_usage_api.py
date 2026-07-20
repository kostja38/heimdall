from datetime import UTC, datetime

from fastapi.testclient import TestClient

from backend import db
from backend.main import app

client = TestClient(app)

_INSERT_SQL = """
INSERT INTO usage_events
    (uuid, timestamp, model, input_tokens, output_tokens,
     cache_creation_tokens, cache_read_tokens, session_id, project)
VALUES
    (:uuid, :timestamp, :model, :input_tokens, :output_tokens,
     :cache_creation_tokens, :cache_read_tokens, :session_id, :project)
"""


def _seed(db_path, **overrides):
    event = {
        "uuid": "u-1",
        "timestamp": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "model": "claude-haiku-4-5-20251001",
        "input_tokens": 100,
        "output_tokens": 200,
        "cache_creation_tokens": 0,
        "cache_read_tokens": 0,
        "session_id": "s-1",
        "project": "heimdall",
        **overrides,
    }
    conn = db.connect(db_path)
    conn.execute(_INSERT_SQL, event)
    conn.commit()
    conn.close()


def test_usage_summary_defaults_to_last_30_days_grouped_by_day(tmp_path, monkeypatch):
    db_path = tmp_path / "heimdall.db"
    monkeypatch.setenv("HEIMDALL_DB", str(db_path))
    _seed(db_path)

    response = client.get("/api/usage/summary")

    assert response.status_code == 200
    body = response.json()
    assert body["total"]["events"] == 1
    assert body["total"]["input_tokens"] == 100
    assert len(body["buckets"]) == 1


def test_usage_summary_accepts_explicit_range_and_group_by(tmp_path, monkeypatch):
    db_path = tmp_path / "heimdall.db"
    monkeypatch.setenv("HEIMDALL_DB", str(db_path))
    _seed(db_path, model="claude-opus-4-8")

    response = client.get(
        "/api/usage/summary",
        params={
            "since": "2026-01-01T00:00:00Z",
            "until": "2026-01-02T00:00:00Z",
            "group_by": "model",
        },
    )

    assert response.status_code == 200
    assert response.json()["total"]["events"] == 0


def test_usage_summary_rejects_invalid_group_by(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "heimdall.db"))

    response = client.get("/api/usage/summary", params={"group_by": "garbage"})

    assert response.status_code == 422
