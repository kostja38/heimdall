export type GroupBy = "day" | "model" | "project";

export interface UsageBucket {
	key: string;
	input_tokens: number;
	output_tokens: number;
	cache_creation_tokens: number;
	cache_read_tokens: number;
	events: number;
	cost_usd: number | null;
	cost_incomplete: boolean;
}

export interface UsageTotal {
	input_tokens: number;
	output_tokens: number;
	cache_creation_tokens: number;
	cache_read_tokens: number;
	events: number;
	cost_usd: number | null;
	cost_incomplete: boolean;
}

export interface UsageSummaryResponse {
	buckets: UsageBucket[];
	total: UsageTotal;
}

export interface ImportStats {
	inserted: number;
	skipped: number;
}

export interface Account {
	id: number;
	name: string;
	created_at: string;
}

async function errorMessage(response: Response): Promise<string> {
	try {
		const body = await response.json();
		if (typeof body?.detail === "string") return body.detail;
	} catch {
		// no JSON body — fall through to the generic message
	}
	return `Request failed with status ${response.status}`;
}

async function parseOrThrow<T>(response: Response): Promise<T> {
	if (!response.ok) {
		throw new Error(await errorMessage(response));
	}
	return response.json() as Promise<T>;
}

export function getUsageSummary(
	params: { since: string; until: string; groupBy: GroupBy },
	signal?: AbortSignal,
): Promise<UsageSummaryResponse> {
	const query = new URLSearchParams({
		since: params.since,
		until: params.until,
		group_by: params.groupBy,
	});
	return fetch(`/api/usage/summary?${query}`, { signal }).then((response) =>
		parseOrThrow<UsageSummaryResponse>(response),
	);
}

export function importLogs(): Promise<ImportStats> {
	return fetch("/api/import/logs", { method: "POST" }).then((response) =>
		parseOrThrow<ImportStats>(response),
	);
}

export function getAccounts(): Promise<Account[]> {
	return fetch("/api/accounts").then((response) =>
		parseOrThrow<Account[]>(response),
	);
}

export function createAccount(name: string, apiKey: string): Promise<Account> {
	return fetch("/api/accounts", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name, api_key: apiKey }),
	}).then((response) => parseOrThrow<Account>(response));
}

export function deleteAccount(name: string): Promise<void> {
	return fetch(`/api/accounts/${encodeURIComponent(name)}`, {
		method: "DELETE",
	}).then(async (response) => {
		if (!response.ok) throw new Error(await errorMessage(response));
	});
}
