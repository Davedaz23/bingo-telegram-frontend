export const ADMIN_ROLES = [
  'super_admin',
  'admin',
  'SUPERADMIN',
  'ADMIN',
  'bm',
  'BM',
  'edi',
  'EDI',
  'districtmanager',
  'DISTRICTMANAGER',
]

export function hasAdminAccess(role: string): boolean {
  return ADMIN_ROLES.includes(role)
}

export function isSuperAdmin(role: string): boolean {
  return role === 'super_admin' || role === 'SUPERADMIN'
}
