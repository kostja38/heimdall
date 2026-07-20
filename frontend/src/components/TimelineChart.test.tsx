import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type { UsageBucket } from "../lib/api";
import { TimelineChart } from "./TimelineChart";

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

it("shows a loading state before any data has arrived", () => {
	render(
		<TimelineChart
			buckets={[]}
			since="2026-07-18T00:00:00Z"
			until="2026-07-20T00:00:00Z"
			loading={true}
		/>,
	);
	expect(screen.getByText("Loading usage…")).toBeInTheDocument();
});

it("toggles a table view listing every filled day", () => {
	render(
		<TimelineChart
			buckets={[bucket("2026-07-18", 5), bucket("2026-07-20", 3)]}
			since="2026-07-18T00:00:00Z"
			until="2026-07-20T00:00:00Z"
			loading={false}
		/>,
	);

	expect(screen.queryByRole("table")).not.toBeInTheDocument();

	fireEvent.click(screen.getByText("View as table"));
	expect(screen.getByRole("table")).toBeInTheDocument();
	expect(screen.getByText("$5.00")).toBeInTheDocument();
	expect(screen.getByText("$0.00")).toBeInTheDocument(); // filled gap day
	expect(screen.getByText("$3.00")).toBeInTheDocument();

	fireEvent.click(screen.getByText("Hide table"));
	expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

it("flags partial rows from an unpriced model", () => {
	render(
		<TimelineChart
			buckets={[bucket("2026-07-18", null, true)]}
			since="2026-07-18T00:00:00Z"
			until="2026-07-18T00:00:00Z"
			loading={false}
		/>,
	);
	fireEvent.click(screen.getByText("View as table"));
	expect(screen.getByText("— *")).toBeInTheDocument();
	expect(screen.getByText(/unpriced model/)).toBeInTheDocument();
});
