import { expect, it } from "vitest";
import { currentRange, previousRange } from "./period";

const NOW = new Date("2026-07-20T12:00:00.000Z");

it("computes a 30d rolling window with a 1s buffer on until", () => {
	const range = currentRange("30d", NOW);
	expect(range.since).toBe("2026-06-20T12:00:00Z");
	expect(range.until).toBe("2026-07-20T12:00:01Z");
});

it("computes the previous period of equal length immediately before current", () => {
	const range = previousRange("30d", NOW);
	expect(range).toEqual({
		since: "2026-05-21T12:00:00Z",
		until: "2026-06-20T12:00:00Z",
	});
});

it("uses a fixed epoch since for the all-time period", () => {
	const range = currentRange("all", NOW);
	expect(range.since).toBe("2000-01-01T00:00:00Z");
	expect(range.until).toBe("2026-07-20T12:00:01Z");
});

it("has no previous period for all-time", () => {
	expect(previousRange("all", NOW)).toBeNull();
});
