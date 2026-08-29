import type { CSSProperties } from "react";

export function ProgressMeter({
  percentage,
  completed,
  total,
  compact = false,
}: {
  percentage: number;
  completed: number;
  total: number;
  compact?: boolean;
}) {
  const safePercentage = Math.min(100, Math.max(0, percentage));
  return (
    <div
      className={compact ? "learning-progress compact" : "learning-progress"}
    >
      <div>
        <span>{compact ? "Progress" : "Course progress"}</span>
        <strong>{safePercentage}%</strong>
      </div>
      <i aria-label={`${safePercentage}% complete`}>
        <b style={{ "--progress": `${safePercentage}%` } as CSSProperties} />
      </i>
      <small>
        {completed} of {total} course steps complete
      </small>
    </div>
  );
}
