"""Heimdall usage aggregation — groups usage_events into cost-annotated buckets."""

import sqlite3

from backend import pricing

_GROUP_BY_EXPRESSIONS = {
    "day": "substr(timestamp, 1, 10)",
    "model": "model",
    "project": "COALESCE(project, 'unknown')",
}

_FIELDS = (
    "input_tokens",
    "output_tokens",
    "cache_creation_tokens",
    "cache_read_tokens",
)


def _empty_bucket(key: str | None) -> dict:
    bucket = {field: 0 for field in _FIELDS}
    bucket["events"] = 0
    bucket["cost_usd"] = 0.0
    bucket["cost_incomplete"] = False
    if key is not None:
        bucket["key"] = key
    return bucket


def summarize(conn: sqlite3.Connection, since: str, until: str, group_by: str) -> dict:
    """Aggregate usage_events in [since, until) into buckets with computed cost.

    `since` is inclusive, `until` is exclusive. Each bucket is split by model
    internally to price correctly; if any contributing model is unpriced,
    the bucket's cost_usd is None and cost_incomplete is True rather than
    silently reporting a partial number.
    """
    if group_by not in _GROUP_BY_EXPRESSIONS:
        raise ValueError(f"invalid group_by: {group_by!r}")
    bucket_expr = _GROUP_BY_EXPRESSIONS[group_by]

    rows = conn.execute(
        f"""
        SELECT {bucket_expr} AS bucket_key, model,
               SUM(input_tokens), SUM(output_tokens),
               SUM(cache_creation_tokens), SUM(cache_read_tokens),
               COUNT(*)
        FROM usage_events
        WHERE timestamp >= ? AND timestamp < ?
        GROUP BY bucket_key, model
        """,
        (since, until),
    ).fetchall()

    buckets: dict[str, dict] = {}
    for bucket_key, model, input_t, output_t, cache_c, cache_r, events in rows:
        bucket = buckets.setdefault(bucket_key, _empty_bucket(bucket_key))
        bucket["input_tokens"] += input_t
        bucket["output_tokens"] += output_t
        bucket["cache_creation_tokens"] += cache_c
        bucket["cache_read_tokens"] += cache_r
        bucket["events"] += events

        row_cost = pricing.cost_usd(model, input_t, output_t, cache_c, cache_r)
        if row_cost is None:
            bucket["cost_incomplete"] = True
        elif not bucket["cost_incomplete"]:
            bucket["cost_usd"] += row_cost

    bucket_list = sorted(buckets.values(), key=lambda b: b["key"])
    for bucket in bucket_list:
        if bucket["cost_incomplete"]:
            bucket["cost_usd"] = None

    total = _empty_bucket(None)
    for bucket in bucket_list:
        for field in _FIELDS:
            total[field] += bucket[field]
        total["events"] += bucket["events"]
        if bucket["cost_incomplete"]:
            total["cost_incomplete"] = True
        elif not total["cost_incomplete"]:
            total["cost_usd"] += bucket["cost_usd"]
    if total["cost_incomplete"]:
        total["cost_usd"] = None

    return {"buckets": bucket_list, "total": total}
