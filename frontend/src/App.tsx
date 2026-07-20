import { Dashboard } from "./components/Dashboard";
import { type BackendStatus, useBackendStatus } from "./hooks/useBackendStatus";

const STATUS_LABEL: Record<BackendStatus, string> = {
	checking: "Checking backend…",
	online: "Backend connected",
	offline: "Backend offline",
};

function App() {
	const status = useBackendStatus();

	return (
		<div className="app">
			<header className="app-header">
				<h1>Heimdall</h1>
				<div className="status-row">
					<span className={`status-dot status-dot--${status}`} />
					<span>{STATUS_LABEL[status]}</span>
				</div>
			</header>
			<Dashboard />
		</div>
	);
}

export default App;
