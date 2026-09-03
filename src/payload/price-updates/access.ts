import type { Access } from 'payload'

type Role = 'superadmin' | 'admin' | 'manager'

export function canManagePrices(user: unknown): boolean {
  const role = (user as { role?: Role } | null)?.role
  return role === 'superadmin' || role === 'admin' || role === 'manager'
}

export const readOwnPriceUpdates: Access = ({ req }) => {
  if (!req.user || !canManagePrices(req.user)) return false
  const role = (req.user as { role?: Role }).role
  return true
}

export const denyPriceUpdateMutation: Access = () => false
