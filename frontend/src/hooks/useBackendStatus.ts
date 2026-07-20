import { useEffect, useState } from "react";

export type BackendStatus = "checking" | "online" | "offline";

const HEALTH_CHECK_INTERVAL_MS = 5000;

export function useBackendStatus(): BackendStatus {
	const [status, setStatus] = useState<BackendStatus>("checking");

	useEffect(() => {
		let cancelled = false;

		async function checkHealth() {
			try {
				const response = await fetch("/health");
				if (!cancelled) {
					setStatus(response.ok ? "online" : "offline");
				}
			} catch {
				if (!cancelled) {
					setStatus("offline");
				}
			}
		}

		checkHealth();
		const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL_MS);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, []);

	return status;
}
