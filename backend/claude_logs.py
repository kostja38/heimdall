"""Heimdall log parser — Claude Code JSONL logs into usage events."""


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
