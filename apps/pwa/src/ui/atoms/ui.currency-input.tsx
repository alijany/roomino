"use client";

import React, { useEffect, useState } from "react";
import { RIAL_PER_TOMAN } from "@/libs/format/format.util";
import { Input } from "./ui.input";

type CurrencyUnit = "rial" | "toman";

type CurrencyInputProps = Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value'> & {
  /** Numeric value, always in **rial** regardless of the display unit. */
  value?: number | null;
  onValueChange?: (value: number | null) => void;
  /**
   * Unit the user types in. The value in and out is still rial — this only
   * changes what is shown, so callers never have to divide by ten themselves.
   */
  unit?: CurrencyUnit;
};

// Latin digits with thousands separators. Persian digits in a text input fight
// with the caret and with paste, so amounts are entered LTR and only *displayed*
// in Persian elsewhere.
function formatNumber(value: number | null) {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString('en-US');
}

function parseNumberFromString(s: string) {
  if (!s) return null;
  const onlyDigits = s.replace(/[^0-9]/g, '');
  if (!onlyDigits) return null;
  const n = Number(onlyDigits);
  return Number.isFinite(n) ? n : null;
}

const toDisplay = (rial: number | null, unit: CurrencyUnit) =>
  rial == null ? null : unit === 'toman' ? Math.round(rial / RIAL_PER_TOMAN) : rial;

const toRial = (shown: number | null, unit: CurrencyUnit) =>
  shown == null ? null : unit === 'toman' ? shown * RIAL_PER_TOMAN : shown;

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value = null,
  onValueChange,
  unit = 'rial',
  ...props
}) => {
  const [display, setDisplay] = useState<string>(formatNumber(toDisplay(value, unit)));

  useEffect(() => {
    setDisplay(formatNumber(toDisplay(value, unit)));
  }, [value, unit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseNumberFromString(e.target.value);
    setDisplay(formatNumber(parsed));
    onValueChange?.(toRial(parsed, unit));
  };

  return (
    <Input
      {...(props as Record<string, unknown>)}
      dir="ltr"
      inputMode="numeric"
      className="text-left"
      value={display}
      onChange={handleChange}
    />
  );
};

export default CurrencyInput;
