/**
 * What a line pays in each bank transfer. The salary is the legal part's net
 * and the extras the rest; a flat salary has no legal part, so all of it is
 * the agreed extras.
 */
export function splitTransfers(l: { agreement: string; net: number; extras: number }) {
  if (l.agreement === 'flat') return { salary: 0, extras: l.net };
  return { salary: l.net - l.extras, extras: l.extras };
}
