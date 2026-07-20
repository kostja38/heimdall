import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useUsageSummary } from "./useUsageSummary";

const summaryResponse = {
	buckets: [
		{
			key: "2026-07-20",
			input_tokens: 100,
			output_tokens: 200,
			cache_creation_tokens: 0,
			cache_read_tokens: 0,
			events: 3,
			cost_usd: 1.5,
			cost_incomplete: false,
		},
	],
	total: {
		input_tokens: 100,
		output_tokens: 200,
		cache_creation_tokens: 0,
		cache_read_tokens: 0,
		events: 3,
		cost_usd: 1.5,
		cost_incomplete: false,
	},
};

afterEach(() => {
	vi.unstubAllGlobals();
});

it("fetches the usage summary for the given range and group_by", async () => {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => summaryResponse,
	});
	vi.stubGlobal("fetch", fetchMock);

	const { result } = renderHook(() =>
		useUsageSummary("2026-07-01T00:00:00Z", "2026-07-20T00:00:00Z", "day"),
	);

	expect(result.current.loading).toBe(true);
	await waitFor(() => expect(result.current.loading).toBe(false));

	expect(result.current.data).toEqual(summaryResponse);
	expect(result.current.error).toBeNull();

	const requestedUrl = fetchMock.mock.calls[0][0] as string;
	expect(requestedUrl).toContain("/api/usage/summary?");
	expect(requestedUrl).toContain("since=2026-07-01T00%3A00%3A00Z");
	expect(requestedUrl).toContain("until=2026-07-20T00%3A00%3A00Z");
	expect(requestedUrl).toContain("group_by=day");
});

it("surfaces an error when the request fails", async () => {
	const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
	vi.stubGlobal("fetch", fetchMock);

	const { result } = renderHook(() =>
		useUsageSummary("2026-07-01T00:00:00Z", "2026-07-20T00:00:00Z", "day"),
	);

	await waitFor(() => expect(result.current.loading).toBe(false));

	expect(result.current.data).toBeNull();
	expect(result.current.error).toContain("500");
});

it("refetch triggers a new request", async () => {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => summaryResponse,
	});
	vi.stubGlobal("fetch", fetchMock);

	const { result } = renderHook(() =>
		useUsageSummary("2026-07-01T00:00:00Z", "2026-07-20T00:00:00Z", "day"),
	);
	await waitFor(() => expect(result.current.loading).toBe(false));
	expect(fetchMock).toHaveBeenCalledTimes(1);

	result.current.refetch();
	await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
});

it("skips fetching when disabled", async () => {
	const fetchMock = vi.fn();
	vi.stubGlobal("fetch", fetchMock);

	const { result } = renderHook(() =>
		useUsageSummary(
			"2026-07-01T00:00:00Z",
			"2026-07-20T00:00:00Z",
			"day",
			false,
		),
	);

	expect(result.current.loading).toBe(false);
	expect(result.current.data).toBeNull();
	expect(fetchMock).not.toHaveBeenCalled();
});
