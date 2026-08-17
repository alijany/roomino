/** UTF-8 byte order mark. Excel on Windows needs it to read Persian correctly. */
const BOM = '﻿';

export interface CsvColumn {
  key: string;
  header: string;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = value instanceof Date ? value.toISOString() : String(value);

  // Quote when the cell contains a delimiter, a quote or a newline; double any
  // embedded quotes. A stray comma in a vendor name would otherwise shift every
  // column after it.
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/**
 * Renders rows as CSV with a BOM.
 *
 * Deliberately not a streaming writer: finance exports are a month of payments,
 * measured in hundreds of rows, and a string keeps the endpoint trivial.
 */
export function toCsv(
  columns: CsvColumn[],
  rows: Array<Record<string, unknown>>,
): string {
  const header = columns.map((column) => escapeCell(column.header)).join(',');

  const body = rows.map((row) =>
    columns.map((column) => escapeCell(row[column.key])).join(','),
  );

  return BOM + [header, ...body].join('\r\n');
}
