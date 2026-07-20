import { expect, it } from "vitest";
import type { UsageBucket } from "./api";
import { buildDailySeries } from "./timeSeries";

function bucket(
	key: string,
	cost: number | null,
	incomplete = false,
): UsageBucket {
	return {
		key,
		input_tokens: 10,
		output_tokens: 10,
		cache_creation_tokens: 0,
		cache_read_tokens: 0,
		events: 1,
		cost_usd: cost,
		cost_incomplete: incomplete,
	};
}

it("fills missing days with zero cost across the range", () => {
	const series = buildDailySeries(
		[bucket("2026-07-18", 5), bucket("2026-07-20", 3)],
		"2026-07-18T00:00:00Z",
		"2026-07-20T12:00:00Z",
	);
	expect(series).toEqual([
		{ date: "2026-07-18", cost: 5, costIncomplete: false },
		{ date: "2026-07-19", cost: 0, costIncomplete: false },
		{ date: "2026-07-20", cost: 3, costIncomplete: false },
	]);
});

it("keeps a null cost (and the incomplete flag) for unpriced-model days", () => {
	const series = buildDailySeries(
		[bucket("2026-07-18", null, true)],
		"2026-07-18T00:00:00Z",
		"2026-07-18T23:59:59Z",
	);
	expect(series).toEqual([
		{ date: "2026-07-18", cost: null, costIncomplete: true },
	]);
});

it("falls back to sparse buckets for very long ranges instead of filling every day", () => {
	const series = buildDailySeries(
		[bucket("2026-07-18", 5), bucket("2020-01-01", 1)],
		"2000-01-01T00:00:00Z",
		"2026-07-20T00:00:00Z",
	);
	expect(series).toEqual([
		{ date: "2020-01-01", cost: 1, costIncomplete: false },
		{ date: "2026-07-18", cost: 5, costIncomplete: false },
	]);
});
