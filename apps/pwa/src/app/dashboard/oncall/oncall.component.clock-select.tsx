'use client';

import { fa } from '../attendance/attendance.util';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];
const selectClass = 'cursor-pointer appearance-none bg-transparent px-1.5 py-1.5 text-center text-sm tabular-nums focus:outline-none';

/** A 24-hour `"HH:mm"` picker in quarter hours — on-call hours run late, past the attendance picker's range. */
export function ClockSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [hour, minute] = value.split(':');
  // A minute outside the quarter hours stays selectable, so an odd stored value is not lost.
  const minutes = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute];

  return (
    <span dir="ltr" className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
      <select value={hour} onChange={(e) => onChange(`${e.target.value}:${minute}`)} className={selectClass} aria-label="ساعت">
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {fa(h)}
          </option>
        ))}
      </select>
      <span className="text-slate-400">:</span>
      <select value={minute} onChange={(e) => onChange(`${hour}:${e.target.value}`)} className={selectClass} aria-label="دقیقه">
        {minutes.map((m) => (
          <option key={m} value={m}>
            {fa(m)}
          </option>
        ))}
      </select>
    </span>
  );
}
