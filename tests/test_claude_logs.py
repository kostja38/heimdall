import json

from backend import claude_logs, db


def _assistant_entry(**overrides):
    entry = {
        "uuid": "u-1",
        "timestamp": "2026-07-19T10:00:00Z",
        "sessionId": "s-1",
        "cwd": "/Users/konstantinmodel/heimdall",
        "isSidechain": False,
        "type": "assistant",
        "message": {
            "model": "claude-opus-4-8",
            "usage": {
                "input_tokens": 100,
                "cache_creation_input_tokens": 200,
                "cache_read_input_tokens": 300,
                "output_tokens": 50,
            },
        },
    }
    entry.update(overrides)
    return entry


def test_parse_entry_maps_assistant_usage():
    event = claude_logs.parse_entry(_assistant_entry())

    assert event == {
        "uuid": "u-1",
        "timestamp": "2026-07-19T10:00:00Z",
        "model": "claude-opus-4-8",
        "input_tokens": 100,
        "output_tokens": 50,
        "cache_creation_tokens": 200,
        "cache_read_tokens": 300,
        "session_id": "s-1",
        "project": "/Users/konstantinmodel/heimdall",
    }


def test_parse_entry_returns_none_without_usage():
    assert claude_logs.parse_entry({"type": "user", "uuid": "u-2"}) is None
    assert claude_logs.parse_entry({"message": {}, "uuid": "u-3"}) is None


def test_parse_entry_rejects_synthetic_and_incomplete_entries():
    synthetic = _assistant_entry()
    synthetic["message"]["model"] = "<synthetic>"
    assert claude_logs.parse_entry(synthetic) is None

    no_uuid = _assistant_entry(uuid=None)
    assert claude_logs.parse_entry(no_uuid) is None

    no_timestamp = _assistant_entry(timestamp=None)
    assert claude_logs.parse_entry(no_timestamp) is None


def test_parse_entry_defaults_missing_token_counts_to_zero():
    entry = _assistant_entry()
    entry["message"]["usage"] = {"output_tokens": 5}

    event = claude_logs.parse_entry(entry)

    assert event["input_tokens"] == 0
    assert event["cache_creation_tokens"] == 0
    assert event["cache_read_tokens"] == 0
    assert event["output_tokens"] == 5


def _write_jsonl(path, entries):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        for entry in entries:
            if isinstance(entry, str):
                fh.write(entry + "\n")  # raw line, e.g. malformed JSON
            else:
                fh.write(json.dumps(entry) + "\n")


def test_iter_usage_events_walks_files_recursively(tmp_path):
    _write_jsonl(
        tmp_path / "proj-a" / "session1.jsonl",
        [_assistant_entry(uuid="u-1"), {"type": "user", "uuid": "skip"}],
    )
    _write_jsonl(
        tmp_path / "proj-b" / "session2.jsonl",
        [_assistant_entry(uuid="u-2")],
    )

    events = list(claude_logs.iter_usage_events(tmp_path))

    assert sorted(e["uuid"] for e in events) == ["u-1", "u-2"]


def test_iter_usage_events_skips_malformed_and_blank_lines(tmp_path):
    _write_jsonl(
        tmp_path / "p" / "s.jsonl",
        ["{not json", "", _assistant_entry(uuid="u-3")],
    )

    events = list(claude_logs.iter_usage_events(tmp_path))

    assert [e["uuid"] for e in events] == ["u-3"]


def test_iter_usage_events_with_missing_root_yields_nothing(tmp_path):
    events = list(claude_logs.iter_usage_events(tmp_path / "does-not-exist"))

    assert events == []


def test_resolve_log_root_precedence(tmp_path, monkeypatch):
    monkeypatch.setenv("HEIMDALL_CLAUDE_LOGS", str(tmp_path / "env"))
    assert claude_logs.resolve_log_root(tmp_path / "arg") == tmp_path / "arg"
    assert claude_logs.resolve_log_root(None) == tmp_path / "env"

    monkeypatch.delenv("HEIMDALL_CLAUDE_LOGS")
    assert claude_logs.resolve_log_root(None) == claude_logs.DEFAULT_LOG_ROOT


def test_import_usage_inserts_events_and_reports_stats(tmp_path):
    conn = db.connect(tmp_path / "heimdall.db")
    _write_jsonl(
        tmp_path / "logs" / "p" / "s.jsonl",
        [_assistant_entry(uuid="u-1"), _assistant_entry(uuid="u-2")],
    )

    stats = claude_logs.import_usage(conn, tmp_path / "logs")

    assert stats.inserted == 2
    assert stats.skipped == 0
    rows = conn.execute(
        "SELECT uuid, model, input_tokens FROM usage_events ORDER BY uuid"
    ).fetchall()
    assert rows == [
        ("u-1", "claude-opus-4-8", 100),
        ("u-2", "claude-opus-4-8", 100),
    ]


def test_import_usage_is_idempotent_on_reimport(tmp_path):
    conn = db.connect(tmp_path / "heimdall.db")
    _write_jsonl(tmp_path / "logs" / "p" / "s.jsonl", [_assistant_entry(uuid="u-1")])

    first = claude_logs.import_usage(conn, tmp_path / "logs")
    second = claude_logs.import_usage(conn, tmp_path / "logs")

    assert (first.inserted, first.skipped) == (1, 0)
    assert (second.inserted, second.skipped) == (0, 1)
    count = conn.execute("SELECT COUNT(*) FROM usage_events").fetchone()[0]
    assert count == 1


def test_import_usage_with_empty_root_returns_zero_stats(tmp_path):
    conn = db.connect(tmp_path / "heimdall.db")

    stats = claude_logs.import_usage(conn, tmp_path / "nothing-here")

    assert (stats.inserted, stats.skipped) == (0, 0)
