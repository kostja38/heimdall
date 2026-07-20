import { useMemo, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	type TooltipContentProps,
	XAxis,
	YAxis,
} from "recharts";
import type { UsageBucket } from "../lib/api";
import { formatUsd } from "../lib/format";
import { buildDailySeries, type DailyPoint } from "../lib/timeSeries";

const ACCENT = "#d97757";
const GRID = "rgba(255, 255, 255, 0.08)";
const AXIS_TEXT = "#9ca3af";

function formatAxisDate(date: string): string {
	return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
	if (!active || !payload?.length) return null;
	const point = payload[0].payload as DailyPoint;
	return (
		<div className="chart-tooltip">
			<div className="chart-tooltip__value">
				{point.cost !== null ? formatUsd(point.cost) : "Unknown"}
				{point.costIncomplete && (
					<span className="chart-tooltip__hint"> (partial)</span>
				)}
			</div>
			<div className="chart-tooltip__label">{formatAxisDate(point.date)}</div>
		</div>
	);
}

interface TimelineChartProps {
	buckets: UsageBucket[];
	since: string;
	until: string;
	loading: boolean;
}

export function TimelineChart({
	buckets,
	since,
	until,
	loading,
}: TimelineChartProps) {
	const [showTable, setShowTable] = useState(false);
	const series = useMemo(
		() => buildDailySeries(buckets, since, until),
		[buckets, since, until],
	);
	const hasIncomplete = series.some((p) => p.costIncomplete);

	return (
		<div className="glass-card chart-card">
			<div className="chart-card__header">
				<h2>Cost over time</h2>
				<button
					type="button"
					className="chart-table-toggle"
					onClick={() => setShowTable((v) => !v)}
				>
					{showTable ? "Hide table" : "View as table"}
				</button>
			</div>

			{loading ? (
				<div className="chart-card__loading">Loading usage…</div>
			) : (
				<ResponsiveContainer width="100%" height={260}>
					<AreaChart
						data={series}
						margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
					>
						<CartesianGrid stroke={GRID} vertical={false} />
						<XAxis
							dataKey="date"
							tickFormatter={formatAxisDate}
							tick={{ fill: AXIS_TEXT, fontSize: 11 }}
							axisLine={{ stroke: GRID }}
							tickLine={false}
							interval="preserveStartEnd"
							minTickGap={40}
						/>
						<YAxis
							tickFormatter={(v: number) => formatUsd(v)}
							tick={{ fill: AXIS_TEXT, fontSize: 11 }}
							axisLine={false}
							tickLine={false}
							width={64}
						/>
						<Tooltip
							content={(props) => <ChartTooltip {...props} />}
							cursor={{ stroke: GRID }}
						/>
						<Area
							type="monotone"
							dataKey="cost"
							stroke={ACCENT}
							strokeWidth={2}
							fill={ACCENT}
							fillOpacity={0.1}
							connectNulls={false}
							dot={false}
							isAnimationActive={false}
						/>
					</AreaChart>
				</ResponsiveContainer>
			)}

			{showTable && (
				<div className="chart-table-wrap">
					<table className="chart-table">
						<thead>
							<tr>
								<th>Date</th>
								<th>Cost</th>
							</tr>
						</thead>
						<tbody>
							{series.map((point) => (
								<tr key={point.date}>
									<td>{formatAxisDate(point.date)}</td>
									<td className="chart-table__number">
										{point.cost !== null ? formatUsd(point.cost) : "—"}
										{point.costIncomplete ? " *" : ""}
									</td>
								</tr>
							))}
						</tbody>
					</table>
					{hasIncomplete && (
						<p className="chart-table__note">
							* includes usage from an unpriced model — cost is a partial figure
						</p>
					)}
				</div>
			)}
		</div>
	);
}
