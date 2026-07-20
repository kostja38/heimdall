import { useCallback, useEffect, useState } from "react";
import { type Account, getAccounts } from "../lib/api";

interface AccountsState {
	accounts: Account[];
	loading: boolean;
	error: string | null;
}

export function useAccounts() {
	const [state, setState] = useState<AccountsState>({
		accounts: [],
		loading: true,
		error: null,
	});

	const fetchAccounts = useCallback(async () => {
		setState((prev) => ({ ...prev, loading: true, error: null }));
		try {
			const accounts = await getAccounts();
			setState({ accounts, loading: false, error: null });
		} catch (err) {
			setState({
				accounts: [],
				loading: false,
				error: err instanceof Error ? err.message : "Failed to load accounts",
			});
		}
	}, []);

	useEffect(() => {
		fetchAccounts();
	}, [fetchAccounts]);

	return { ...state, refetch: fetchAccounts };
}
