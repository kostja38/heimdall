import json

from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def _write_log(log_root, project_slug, session_file, uuid="u-1"):
    project_dir = log_root / project_slug
    project_dir.mkdir(parents=True, exist_ok=True)
    entry = {
        "uuid": uuid,
        "timestamp": "2026-07-19T10:00:00Z",
        "sessionId": "s-1",
        "cwd": "/repo",
        "type": "assistant",
        "message": {
            "model": "claude-opus-4-8",
            "usage": {
                "input_tokens": 100,
                "cache_creation_input_tokens": 0,
                "cache_read_input_tokens": 0,
                "output_tokens": 50,
            },
        },
    }
    (project_dir / session_file).write_text(json.dumps(entry) + "\n")


def test_import_logs_returns_inserted_and_skipped_counts(tmp_path, monkeypatch):
    log_root = tmp_path / "claude-logs"
    _write_log(log_root, "proj", "session.jsonl")
    monkeypatch.setenv("HEIMDALL_CLAUDE_LOGS", str(log_root))
    monkeypatch.setenv("HEIMDALL_DB", str(tmp_path / "heimdall.db"))

    first = client.post("/api/import/logs")
    assert first.status_code == 200
    assert first.json() == {"inserted": 1, "skipped": 0}

    second = client.post("/api/import/logs")
    assert second.json() == {"inserted": 0, "skipped": 1}
