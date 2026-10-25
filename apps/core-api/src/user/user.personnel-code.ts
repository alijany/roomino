import { EntityManager } from '@mikro-orm/postgresql';

/** `T01`, `T02`, … — the prefix and the width codes are issued with. */
const PREFIX = 'T';
const WIDTH = 2;

/** The highest number issued by this process, for creates in one flush. */
let lastIssued = 0;

/**
 * The next free personnel code: one past the highest `T<number>` in use.
 * Codes that don't follow the pattern (typed by hand) are ignored. Rows of
 * the same flush aren't in the table yet, so the process remembers the last
 * number it handed out.
 */
export async function nextPersonnelCode(em: EntityManager): Promise<string> {
  const [row] = (await em.getConnection().execute(
    `select coalesce(max(substring(personnel_code from 2)::int), 0) as max
       from user_entity
      where personnel_code ~ '^${PREFIX}[0-9]{1,9}$'`,
  )) as Array<{ max: number }>;

  lastIssued = Math.max(Number(row?.max ?? 0), lastIssued) + 1;
  return `${PREFIX}${String(lastIssued).padStart(WIDTH, '0')}`;
}
