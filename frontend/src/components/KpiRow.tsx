import type { UsageTotal } from "../lib/api";
import {
	computeDelta,
	type Delta,
	formatNumber,
	formatUsd,
} from "../lib/format";

interface StatTileProps {
	label: string;
	value: string;
	delta: Delta | null;
	title?: string;
}

const DELTA_ARROW: Record<Delta["direction"], string> = {
	up: "▲",
	down: "▼",
	flat: "→",
};

function StatTile({ label, value, delta, title }: StatTileProps) {
	return (
		<div className="stat-tile" title={title}>
			<div className="stat-tile__label">{label}</div>
			<div className="stat-tile__value">{value}</div>
			{delta && (
				<div
					className={`stat-tile__delta stat-tile__delta--${delta.sentiment}`}
				>
					<span aria-hidden="true">{DELTA_ARROW[delta.direction]}</span>{" "}
					{delta.text} vs previous period
				</div>
			)}
		</div>
	);
}

interface KpiRowProps {
	current: UsageTotal | null;
	previous: UsageTotal | null;
	loading: boolean;
}

export function KpiRow({ current, previous, loading }: KpiRowProps) {
	if (!current) {
		return (
			<div className="kpi-row" aria-busy="true">
				<div className="stat-tile stat-tile--loading">Loading usage…</div>
			</div>
		);
	}

	const costDelta =
		current.cost_usd !== null && previous
			? computeDelta(current.cost_usd, previous.cost_usd, true)
			: null;
	const inputDelta = previous
		? computeDelta(current.input_tokens, previous.input_tokens, false)
		: null;
	const outputDelta = previous
		? computeDelta(current.output_tokens, previous.output_tokens, false)
		: null;
	const eventsDelta = previous
		? computeDelta(current.events, previous.events, false)
		: null;

	return (
		<div
			className={loading ? "kpi-row kpi-row--refreshing" : "kpi-row"}
			aria-busy={loading}
		>
			<StatTile
				label="Total cost"
				value={current.cost_usd !== null ? formatUsd(current.cost_usd) : "—"}
				delta={costDelta}
				title={
					current.cost_incomplete
						? "Includes usage from an unpriced model — cost is a partial figure"
						: undefined
				}
			/>
			<StatTile
				label="Tokens in"
				value={formatNumber(current.input_tokens)}
				delta={inputDelta}
			/>
			<StatTile
				label="Tokens out"
				value={formatNumber(current.output_tokens)}
				delta={outputDelta}
			/>
			<StatTile
				label="Events"
				value={formatNumber(current.events)}
				delta={eventsDelta}
			/>
		</div>
	);
}
