"""Model price table (USD per million tokens) and cost computation."""

# (model prefix) -> (input, output, cache_write_5m, cache_read), USD per MTok.
# Longest-prefix match so date-suffixed model ids resolve. Prices change
# rarely; update via a normal PR when Anthropic's pricing page changes.
PRICES_PER_MTOK: dict[str, tuple[float, float, float, float]] = {
    "claude-fable-5": (10.0, 50.0, 12.5, 1.0),
    "claude-opus-4-8": (5.0, 25.0, 6.25, 0.5),
    "claude-opus-4-7": (5.0, 25.0, 6.25, 0.5),
    "claude-opus-4-6": (5.0, 25.0, 6.25, 0.5),
    "claude-sonnet-5": (3.0, 15.0, 3.75, 0.3),
    "claude-sonnet-4-6": (3.0, 15.0, 3.75, 0.3),
    "claude-haiku-4-5": (1.0, 5.0, 1.25, 0.1),
}


def cost_usd(
    model: str,
    input_tokens: int,
    output_tokens: int,
    cache_creation_tokens: int,
    cache_read_tokens: int,
) -> float | None:
    """Compute USD cost for one usage event. None for unknown models —
    callers surface that honestly rather than reporting a wrong number."""
    prices = None
    for prefix in sorted(PRICES_PER_MTOK, key=len, reverse=True):
        if model.startswith(prefix):
            prices = PRICES_PER_MTOK[prefix]
            break
    if prices is None:
        return None

    input_price, output_price, cache_write_price, cache_read_price = prices
    return (
        input_tokens * input_price
        + output_tokens * output_price
        + cache_creation_tokens * cache_write_price
        + cache_read_tokens * cache_read_price
    ) / 1_000_000
