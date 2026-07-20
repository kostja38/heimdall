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

async function parseOrThrow<T>(response: Response): Promise<T> {
	if (!response.ok) {
		throw new Error(`Request failed with status ${response.status}`);
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
