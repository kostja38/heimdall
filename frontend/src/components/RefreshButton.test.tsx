import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import * as api from "../lib/api";
import { RefreshButton } from "./RefreshButton";

afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

it("imports logs, reports the inserted count, and triggers a refetch", async () => {
	vi.spyOn(api, "importLogs").mockResolvedValue({ inserted: 3, skipped: 10 });
	const onRefreshed = vi.fn();
	render(<RefreshButton onRefreshed={onRefreshed} />);

	fireEvent.click(screen.getByText("Refresh"));
	expect(screen.getByText("Refreshing…")).toBeInTheDocument();

	await waitFor(() =>
		expect(screen.getByText("+3 new events")).toBeInTheDocument(),
	);
	expect(onRefreshed).toHaveBeenCalledTimes(1);
});

it("reports 'up to date' when nothing new was imported", async () => {
	vi.spyOn(api, "importLogs").mockResolvedValue({ inserted: 0, skipped: 20 });
	render(<RefreshButton onRefreshed={vi.fn()} />);

	fireEvent.click(screen.getByText("Refresh"));
	await waitFor(() =>
		expect(screen.getByText("Up to date")).toBeInTheDocument(),
	);
});

it("shows an error and does not refetch when the import fails", async () => {
	vi.spyOn(api, "importLogs").mockRejectedValue(new Error("network down"));
	const onRefreshed = vi.fn();
	render(<RefreshButton onRefreshed={onRefreshed} />);

	fireEvent.click(screen.getByText("Refresh"));
	await waitFor(() =>
		expect(screen.getByText("network down")).toBeInTheDocument(),
	);
	expect(onRefreshed).not.toHaveBeenCalled();
});
