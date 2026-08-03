export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}

export const RoleLabels: Record<Role, string> = {
  [Role.ADMIN]: 'ادمین',
  [Role.USER]: 'کاربر',
};

// Role hierarchy for permission checks
export const RoleHierarchy: Record<Role, number> = {
  [Role.ADMIN]: 1,
  [Role.USER]: 0,
};

export const Roles = Object.values(Role);
