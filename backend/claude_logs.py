"""Heimdall log parser — Claude Code JSONL logs into usage events."""

import json
import os
from collections.abc import Iterator
from dataclasses import dataclass
from pathlib import Path

DEFAULT_LOG_ROOT = Path.home() / ".claude" / "projects"


def parse_entry(raw: dict) -> dict | None:
    """Map one JSONL entry to a usage-event dict, or None if not usage."""
    message = raw.get("message") or {}
    usage = message.get("usage")
    uuid = raw.get("uuid")
    timestamp = raw.get("timestamp")
    model = message.get("model")
    if not usage or not uuid or not timestamp or not model:
        return None
    if model == "<synthetic>":
        return None
    return {
        "uuid": uuid,
        "timestamp": timestamp,
        "model": model,
        "input_tokens": usage.get("input_tokens") or 0,
        "output_tokens": usage.get("output_tokens") or 0,
        "cache_creation_tokens": usage.get("cache_creation_input_tokens") or 0,
        "cache_read_tokens": usage.get("cache_read_input_tokens") or 0,
        "session_id": raw.get("sessionId"),
        "project": raw.get("cwd"),
    }


def resolve_log_root(root=None) -> Path:
    """Resolve the log root: explicit argument > env var > default."""
    if root is not None:
        return Path(root)
    env_root = os.environ.get("HEIMDALL_CLAUDE_LOGS")
    if env_root:
        return Path(env_root)
    return DEFAULT_LOG_ROOT


def iter_usage_events(root=None) -> Iterator[dict]:
    """Yield usage events from every JSONL file under the log root."""
    log_root = resolve_log_root(root)
    if not log_root.exists():
        return
    for path in sorted(log_root.rglob("*.jsonl")):
        with path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    raw = json.loads(line)
                except json.JSONDecodeError:
                    continue
                event = parse_entry(raw)
                if event is not None:
                    yield event


@dataclass
class ImportStats:
    inserted: int = 0
    skipped: int = 0  # already-imported duplicates


_INSERT_SQL = """
INSERT OR IGNORE INTO usage_events
    (uuid, timestamp, model, input_tokens, output_tokens,
     cache_creation_tokens, cache_read_tokens, session_id, project)
VALUES
    (:uuid, :timestamp, :model, :input_tokens, :output_tokens,
     :cache_creation_tokens, :cache_read_tokens, :session_id, :project)
"""


def import_usage(conn, root=None) -> ImportStats:
    """Import all usage events under the log root. Re-imports are no-ops."""
    stats = ImportStats()
    for event in iter_usage_events(root):
        cursor = conn.execute(_INSERT_SQL, event)
        if cursor.rowcount:
            stats.inserted += 1
        else:
            stats.skipped += 1
    conn.commit()
    return stats
