import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import type { UsageBucket } from "../lib/api";
import { BreakdownCard } from "./BreakdownCard";

function bucket(
	key: string,
	cost: number | null,
	tokens: { in: number; out: number } = { in: 100, out: 200 },
	incomplete = false,
): UsageBucket {
	return {
		key,
		input_tokens: tokens.in,
		output_tokens: tokens.out,
		cache_creation_tokens: 0,
		cache_read_tokens: 0,
		events: 1,
		cost_usd: cost,
		cost_incomplete: incomplete,
	};
}

it("shows a loading state before any data has arrived", () => {
	render(<BreakdownCard title="By model" buckets={null} loading={true} />);
	expect(screen.getByText("Loading usage…")).toBeInTheDocument();
});

it("keeps showing rows (dimmed) instead of a loading placeholder during a refetch", () => {
	render(
		<BreakdownCard
			title="By model"
			buckets={[bucket("claude-opus", 50)]}
			loading={true}
		/>,
	);
	expect(screen.queryByText("Loading usage…")).not.toBeInTheDocument();
	expect(screen.getByText("claude-opus").closest("ul")).toHaveClass(
		"breakdown-list--refreshing",
	);
});

it("shows an empty state when there is no usage", () => {
	render(<BreakdownCard title="By model" buckets={[]} loading={false} />);
	expect(screen.getByText("No usage in this period")).toBeInTheDocument();
});

it("sorts rows by cost descending, with unknown-cost rows last", () => {
	render(
		<BreakdownCard
			title="By model"
			buckets={[
				bucket("claude-haiku", 5),
				bucket("claude-opus", 50),
				bucket("mystery-model", null),
				bucket("claude-sonnet", 20),
			]}
			loading={false}
		/>,
	);
	const labels = screen
		.getAllByText(/claude-|mystery-model/)
		.map((el) => el.textContent);
	expect(labels).toEqual([
		"claude-opus",
		"claude-sonnet",
		"claude-haiku",
		"mystery-model",
	]);
});

it("formats cost and token columns", () => {
	render(
		<BreakdownCard
			title="By project"
			buckets={[bucket("/repo/heimdall", 12.5, { in: 1500, out: 2500 })]}
			loading={false}
		/>,
	);
	expect(screen.getByText("$12.50")).toBeInTheDocument();
	expect(screen.getByText("1,500 in / 2,500 out")).toBeInTheDocument();
});

it("flags unpriced rows and shows a dash instead of a cost", () => {
	render(
		<BreakdownCard
			title="By model"
			buckets={[bucket("mystery-model", null, undefined, true)]}
			loading={false}
		/>,
	);
	expect(screen.getByText("unpriced")).toBeInTheDocument();
	expect(screen.getByText("—")).toBeInTheDocument();
});
