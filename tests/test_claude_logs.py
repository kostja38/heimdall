from backend import claude_logs


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
