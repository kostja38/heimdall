const COMPACT_THRESHOLD = 10_000;

export function formatNumber(n: number): string {
	if (n < COMPACT_THRESHOLD) {
		return new Intl.NumberFormat("en-US").format(n);
	}
	return new Intl.NumberFormat("en-US", {
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(n);
}

export function formatUsd(n: number): string {
	if (n < COMPACT_THRESHOLD) {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
		}).format(n);
	}
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		notation: "compact",
		maximumFractionDigits: 1,
	}).format(n);
}

export type DeltaDirection = "up" | "down" | "flat";
export type DeltaSentiment = "good" | "bad" | "neutral";

export interface Delta {
	direction: DeltaDirection;
	sentiment: DeltaSentiment;
	text: string;
}

/**
 * Percentage change from `previous` to `current`. `upIsBad` judges the
 * direction (e.g. cost); otherwise the delta is reported without a
 * good/bad color, only magnitude and direction.
 */
export function computeDelta(
	current: number,
	previous: number | null,
	upIsBad: boolean,
): Delta | null {
	if (previous === null) return null;
	if (previous === 0) {
		if (current === 0)
			return { direction: "flat", sentiment: "neutral", text: "±0%" };
		return {
			direction: "up",
			sentiment: upIsBad ? "bad" : "neutral",
			text: "new",
		};
	}

	const change = ((current - previous) / previous) * 100;
	if (Math.abs(change) < 0.5) {
		return { direction: "flat", sentiment: "neutral", text: "±0%" };
	}

	const direction: DeltaDirection = change > 0 ? "up" : "down";
	const sentiment: DeltaSentiment = upIsBad
		? direction === "up"
			? "bad"
			: "good"
		: "neutral";
	const text = `${change > 0 ? "+" : ""}${change.toFixed(0)}%`;
	return { direction, sentiment, text };
}
