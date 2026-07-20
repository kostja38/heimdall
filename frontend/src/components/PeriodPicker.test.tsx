import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PeriodPicker } from "./PeriodPicker";

it("marks the active period and calls onChange for the clicked one", () => {
	const onChange = vi.fn();
	render(<PeriodPicker value="30d" onChange={onChange} />);

	expect(screen.getByText("30d")).toHaveAttribute("aria-pressed", "true");
	expect(screen.getByText("7d")).toHaveAttribute("aria-pressed", "false");

	fireEvent.click(screen.getByText("90d"));
	expect(onChange).toHaveBeenCalledWith("90d");
});

it("renders all four presets", () => {
	render(<PeriodPicker value="all" onChange={vi.fn()} />);
	for (const label of ["7d", "30d", "90d", "All"]) {
		expect(screen.getByText(label)).toBeInTheDocument();
	}
});
