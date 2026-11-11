export enum Role {
  ADMIN = 'admin',
  CEO = 'ceo',
  FINANCE = 'finance',
  FINANCE_MANAGER = 'finance_manager',
  SENIOR_FINANCE = 'senior_finance',
  APPROVER = 'approver',
  HR = 'hr',
  PERSONNEL = 'personnel',
  ONCALL_MANAGER = 'oncall_manager',
  USER = 'user',
}

export const RoleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'ادمین',
  [Role.CEO]: 'مدیر عامل',
  [Role.FINANCE]: 'کارشناس مالی',
  [Role.FINANCE_MANAGER]: 'مدیر مالی',
  [Role.SENIOR_FINANCE]: 'کارشناس ارشد مالی',
  [Role.APPROVER]: 'تأییدکننده',
  [Role.HR]: 'منابع انسانی',
  [Role.PERSONNEL]: 'کارگزینی',
  [Role.ONCALL_MANAGER]: 'مسئول کشیک',
  [Role.USER]: 'کاربر',
};

// Role hierarchy for permission checks.
// NOTE: RolesGuard matches roles exactly (`some`), it does not use this ladder —
// finance, approver and hr are peers with different jobs, not nested access levels.
export const RoleHierarchy: Record<Role, number> = {
  [Role.ADMIN]: 3,
  [Role.CEO]: 3,
  [Role.FINANCE_MANAGER]: 2,
  [Role.SENIOR_FINANCE]: 2,
  [Role.FINANCE]: 2,
  [Role.APPROVER]: 1,
  [Role.HR]: 1,
  [Role.PERSONNEL]: 1,
  [Role.ONCALL_MANAGER]: 1,
  [Role.USER]: 0,
};

/**
 * Roles that carry another role's access. The senior finance expert does
 * everything the finance expert and the finance manager do (including the
 * second advance signature); personnel does everything HR does. Matching stays
 * exact — a holder simply counts as having the implied roles too.
 */
export const ROLE_IMPLIES: Partial<Record<Role, readonly Role[]>> = {
  [Role.SENIOR_FINANCE]: [Role.FINANCE, Role.FINANCE_MANAGER],
  [Role.PERSONNEL]: [Role.HR],
};

/** The roles a person effectively has: theirs plus whatever those imply. */
export function expandRoles(roles: readonly Role[]): Role[] {
  return [...new Set(roles.flatMap((r) => [r, ...(ROLE_IMPLIES[r] ?? [])]))];
}

/** `role` together with every role that implies it — who counts as holding `role`. */
export function rolesImplying(role: Role): Role[] {
  return Object.values(Role).filter((r) => expandRoles([r]).includes(role));
}

export const Roles = Object.values(Role);
