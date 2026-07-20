import type { UsageBucket } from "../lib/api";
import { formatNumber, formatUsd } from "../lib/format";

function sortByCostDesc(buckets: UsageBucket[]): UsageBucket[] {
	return [...buckets].sort((a, b) => {
		if (a.cost_usd === null && b.cost_usd === null) return 0;
		if (a.cost_usd === null) return 1; // unknown cost sinks — can't rank what we can't price
		if (b.cost_usd === null) return -1;
		return b.cost_usd - a.cost_usd;
	});
}

interface BreakdownCardProps {
	title: string;
	buckets: UsageBucket[];
	loading: boolean;
}

export function BreakdownCard({ title, buckets, loading }: BreakdownCardProps) {
	const rows = sortByCostDesc(buckets);
	const maxCost = Math.max(0, ...rows.map((r) => r.cost_usd ?? 0));

	return (
		<div className="glass-card breakdown-card">
			<div className="chart-card__header">
				<h2>{title}</h2>
			</div>

			{loading ? (
				<div className="chart-card__loading">Loading usage…</div>
			) : rows.length === 0 ? (
				<div className="chart-card__loading">No usage in this period</div>
			) : (
				<ul className="breakdown-list">
					{rows.map((row) => (
						<li key={row.key} className="breakdown-row">
							<div className="breakdown-row__label" title={row.key}>
								{row.key}
								{row.cost_incomplete && (
									<span className="breakdown-row__badge">unpriced</span>
								)}
							</div>
							<div className="breakdown-row__bar-track">
								<div
									className="breakdown-row__bar"
									style={{
										width: `${maxCost > 0 ? ((row.cost_usd ?? 0) / maxCost) * 100 : 0}%`,
									}}
								/>
							</div>
							<div className="breakdown-row__figures">
								<span className="breakdown-row__cost">
									{row.cost_usd !== null ? formatUsd(row.cost_usd) : "—"}
								</span>
								<span className="breakdown-row__tokens">
									{formatNumber(row.input_tokens)} in /{" "}
									{formatNumber(row.output_tokens)} out
								</span>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
