from backend.pricing import cost_usd


def test_cost_usd_computes_known_model():
    # claude-haiku-4-5: $1/$5/$1.25/$0.10 per MTok
    cost = cost_usd(
        "claude-haiku-4-5-20251001",
        input_tokens=1_000_000,
        output_tokens=1_000_000,
        cache_creation_tokens=1_000_000,
        cache_read_tokens=1_000_000,
    )

    assert cost == 1.0 + 5.0 + 1.25 + 0.10


def test_cost_usd_longest_prefix_match_wins():
    # claude-sonnet-4-6 ($3/$15) must not be shadowed by a shorter
    # "claude-sonnet-4" style prefix if one is ever added.
    cost = cost_usd(
        "claude-sonnet-4-6-20261001",
        input_tokens=1_000_000,
        output_tokens=0,
        cache_creation_tokens=0,
        cache_read_tokens=0,
    )

    assert cost == 3.0


def test_cost_usd_unknown_model_returns_none():
    cost = cost_usd(
        "claude-made-up-model",
        input_tokens=1_000,
        output_tokens=1_000,
        cache_creation_tokens=0,
        cache_read_tokens=0,
    )

    assert cost is None


def test_cost_usd_zero_tokens_is_zero():
    cost = cost_usd(
        "claude-opus-4-8",
        input_tokens=0,
        output_tokens=0,
        cache_creation_tokens=0,
        cache_read_tokens=0,
    )

    assert cost == 0.0
