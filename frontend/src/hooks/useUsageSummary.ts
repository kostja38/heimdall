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

export function useUsageSummary(
	since: string,
	until: string,
	groupBy: GroupBy,
) {
	const [state, setState] = useState<UsageSummaryState>({
		data: null,
		loading: true,
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
		const controller = new AbortController();
		fetchSummary(controller.signal);
		return () => controller.abort();
	}, [fetchSummary]);

	return { ...state, refetch: () => fetchSummary() };
}
