import { expect, it } from "vitest";
import { computeDelta, formatNumber, formatUsd } from "./format";

it("formats small numbers with comma grouping", () => {
	expect(formatNumber(1284)).toBe("1,284");
});

it("compacts large numbers", () => {
	expect(formatNumber(12_900)).toBe("12.9K");
});

it("formats small costs as currency", () => {
	expect(formatUsd(64.83)).toBe("$64.83");
});

it("compacts large costs", () => {
	expect(formatUsd(4_200_000)).toBe("$4.2M");
});

it("returns null delta when there is no previous value", () => {
	expect(computeDelta(100, null, true)).toBeNull();
});

it("marks an increase as bad when upIsBad", () => {
	const delta = computeDelta(120, 100, true);
	expect(delta).toEqual({ direction: "up", sentiment: "bad", text: "+20%" });
});

it("marks a decrease as good when upIsBad", () => {
	const delta = computeDelta(80, 100, true);
	expect(delta).toEqual({ direction: "down", sentiment: "good", text: "-20%" });
});

it("reports direction without judgment when upIsBad is false", () => {
	const delta = computeDelta(120, 100, false);
	expect(delta).toEqual({
		direction: "up",
		sentiment: "neutral",
		text: "+20%",
	});
});

it("treats near-zero change as flat", () => {
	expect(computeDelta(100.2, 100, true)).toEqual({
		direction: "flat",
		sentiment: "neutral",
		text: "±0%",
	});
});

it("reports 'new' when the previous period had zero", () => {
	expect(computeDelta(50, 0, true)).toEqual({
		direction: "up",
		sentiment: "bad",
		text: "new",
	});
});

it("treats zero-to-zero as flat, not new", () => {
	expect(computeDelta(0, 0, true)).toEqual({
		direction: "flat",
		sentiment: "neutral",
		text: "±0%",
	});
});
