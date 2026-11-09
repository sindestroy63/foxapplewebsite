export const MIN_FAMILY_SIZE = 2

type FamilyNode = {
  title: string
  key: string
  isVisible?: boolean
  products?: Array<{ id: string | number }>
  children?: FamilyNode[]
}

export function findProductFamily<T extends FamilyNode>(navigation: T[], productId: string | number): { group: T; child: T } | null {
  const target = String(productId)
  for (const group of navigation) {
    if (group.isVisible === false) continue
    for (const child of group.children || []) {
      if (child.isVisible === false) continue
      const ids = (child.products || []).map((product) => String(product.id))
      if (ids.length >= MIN_FAMILY_SIZE && ids.includes(target)) return { group, child: child as T }
    }
  }
  return null
}
