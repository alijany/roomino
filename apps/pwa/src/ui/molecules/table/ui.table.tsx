'use client';

import { cn } from "@/libs/style/style.util.helpers";
import { ReactNode } from "react";

/**
 * A responsive data table.
 *
 * Finance queues are genuinely tabular — five or six columns that need to line
 * up — which is where the card-grid pattern used elsewhere in the dashboard
 * stops working. Below `lg` each row collapses into a stacked card with the
 * column headers as labels, so the same column definitions serve both.
 */
export interface TableColumn<T> {
  key: string;
  header: string;
  /** Cell content. */
  render: (row: T) => ReactNode;
  /** Right-align and use tabular figures — for amounts and dates. */
  numeric?: boolean;
  /** Hide on the stacked mobile card (e.g. a redundant column). */
  hideOnMobile?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  className,
}: TableProps<T>) {
  const interactive = Boolean(onRowClick);

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: a real table */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-right font-medium text-slate-500 text-xs whitespace-nowrap border-b border-slate-200",
                    column.numeric && "text-left tabular-nums",
                    column.headerClassName
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={interactive ? () => onRowClick?.(row) : undefined}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? "button" : undefined}
                onKeyDown={
                  interactive
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick?.(row);
                        }
                      }
                    : undefined
                }
                className={cn(
                  "border-b border-slate-100 last:border-b-0 transition-colors",
                  interactive &&
                    "cursor-pointer hover:bg-slate-50 focus:outline-none focus-visible:bg-sky-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary"
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "px-4 py-3 text-slate-700 align-middle",
                      column.numeric && "text-left tabular-nums",
                      column.className
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: the same columns, stacked as label/value pairs */}
      <div className="lg:hidden flex flex-col gap-3">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={interactive ? () => onRowClick?.(row) : undefined}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "button" : undefined}
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onRowClick?.(row);
                    }
                  }
                : undefined
            }
            className={cn(
              "rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-2",
              interactive &&
                "cursor-pointer active:bg-slate-50 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            )}
          >
            {columns
              .filter((column) => !column.hideOnMobile)
              .map((column) => (
                <div
                  key={column.key}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <span className="text-xs text-slate-500 shrink-0 pt-0.5">
                    {column.header}
                  </span>
                  <span
                    className={cn(
                      "text-slate-700 text-left",
                      column.numeric && "tabular-nums"
                    )}
                  >
                    {column.render(row)}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
