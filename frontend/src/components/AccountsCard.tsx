import { type FormEvent, useState } from "react";
import { useAccounts } from "../hooks/useAccounts";
import { createAccount, deleteAccount } from "../lib/api";

export function AccountsCard() {
	const { accounts, loading, error, refetch } = useAccounts();
	const [name, setName] = useState("");
	const [apiKey, setApiKey] = useState("");
	const [formError, setFormError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [pendingDelete, setPendingDelete] = useState<string | null>(null);

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setFormError(null);
		try {
			await createAccount(name, apiKey);
			setName("");
			setApiKey("");
			await refetch();
		} catch (err) {
			setFormError(
				err instanceof Error ? err.message : "Failed to create account",
			);
		} finally {
			setSubmitting(false);
		}
	}

	async function handleDelete(accountName: string) {
		if (pendingDelete !== accountName) {
			setPendingDelete(accountName);
			return;
		}
		setPendingDelete(null);
		await deleteAccount(accountName);
		await refetch();
	}

	return (
		<div className="glass-card accounts-card">
			<div className="chart-card__header">
				<h2>Accounts</h2>
			</div>

			{loading ? (
				<div className="chart-card__loading">Loading accounts…</div>
			) : error ? (
				<div className="chart-card__loading">{error}</div>
			) : accounts.length === 0 ? (
				<div className="chart-card__loading">No accounts yet</div>
			) : (
				<ul className="accounts-list">
					{accounts.map((account) => (
						<li key={account.id} className="accounts-row">
							<div className="accounts-row__label">
								<span>{account.name}</span>
								<span className="accounts-row__created">
									added {new Date(account.created_at).toLocaleDateString()}
								</span>
							</div>
							<button
								type="button"
								className="accounts-row__delete"
								onClick={() => handleDelete(account.name)}
							>
								{pendingDelete === account.name ? "Confirm?" : "Delete"}
							</button>
						</li>
					))}
				</ul>
			)}

			<form className="accounts-form" onSubmit={handleSubmit}>
				<div className="accounts-form__field">
					<label htmlFor="account-name">Account name</label>
					<input
						id="account-name"
						type="text"
						value={name}
						onChange={(e) => setName(e.target.value)}
						required
					/>
				</div>
				<div className="accounts-form__field">
					<label htmlFor="account-key">API key</label>
					<input
						id="account-key"
						type="password"
						value={apiKey}
						onChange={(e) => setApiKey(e.target.value)}
						required
					/>
				</div>
				<button type="submit" disabled={submitting}>
					Add account
				</button>
				{formError && (
					<span className="accounts-form__error" role="alert">
						{formError}
					</span>
				)}
			</form>
		</div>
	);
}
