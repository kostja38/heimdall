import { useCallback, useEffect, useState } from "react";
import {
	type GroupBy,
	getUsageSummary,
	type UsageSummaryResponse,
} from "../lib/api";

interface UsageSummaryState {
	data: UsageSummaryResponse | null;
	loading: boolean;
	error: string | null;
}

/** `enabled: false` skips fetching entirely (e.g. no meaningful previous
 * period to compare against for the "all" time range). */
export function useUsageSummary(
	since: string,
	until: string,
	groupBy: GroupBy,
	enabled = true,
) {
	const [state, setState] = useState<UsageSummaryState>({
		data: null,
		loading: enabled,
		error: null,
	});

	const fetchSummary = useCallback(
		async (signal?: AbortSignal) => {
			setState((prev) => ({ ...prev, loading: true, error: null }));
			try {
				const data = await getUsageSummary({ since, until, groupBy }, signal);
				setState({ data, loading: false, error: null });
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
				setState({
					data: null,
					loading: false,
					error: err instanceof Error ? err.message : "Failed to load usage",
				});
			}
		},
		[since, until, groupBy],
	);

	useEffect(() => {
		if (!enabled) {
			setState({ data: null, loading: false, error: null });
			return;
		}
		const controller = new AbortController();
		fetchSummary(controller.signal);
		return () => controller.abort();
	}, [fetchSummary, enabled]);

	return { ...state, refetch: () => fetchSummary() };
}
