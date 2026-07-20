import { useMemo, useState } from "react";
import { useUsageSummary } from "../hooks/useUsageSummary";
import { currentRange, type Period, previousRange } from "../lib/period";
import { BreakdownCard } from "./BreakdownCard";
import { KpiRow } from "./KpiRow";
import { PeriodPicker } from "./PeriodPicker";
import { RefreshButton } from "./RefreshButton";
import { TimelineChart } from "./TimelineChart";

export function Dashboard() {
	const [period, setPeriod] = useState<Period>("30d");
	const range = useMemo(() => currentRange(period), [period]);
	const prevRange = useMemo(() => previousRange(period), [period]);

	const current = useUsageSummary(range.since, range.until, "day");
	const previous = useUsageSummary(
		prevRange?.since ?? "",
		prevRange?.until ?? "",
		"day",
		prevRange !== null,
	);
	const byModel = useUsageSummary(range.since, range.until, "model");
	const byProject = useUsageSummary(range.since, range.until, "project");

	function refetchAll() {
		current.refetch();
		previous.refetch();
		byModel.refetch();
		byProject.refetch();
	}

	return (
		<div className="dashboard">
			<div className="dashboard-toolbar">
				<PeriodPicker value={period} onChange={setPeriod} />
				<RefreshButton onRefreshed={refetchAll} />
			</div>
			<KpiRow
				current={current.data?.total ?? null}
				previous={previous.data?.total ?? null}
				loading={current.loading}
			/>
			<TimelineChart
				buckets={current.data?.buckets ?? null}
				since={range.since}
				until={range.until}
				loading={current.loading}
			/>
			<div className="breakdown-grid">
				<BreakdownCard
					title="By model"
					buckets={byModel.data?.buckets ?? null}
					loading={byModel.loading}
				/>
				<BreakdownCard
					title="By project"
					buckets={byProject.data?.buckets ?? null}
					loading={byProject.loading}
				/>
			</div>
		</div>
	);
}
