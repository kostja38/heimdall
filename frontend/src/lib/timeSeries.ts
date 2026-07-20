import type { UsageBucket } from "./api";

export interface DailyPoint {
	date: string; // YYYY-MM-DD
	// null when the day's cost can't be priced (unpriced model) — kept out
	// of the plotted line rather than shown as a misleading 0.
	cost: number | null;
	costIncomplete: boolean;
}

const DAY_MS = 86_400_000;
// Don't materialize years of empty days for the "all time" period — beyond
// this, fall back to plotting only the days that actually have data.
const MAX_FILLED_DAYS = 400;

/** Turns sparse day buckets (backend only emits days with events) into a
 * continuous daily series covering [since, until], so gaps in usage render
 * as an honest flat/empty stretch instead of a skipped x-position. */
export function buildDailySeries(
	buckets: UsageBucket[],
	since: string,
	until: string,
): DailyPoint[] {
	const byDate = new Map(buckets.map((bucket) => [bucket.key, bucket]));
	const sorted = () =>
		[...buckets]
			.sort((a, b) => a.key.localeCompare(b.key))
			.map((b) => ({
				date: b.key,
				cost: b.cost_usd,
				costIncomplete: b.cost_incomplete,
			}));

	const start = new Date(`${since.slice(0, 10)}T00:00:00Z`);
	const end = new Date(`${until.slice(0, 10)}T00:00:00Z`);
	const dayCount = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;

	if (dayCount <= 0 || dayCount > MAX_FILLED_DAYS) {
		return sorted();
	}

	const points: DailyPoint[] = [];
	for (let i = 0; i < dayCount; i++) {
		const date = new Date(start.getTime() + i * DAY_MS)
			.toISOString()
			.slice(0, 10);
		const bucket = byDate.get(date);
		points.push({
			date,
			cost: bucket ? bucket.cost_usd : 0,
			costIncomplete: bucket?.cost_incomplete ?? false,
		});
	}
	return points;
}
