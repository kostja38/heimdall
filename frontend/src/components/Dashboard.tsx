import { useMemo } from "react";
import { useUsageSummary } from "../hooks/useUsageSummary";
import { currentRange, previousRange } from "../lib/period";
import { BreakdownCard } from "./BreakdownCard";
import { KpiRow } from "./KpiRow";
import { TimelineChart } from "./TimelineChart";

// TODO(period picker task): make the period stateful and add the picker UI.
const PERIOD = "30d" as const;

export function Dashboard() {
	const range = useMemo(() => currentRange(PERIOD), []);
	const prevRange = useMemo(() => previousRange(PERIOD), []);

	const current = useUsageSummary(range.since, range.until, "day");
	const previous = useUsageSummary(
		prevRange?.since ?? "",
		prevRange?.until ?? "",
		"day",
		prevRange !== null,
	);
	const byModel = useUsageSummary(range.since, range.until, "model");
	const byProject = useUsageSummary(range.since, range.until, "project");

	return (
		<div className="dashboard">
			<KpiRow
				current={current.data?.total ?? null}
				previous={previous.data?.total ?? null}
				loading={current.loading}
			/>
			<TimelineChart
				buckets={current.data?.buckets ?? []}
				since={range.since}
				until={range.until}
				loading={current.loading}
			/>
			<div className="breakdown-grid">
				<BreakdownCard
					title="By model"
					buckets={byModel.data?.buckets ?? []}
					loading={byModel.loading}
				/>
				<BreakdownCard
					title="By project"
					buckets={byProject.data?.buckets ?? []}
					loading={byProject.loading}
				/>
			</div>
		</div>
	);
}
