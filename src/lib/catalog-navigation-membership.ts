const MAC_LINES = ['iMac', 'Mac mini', 'Mac Studio', 'Mac Pro'];

type ProductLike = {
  id?: unknown;
  name?: unknown;
  model?: unknown;
  brand?: unknown;
  productGroup?: unknown;
  productLine?: unknown;
};

type ChildLike = {
  products?: unknown;
  filter?: unknown;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function idOf(value: unknown): string {
  if (value && typeof value === 'object' && 'id' in value) return text(value.id);
  return text(value);
}

export function matchesProductFilter(product: ProductLike, filter: unknown): boolean {
  if (!filter || typeof filter !== 'object') return false;
  const rule = filter as Readonly<Record<string, unknown>>;
  if (rule.group && product.productGroup !== rule.group) return false;
  if (rule.brand && product.brand !== rule.brand) return false;
  if (rule.line) {
    const line = text(product.productLine);
    if (rule.line === 'MacBook') {
      if (!line.includes('MacBook')) return false;
    } else if (rule.line === 'Apple Mac') {
      if (!MAC_LINES.some((name) => line.includes(name))) return false;
    } else if (product.productLine !== rule.line) {
      return false;
    }
  }
  if (rule.q && !`${text(product.name)} ${text(product.model)} ${text(product.productLine)}`.toLowerCase().includes(text(rule.q).toLowerCase())) return false;
  if (rule.appleAccessories && !(product.productGroup === 'other' && product.brand === 'Apple')) return false;
  return true;
}

export function belongsToChild(product: ProductLike, child: ChildLike): boolean {
  const direct = Array.isArray(child.products) ? child.products : [];
  if (direct.some((value) => idOf(value) === text(product.id))) return true;
  return matchesProductFilter(product, child.filter);
}
