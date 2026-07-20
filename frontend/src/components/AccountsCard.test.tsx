import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import * as api from "../lib/api";
import { AccountsCard } from "./AccountsCard";

afterEach(() => {
	vi.restoreAllMocks();
});

it("shows a placeholder when there are no accounts", async () => {
	vi.spyOn(api, "getAccounts").mockResolvedValue([]);
	render(<AccountsCard />);

	await waitFor(() =>
		expect(screen.getByText("No accounts yet")).toBeInTheDocument(),
	);
});

it("shows the fetch error instead of the account list", async () => {
	vi.spyOn(api, "getAccounts").mockRejectedValue(new Error("network down"));
	render(<AccountsCard />);

	await waitFor(() =>
		expect(screen.getByText("network down")).toBeInTheDocument(),
	);
});

it("lists existing accounts with their created_at", async () => {
	vi.spyOn(api, "getAccounts").mockResolvedValue([
		{ id: 1, name: "client-a", created_at: "2026-07-20T10:00:00Z" },
	]);
	render(<AccountsCard />);

	await waitFor(() => expect(screen.getByText("client-a")).toBeInTheDocument());
});

it("creates an account, clears the key field, and refetches the list", async () => {
	vi.spyOn(api, "getAccounts").mockResolvedValue([]);
	const createSpy = vi
		.spyOn(api, "createAccount")
		.mockResolvedValue({ id: 1, name: "client-a", created_at: "2026-07-20" });
	render(<AccountsCard />);
	await waitFor(() => expect(api.getAccounts).toHaveBeenCalledTimes(1));

	fireEvent.change(screen.getByLabelText("Account name"), {
		target: { value: "client-a" },
	});
	const keyInput = screen.getByLabelText("API key") as HTMLInputElement;
	fireEvent.change(keyInput, { target: { value: "sk-ant-admin-x" } });
	fireEvent.click(screen.getByText("Add account"));

	await waitFor(() =>
		expect(createSpy).toHaveBeenCalledWith("client-a", "sk-ant-admin-x"),
	);
	expect(keyInput.value).toBe("");
	await waitFor(() => expect(api.getAccounts).toHaveBeenCalledTimes(2));
});

it("shows an error and keeps the form when creation fails", async () => {
	vi.spyOn(api, "getAccounts").mockResolvedValue([]);
	vi.spyOn(api, "createAccount").mockRejectedValue(
		new Error("account 'client-a' already exists"),
	);
	render(<AccountsCard />);
	await waitFor(() => expect(api.getAccounts).toHaveBeenCalledTimes(1));

	fireEvent.change(screen.getByLabelText("Account name"), {
		target: { value: "client-a" },
	});
	fireEvent.change(screen.getByLabelText("API key"), {
		target: { value: "sk-ant-admin-x" },
	});
	fireEvent.click(screen.getByText("Add account"));

	await waitFor(() =>
		expect(
			screen.getByText("account 'client-a' already exists"),
		).toBeInTheDocument(),
	);
});

it("deletes an account after a confirm step", async () => {
	vi.spyOn(api, "getAccounts").mockResolvedValue([
		{ id: 1, name: "client-a", created_at: "2026-07-20T10:00:00Z" },
	]);
	const deleteSpy = vi.spyOn(api, "deleteAccount").mockResolvedValue(undefined);
	render(<AccountsCard />);
	await waitFor(() => expect(screen.getByText("client-a")).toBeInTheDocument());

	fireEvent.click(screen.getByText("Delete"));
	expect(deleteSpy).not.toHaveBeenCalled();
	expect(screen.getByText("Confirm?")).toBeInTheDocument();

	fireEvent.click(screen.getByText("Confirm?"));
	await waitFor(() => expect(deleteSpy).toHaveBeenCalledWith("client-a"));
	await waitFor(() => expect(api.getAccounts).toHaveBeenCalledTimes(2));
});

it("masks the API key input", async () => {
	vi.spyOn(api, "getAccounts").mockResolvedValue([]);
	render(<AccountsCard />);

	const keyInput = screen.getByLabelText("API key");
	expect(keyInput).toHaveAttribute("type", "password");
});
