import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import type { UsageTotal } from "../lib/api";
import { KpiRow } from "./KpiRow";

const current: UsageTotal = {
	input_tokens: 1000,
	output_tokens: 2000,
	cache_creation_tokens: 0,
	cache_read_tokens: 0,
	events: 42,
	cost_usd: 12.5,
	cost_incomplete: false,
};

const previous: UsageTotal = {
	...current,
	input_tokens: 500, // +100%, distinct from cost's +25% for unambiguous queries
	cost_usd: 10,
};

function tileFor(label: string): HTMLElement {
	const el = screen.getByText(label).closest(".stat-tile");
	if (!el) throw new Error(`no .stat-tile ancestor for label ${label}`);
	return el as HTMLElement;
}

it("shows a loading state while fetching", () => {
	render(<KpiRow current={null} previous={null} loading={true} />);
	expect(screen.getByText("Loading usage…")).toBeInTheDocument();
});

it("renders formatted values without deltas when there is no previous period", () => {
	render(<KpiRow current={current} previous={null} loading={false} />);
	expect(screen.getByText("$12.50")).toBeInTheDocument();
	expect(screen.getByText("1,000")).toBeInTheDocument();
	expect(screen.getByText("2,000")).toBeInTheDocument();
	expect(screen.getByText("42")).toBeInTheDocument();
	expect(screen.queryByText(/vs previous period/)).not.toBeInTheDocument();
});

it("renders a bad-sentiment delta for a cost increase", () => {
	render(<KpiRow current={current} previous={previous} loading={false} />);
	const delta = within(tileFor("Total cost")).getByText(
		/\+25% vs previous period/,
	);
	expect(delta.closest(".stat-tile__delta")).toHaveClass(
		"stat-tile__delta--bad",
	);
});

it("renders a neutral-sentiment delta for a token count change", () => {
	render(<KpiRow current={current} previous={previous} loading={false} />);
	const delta = within(tileFor("Tokens in")).getByText(
		/\+100% vs previous period/,
	);
	expect(delta.closest(".stat-tile__delta")).toHaveClass(
		"stat-tile__delta--neutral",
	);
});

it("shows a placeholder and hint when cost is unknown", () => {
	const unknownCostCurrent: UsageTotal = {
		...current,
		cost_usd: null,
		cost_incomplete: true,
	};
	render(
		<KpiRow current={unknownCostCurrent} previous={null} loading={false} />,
	);
	expect(screen.getByText("—")).toBeInTheDocument();
	expect(screen.getByText("—").closest(".stat-tile")).toHaveAttribute(
		"title",
		"Includes usage from an unpriced model — cost is a partial figure",
	);
});
