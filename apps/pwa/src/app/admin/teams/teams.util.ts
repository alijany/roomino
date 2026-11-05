import { JobGroup } from '@/app/dashboard/attendance/attendance.types';

export interface TeamNode {
  team: JobGroup;
  depth: number;
}

/** Teams in tree order: each parent followed by its sub-teams, indented by depth. */
export function teamTree(teams: JobGroup[]): TeamNode[] {
  const byParent = new Map<number | null, JobGroup[]>();
  const ids = new Set(teams.map((t) => t.id));
  for (const team of teams) {
    // A parent outside the list counts as top level.
    const key = team.parentId && ids.has(team.parentId) ? team.parentId : null;
    byParent.set(key, [...(byParent.get(key) ?? []), team]);
  }
  const out: TeamNode[] = [];
  const walk = (parent: number | null, depth: number) => {
    for (const team of byParent.get(parent) ?? []) {
      out.push({ team, depth });
      walk(team.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Ids of a team and everything beneath it — none of them may become its parent. */
export function teamAndDescendants(teams: JobGroup[], id: number): Set<number> {
  const found = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const team of teams) {
      if (team.parentId && found.has(team.parentId) && !found.has(team.id)) {
        found.add(team.id);
        grew = true;
      }
    }
  }
  return found;
}
