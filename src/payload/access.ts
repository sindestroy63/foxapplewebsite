import type { Access, FieldAccess } from 'payload'

type Role = 'superadmin' | 'admin' | 'manager'

function getRole(req: any): Role | null {
  return req.user?.role || null
}

export const anyone: Access = () => true

export const authenticated: Access = ({ req }) => Boolean(req.user)

export const admins: Access = ({ req }) => {
  const role = getRole(req)
  return role === 'superadmin' || role === 'admin'
}

export const superadmins: Access = ({ req }) => getRole(req) === 'superadmin'

export const adminsOrFirstUser: Access = async ({ req }) => {
  if (req.user) {
    const role = getRole(req)
    return role === 'superadmin' || role === 'admin'
  }

  const users = await req.payload.count({ collection: 'users' })
  return users.totalDocs === 0
}

export const roleFieldAccess: FieldAccess = ({ req, siblingData }) => {
  const myRole = getRole(req)
  if (myRole === 'superadmin') return true
  if (myRole === 'admin') {
    const targetRole = siblingData?.role as Role | undefined
    if (targetRole === 'superadmin' || targetRole === 'admin') return false
    return true
  }
  return false
}
