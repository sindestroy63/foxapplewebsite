export function productSeoTitle(product: { name?: string | null; model?: string | null }): string {
  const name = product.name?.trim() || product.model?.trim() || 'Техника в ФОХСТОР'
  return `${name} — купить в Самаре | ФОХСТОР`
}
