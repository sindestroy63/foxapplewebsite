import type { Access, FieldAccess } from 'payload'

type Role = 'superadmin' | 'admin' | 'manager'

function getRole(req: any): Role | null {
  return req.user?.role || null
}

export const anyone: Access = () => true

export const denyAll: Access = () => false

export const authenticated: Access = ({ req }) => Boolean(req.user)

export function hasFullAdminAccess(user: unknown): boolean {
  const role = (user as { role?: Role } | null)?.role
  return role === 'manager' || role === 'admin' || role === 'superadmin'
}

const adminsImplementation = ({ req }: { req: any }) => {
  const role = getRole(req)
  return hasFullAdminAccess(req.user)
}
export const admins = adminsImplementation as Access & FieldAccess

export const superadmins: Access = ({ req }) => hasFullAdminAccess(req.user)

export const adminsOrFirstUser: Access = async ({ req }) => {
  if (req.user) {
    const role = getRole(req)
    return hasFullAdminAccess(req.user)
  }

  const users = await req.payload.count({ collection: 'users' })
  return users.totalDocs === 0
}

export const roleFieldAccess: FieldAccess = ({ req, siblingData }) => {
  void siblingData
  return hasFullAdminAccess(req.user)
}
