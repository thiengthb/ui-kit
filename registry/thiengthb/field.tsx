import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { InfoTooltip } from '@/components/info-tooltip';

/**
 * Shared Field for EVERY form: label + control + hint/info.
 * A control inside a `sm:grid-cols-2` grid is always `w-full` → cells are equal and fill the grid.
 * Uses <div> (not wrapping <label>) to avoid conflicts with Popover-style controls (DatePicker/TimePicker).
 */
export function Field({
  label,
  hint,
  info,
  className,
  children,
}: {
  label: ReactNode;
  /** Short note below the control */
  hint?: ReactNode;
  /** Long explanation → ⓘ icon next to the label (hover tooltip) */
  info?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {info && (
          <InfoTooltip label={typeof label === 'string' ? label : 'Giải thích'}>{info}</InfoTooltip>
        )}
      </span>
      {children}
      {hint && <span className="text-[11px] text-muted-foreground/80">{hint}</span>}
    </div>
  );
}
