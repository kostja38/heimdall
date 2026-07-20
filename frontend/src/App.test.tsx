import { render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";

afterEach(() => {
	vi.unstubAllGlobals();
});

it("renders the header and dashboard shell without crashing", async () => {
	const fetchMock = vi.fn().mockImplementation((url: string) => {
		if (url.startsWith("/api/accounts")) {
			return Promise.resolve({ ok: true, json: async () => [] });
		}
		return Promise.resolve({
			ok: true,
			json: async () => ({
				buckets: [],
				total: {
					input_tokens: 0,
					output_tokens: 0,
					cache_creation_tokens: 0,
					cache_read_tokens: 0,
					events: 0,
					cost_usd: 0,
					cost_incomplete: false,
				},
			}),
		});
	});
	vi.stubGlobal("fetch", fetchMock);

	render(<App />);

	expect(screen.getByText("Heimdall")).toBeInTheDocument();
	expect(await screen.findByText("Total cost")).toBeInTheDocument();
});
