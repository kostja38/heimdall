import { useEffect, useState } from "react";

type BackendStatus = "checking" | "online" | "offline";

const HEALTH_CHECK_INTERVAL_MS = 5000;

function useBackendStatus(): BackendStatus {
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

const STATUS_LABEL: Record<BackendStatus, string> = {
	checking: "Checking backend…",
	online: "Backend connected",
	offline: "Backend offline",
};

function App() {
	const status = useBackendStatus();

	return (
		<div className="glass-card">
			<h1>Heimdall</h1>
			<div className="status-row">
				<span className={`status-dot status-dot--${status}`} />
				<span>{STATUS_LABEL[status]}</span>
			</div>
		</div>
	);
}

export default App;
