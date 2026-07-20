import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useAccounts } from "./useAccounts";

afterEach(() => {
	vi.unstubAllGlobals();
});

it("fetches accounts on mount", async () => {
	const accounts = [{ id: 1, name: "client-a", created_at: "2026-07-20" }];
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => accounts,
	});
	vi.stubGlobal("fetch", fetchMock);

	const { result } = renderHook(() => useAccounts());

	expect(result.current.loading).toBe(true);
	await waitFor(() => expect(result.current.loading).toBe(false));

	expect(result.current.accounts).toEqual(accounts);
	expect(result.current.error).toBeNull();
	expect(fetchMock).toHaveBeenCalledWith("/api/accounts");
});

it("surfaces an error when the request fails", async () => {
	const fetchMock = vi.fn().mockResolvedValue({
		ok: false,
		status: 500,
		json: async () => ({}),
	});
	vi.stubGlobal("fetch", fetchMock);

	const { result } = renderHook(() => useAccounts());

	await waitFor(() => expect(result.current.loading).toBe(false));
	expect(result.current.accounts).toEqual([]);
	expect(result.current.error).toBe("Request failed with status 500");
});

it("refetch reloads the list", async () => {
	const fetchMock = vi
		.fn()
		.mockResolvedValueOnce({
			ok: true,
			json: async () => [],
		})
		.mockResolvedValueOnce({
			ok: true,
			json: async () => [{ id: 1, name: "client-a", created_at: "2026-07-20" }],
		});
	vi.stubGlobal("fetch", fetchMock);

	const { result } = renderHook(() => useAccounts());
	await waitFor(() => expect(result.current.loading).toBe(false));
	expect(result.current.accounts).toEqual([]);

	result.current.refetch();
	await waitFor(() => expect(result.current.accounts).toHaveLength(1));
});
