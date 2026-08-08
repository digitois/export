export type Role = 'owner' | 'admin' | 'manager' | 'employee';

/**
 * Role hierarchy: owner > admin > manager > employee.
 * Returns true when `current` role is equal to or above `required`.
 */
export function hasRole(current: Role | null | undefined, required: Role): boolean {
  if (!current) return false;
  const order: Record<Role, number> = { owner: 4, admin: 3, manager: 2, employee: 1 };
  return order[current] >= order[required];
}

export const PERMISSIONS = {
  products: {
    view: ['owner', 'admin', 'manager', 'employee'],
    create: ['owner', 'admin', 'manager', 'employee'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin', 'manager']
  },
  leads: {
    view: ['owner', 'admin', 'manager', 'employee'],
    create: ['owner', 'admin', 'manager', 'employee'],
    update: ['owner', 'admin', 'manager', 'employee'],
    delete: ['owner', 'admin', 'manager']
  },
  quotations: {
    view: ['owner', 'admin', 'manager', 'employee'],
    create: ['owner', 'admin', 'manager', 'employee'],
    update: ['owner', 'admin', 'manager', 'employee'],
    delete: ['owner', 'admin', 'manager']
  },
  invoices: {
    view: ['owner', 'admin', 'manager', 'employee'],
    create: ['owner', 'admin', 'manager', 'employee'],
    update: ['owner', 'admin', 'manager', 'employee'],
    delete: ['owner', 'admin', 'manager']
  },
  buyers: {
    view: ['owner', 'admin', 'manager', 'employee'],
    create: ['owner', 'admin', 'manager', 'employee'],
    update: ['owner', 'admin', 'manager', 'employee'],
    delete: ['owner', 'admin', 'manager']
  },
  documents: {
    view: ['owner', 'admin', 'manager', 'employee'],
    create: ['owner', 'admin', 'manager', 'employee'],
    update: ['owner', 'admin', 'manager', 'employee'],
    delete: ['owner', 'admin', 'manager']
  },
  blog: {
    view: ['owner', 'admin', 'manager', 'employee'],
    create: ['owner', 'admin', 'manager'],
    update: ['owner', 'admin', 'manager'],
    delete: ['owner', 'admin', 'manager']
  },
  website: {
    view: ['owner', 'admin', 'manager', 'employee'],
    update: ['owner', 'admin'],
    publish: ['owner', 'admin']
  },
  team: {
    manage: ['owner', 'admin']
  },
  billing: {
    manage: ['owner', 'admin']
  },
  company: {
    manage: ['owner', 'admin', 'manager']
  },
  analytics: {
    view: ['owner', 'admin', 'manager', 'employee']
  },
  email: {
    view: ['owner', 'admin', 'manager', 'employee'],
    create: ['owner', 'admin', 'manager'],
    send: ['owner', 'admin', 'manager']
  },
  ai: {
    use: ['owner', 'admin', 'manager', 'employee']
  },
  admin: {
    manage: ['owner']
  }
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function can(
  role: Role | null | undefined,
  resource: PermissionKey,
  action: string = 'view'
): boolean {
  if (!role) return false;
  const allowed = (PERMISSIONS[resource] as unknown as Record<string, readonly Role[]>)[action];
  if (!allowed) return false;
  return hasRole(role, allowed[allowed.length - 1]);
}
