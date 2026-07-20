import sqlite3

import pytest

from backend import db, usage

EVENT = {
    "uuid": "u-1",
    "timestamp": "2026-07-19T10:00:00Z",
    "model": "claude-haiku-4-5-20251001",
    "input_tokens": 100,
    "output_tokens": 200,
    "cache_creation_tokens": 0,
    "cache_read_tokens": 0,
    "session_id": "s-1",
    "project": "heimdall",
}

_INSERT_SQL = """
INSERT INTO usage_events
    (uuid, timestamp, model, input_tokens, output_tokens,
     cache_creation_tokens, cache_read_tokens, session_id, project)
VALUES
    (:uuid, :timestamp, :model, :input_tokens, :output_tokens,
     :cache_creation_tokens, :cache_read_tokens, :session_id, :project)
"""


def _connect(tmp_path):
    return db.connect(tmp_path / "heimdall.db")


def _seed(conn: sqlite3.Connection, **overrides) -> None:
    event = {**EVENT, **overrides}
    conn.execute(_INSERT_SQL, event)
    conn.commit()


def test_summarize_groups_by_day_and_sums_tokens(tmp_path):
    conn = _connect(tmp_path)
    _seed(conn, uuid="u-1", timestamp="2026-07-19T10:00:00Z", input_tokens=100)
    _seed(conn, uuid="u-2", timestamp="2026-07-19T12:00:00Z", input_tokens=50)
    _seed(conn, uuid="u-3", timestamp="2026-07-20T09:00:00Z", input_tokens=10)

    result = usage.summarize(
        conn, since="2026-07-01T00:00:00Z", until="2026-08-01T00:00:00Z", group_by="day"
    )

    buckets = {b["key"]: b for b in result["buckets"]}
    assert buckets["2026-07-19"]["input_tokens"] == 150
    assert buckets["2026-07-19"]["events"] == 2
    assert buckets["2026-07-20"]["input_tokens"] == 10
    assert result["total"]["input_tokens"] == 160
    assert result["total"]["events"] == 3


def test_summarize_groups_by_model(tmp_path):
    conn = _connect(tmp_path)
    _seed(conn, uuid="u-1", model="claude-haiku-4-5-20251001", input_tokens=100)
    _seed(conn, uuid="u-2", model="claude-opus-4-8", input_tokens=10)

    result = usage.summarize(
        conn,
        since="2026-07-01T00:00:00Z",
        until="2026-08-01T00:00:00Z",
        group_by="model",
    )

    buckets = {b["key"]: b for b in result["buckets"]}
    assert buckets["claude-haiku-4-5-20251001"]["input_tokens"] == 100
    assert buckets["claude-opus-4-8"]["input_tokens"] == 10


def test_summarize_groups_by_project_with_null_as_unknown(tmp_path):
    conn = _connect(tmp_path)
    _seed(conn, uuid="u-1", project=None, input_tokens=5)

    result = usage.summarize(
        conn,
        since="2026-07-01T00:00:00Z",
        until="2026-08-01T00:00:00Z",
        group_by="project",
    )

    assert result["buckets"][0]["key"] == "unknown"
    assert result["buckets"][0]["input_tokens"] == 5


def test_summarize_since_inclusive_until_exclusive(tmp_path):
    conn = _connect(tmp_path)
    _seed(conn, uuid="u-1", timestamp="2026-07-19T00:00:00Z")
    _seed(conn, uuid="u-2", timestamp="2026-07-20T00:00:00Z")

    result = usage.summarize(
        conn, since="2026-07-19T00:00:00Z", until="2026-07-20T00:00:00Z", group_by="day"
    )

    assert result["total"]["events"] == 1
    assert result["buckets"][0]["key"] == "2026-07-19"


def test_summarize_computes_cost_for_known_model(tmp_path):
    conn = _connect(tmp_path)
    # claude-haiku-4-5: $1/$5 per MTok
    _seed(
        conn,
        uuid="u-1",
        model="claude-haiku-4-5-20251001",
        input_tokens=1_000_000,
        output_tokens=1_000_000,
    )

    result = usage.summarize(
        conn, since="2026-07-01T00:00:00Z", until="2026-08-01T00:00:00Z", group_by="day"
    )

    assert result["buckets"][0]["cost_usd"] == pytest.approx(6.0)
    assert result["buckets"][0]["cost_incomplete"] is False
    assert result["total"]["cost_usd"] == pytest.approx(6.0)
    assert result["total"]["cost_incomplete"] is False


def test_summarize_unknown_model_marks_cost_incomplete(tmp_path):
    conn = _connect(tmp_path)
    _seed(conn, uuid="u-1", model="claude-made-up-model", input_tokens=100)

    result = usage.summarize(
        conn, since="2026-07-01T00:00:00Z", until="2026-08-01T00:00:00Z", group_by="day"
    )

    bucket = result["buckets"][0]
    assert bucket["cost_usd"] is None
    assert bucket["cost_incomplete"] is True
    assert bucket["input_tokens"] == 100  # tokens still shown
    assert result["total"]["cost_usd"] is None
    assert result["total"]["cost_incomplete"] is True


def test_summarize_mixed_known_and_unknown_model_in_same_bucket(tmp_path):
    conn = _connect(tmp_path)
    _seed(
        conn, uuid="u-1", timestamp="2026-07-19T10:00:00Z", model="claude-made-up-model"
    )
    _seed(
        conn,
        uuid="u-2",
        timestamp="2026-07-19T11:00:00Z",
        model="claude-haiku-4-5-20251001",
    )

    result = usage.summarize(
        conn, since="2026-07-01T00:00:00Z", until="2026-08-01T00:00:00Z", group_by="day"
    )

    bucket = result["buckets"][0]
    assert bucket["cost_incomplete"] is True
    assert bucket["cost_usd"] is None


def test_summarize_rejects_invalid_group_by(tmp_path):
    conn = _connect(tmp_path)

    with pytest.raises(ValueError):
        usage.summarize(
            conn,
            since="2026-07-01T00:00:00Z",
            until="2026-08-01T00:00:00Z",
            group_by="garbage",
        )


def test_summarize_empty_range_returns_zeroed_total(tmp_path):
    conn = _connect(tmp_path)

    result = usage.summarize(
        conn, since="2026-07-01T00:00:00Z", until="2026-08-01T00:00:00Z", group_by="day"
    )

    assert result["buckets"] == []
    assert result["total"]["events"] == 0
    assert result["total"]["cost_usd"] == 0.0
    assert result["total"]["cost_incomplete"] is False
