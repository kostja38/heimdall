import { PERIOD_OPTIONS, type Period } from "../lib/period";

interface PeriodPickerProps {
	value: Period;
	onChange: (period: Period) => void;
}

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
	return (
		<fieldset className="period-picker">
			<legend className="sr-only">Time period</legend>
			{PERIOD_OPTIONS.map((option) => (
				<button
					key={option.value}
					type="button"
					className={
						option.value === value
							? "period-picker__option period-picker__option--active"
							: "period-picker__option"
					}
					aria-pressed={option.value === value}
					onClick={() => onChange(option.value)}
				>
					{option.label}
				</button>
			))}
		</fieldset>
	);
}
