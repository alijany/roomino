export enum Role {
  ADMIN = 'admin',
  FINANCE = 'finance',
  APPROVER = 'approver',
  HR = 'hr',
  USER = 'user',
}

export const RoleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'ادمین',
  [Role.FINANCE]: 'مالی',
  [Role.APPROVER]: 'تأییدکننده',
  [Role.HR]: 'منابع انسانی',
  [Role.USER]: 'کاربر',
};

// Role hierarchy for permission checks.
// NOTE: RolesGuard matches roles exactly (`some`), it does not use this ladder —
// finance, approver and hr are peers with different jobs, not nested access levels.
export const RoleHierarchy: Record<Role, number> = {
  [Role.ADMIN]: 3,
  [Role.FINANCE]: 2,
  [Role.APPROVER]: 1,
  [Role.HR]: 1,
  [Role.USER]: 0,
};

export const Roles = Object.values(Role);
