export type Period = "7d" | "30d" | "90d" | "all";

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
	{ value: "7d", label: "7d" },
	{ value: "30d", label: "30d" },
	{ value: "90d", label: "90d" },
	{ value: "all", label: "All" },
];

const PERIOD_DAYS: Record<Exclude<Period, "all">, number> = {
	"7d": 7,
	"30d": 30,
	"90d": 90,
};

// Predates any real usage data; used as `since` for the "all" period so the
// backend's inclusive-since/exclusive-until window covers everything without
// a dedicated "no lower bound" query param.
const ALL_TIME_SINCE = "2000-01-01T00:00:00Z";

export interface DateRange {
	since: string;
	until: string;
}

// No milliseconds, matching the format backend/main.py's own since/until
// defaults use — keeps string comparisons against those consistent.
function toApiTimestamp(date: Date): string {
	return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function addDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addSeconds(date: Date, seconds: number): Date {
	return new Date(date.getTime() + seconds * 1000);
}

/** Rolling window ending just after `now`, so an event landing in the same
 * second as `now` isn't excluded by the exclusive upper bound. */
export function currentRange(period: Period, now = new Date()): DateRange {
	const until = toApiTimestamp(addSeconds(now, 1));
	if (period === "all") {
		return { since: ALL_TIME_SINCE, until };
	}
	return { since: toApiTimestamp(addDays(now, -PERIOD_DAYS[period])), until };
}

/** The period of equal length immediately preceding `currentRange`, for
 * delta comparisons. `null` for "all" — there's no meaningful prior period. */
export function previousRange(
	period: Period,
	now = new Date(),
): DateRange | null {
	if (period === "all") return null;
	const days = PERIOD_DAYS[period];
	const currentSince = addDays(now, -days);
	return {
		since: toApiTimestamp(addDays(currentSince, -days)),
		until: toApiTimestamp(currentSince),
	};
}
