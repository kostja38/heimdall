import { useEffect, useState } from "react";
import { importLogs } from "../lib/api";

type Status =
	| { kind: "idle" }
	| { kind: "busy" }
	| { kind: "done"; inserted: number }
	| { kind: "error"; message: string };

const TOAST_DURATION_MS = 4000;

interface RefreshButtonProps {
	onRefreshed: () => void;
}

export function RefreshButton({ onRefreshed }: RefreshButtonProps) {
	const [status, setStatus] = useState<Status>({ kind: "idle" });

	useEffect(() => {
		if (status.kind !== "done" && status.kind !== "error") return;
		const timer = setTimeout(
			() => setStatus({ kind: "idle" }),
			TOAST_DURATION_MS,
		);
		return () => clearTimeout(timer);
	}, [status]);

	async function handleClick() {
		setStatus({ kind: "busy" });
		try {
			const stats = await importLogs();
			setStatus({ kind: "done", inserted: stats.inserted });
			onRefreshed();
		} catch (err) {
			setStatus({
				kind: "error",
				message: err instanceof Error ? err.message : "Import failed",
			});
		}
	}

	return (
		<div className="refresh-control">
			<button
				type="button"
				className="refresh-button"
				onClick={handleClick}
				disabled={status.kind === "busy"}
			>
				{status.kind === "busy" ? "Refreshing…" : "Refresh"}
			</button>
			{status.kind === "done" && (
				<span className="refresh-status" role="status">
					{status.inserted > 0
						? `+${status.inserted} new events`
						: "Up to date"}
				</span>
			)}
			{status.kind === "error" && (
				<span className="refresh-status refresh-status--error" role="status">
					{status.message}
				</span>
			)}
		</div>
	);
}
