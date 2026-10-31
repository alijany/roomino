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
  header: ReactNode;
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
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/80">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap text-slate-500 border-b border-slate-200/80",
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

      {/* Mobile: one card per row — the first column is the title, the rest
          a two-column field grid, and header-less (action) columns a footer. */}
      <div className="lg:hidden flex flex-col gap-2.5">
        {rows.map((row) => {
          const visible = columns.filter((column) => !column.hideOnMobile);
          const [lead, ...rest] = visible;
          const fields = rest.filter((column) => column.header);
          const actions = rest.filter((column) => !column.header);

          return (
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
                "ui-surface flex flex-col gap-3 p-4",
                interactive &&
                  "cursor-pointer transition-colors active:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              )}
            >
              {lead && (
                <div className={cn("min-w-0 text-sm font-semibold text-slate-900", lead.className)}>
                  {lead.render(row)}
                </div>
              )}
              {fields.length > 0 && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {fields.map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-xs text-slate-500">{column.header}</dt>
                      <dd
                        className={cn(
                          "mt-0.5 break-words text-sm text-slate-800",
                          column.numeric && "tabular-nums"
                        )}
                      >
                        {column.render(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {actions.length > 0 && (
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  {actions.map((column) => (
                    <div key={column.key}>{column.render(row)}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
