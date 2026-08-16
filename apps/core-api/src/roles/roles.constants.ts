export enum Role {
  ADMIN = 'admin',
  FINANCE = 'finance',
  APPROVER = 'approver',
  USER = 'user',
}

export const RoleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'ادمین',
  [Role.FINANCE]: 'مالی',
  [Role.APPROVER]: 'تأییدکننده',
  [Role.USER]: 'کاربر',
};

// Role hierarchy for permission checks.
// NOTE: RolesGuard matches roles exactly (`some`), it does not use this ladder —
// finance and approver are peers with different jobs, not nested access levels.
export const RoleHierarchy: Record<Role, number> = {
  [Role.ADMIN]: 3,
  [Role.FINANCE]: 2,
  [Role.APPROVER]: 1,
  [Role.USER]: 0,
};

export const Roles = Object.values(Role);
