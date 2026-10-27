import { cn } from '@/libs/style/style.util.helpers';
import { AdvanceApprovalStepStatus } from './advance-request.types';

const STEP_STYLES: Record<AdvanceApprovalStepStatus, { label: string; className: string }> = {
  [AdvanceApprovalStepStatus.PENDING]: {
    label: 'در انتظار',
    className: 'bg-amber-50 text-amber-600',
  },
  [AdvanceApprovalStepStatus.APPROVED]: {
    label: 'تأیید شد',
    className: 'bg-emerald-50 text-emerald-600',
  },
  [AdvanceApprovalStepStatus.REJECTED]: {
    label: 'رد شد',
    className: 'bg-rose-50 text-rose-600',
  },
  [AdvanceApprovalStepStatus.SKIPPED]: {
    label: 'بی‌اثر',
    className: 'bg-slate-50 text-slate-400',
  },
};

export function StepBadge({ status }: { status: AdvanceApprovalStepStatus }) {
  const style = STEP_STYLES[status];
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium', style.className)}>
      {style.label}
    </span>
  );
}
