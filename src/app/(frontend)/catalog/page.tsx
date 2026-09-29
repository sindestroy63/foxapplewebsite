import type { Metadata } from 'next'
import Link from 'next/link'

import { getBrandCatalogNavigation, getProducts, getProductsByProductGroup, getSiteSettings, readCatalogParams } from '@/lib/cms'
import { ProductGrid } from '@/components/ProductGrid'
import { CatalogGroupCard } from '@/components/CatalogGroupCard'
import { CategoryCatalogClient } from '@/components/CategoryCatalogClient'
import { getCatalogPlacementTabs, resolveProductCatalogPlacement } from '@/lib/product-catalog-placement'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Каталог техники',
  description: 'Актуальный каталог ФОХСТОР: iPhone, iPad, MacBook, AirPods, Apple Watch, PlayStation и аксессуары.',
  alternates: {
    canonical: '/catalog',
  },
  openGraph: {
    title: 'Каталог техники ФОХСТОР',
    description: 'Проверяйте цены и наличие техники Apple в Самаре.',
  },
}

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams
  const filters = readCatalogParams(query)
  const groupSlug = filters.productGroup
  if (groupSlug) {
    const [{ group, products }, brandNavigation] = await Promise.all([
      getProductsByProductGroup(groupSlug, filters),
      getBrandCatalogNavigation(),
    ])
    const { default: GroupCatalogPage } = await import('@/components/GroupCatalogPage')
    const placement = resolveProductCatalogPlacement({ productGroup: groupSlug, brand: filters.brand, productLine: filters.line })
    const heading = placement && filters.brand ? `${filters.brand} — ${placement.childTitle || placement.groupTitle}` : undefined
    const menuGroup = placement ? brandNavigation.find((item) => item.key === placement.groupKey) : undefined
    const childOrder = menuGroup?.children?.map((item) => item.key)
    return <GroupCatalogPage group={group!} products={products} heading={heading} breadcrumbChild={placement && filters.brand ? placement.childTitle : undefined} placementTabs={getCatalogPlacementTabs({ productGroup: groupSlug, brand: filters.brand, line: filters.line, appleAccessories: filters.appleAccessories, childOrder })} activePlacement={placement} />
  }
  if (filters.query) {
    const [products, settings] = await Promise.all([getProducts({ filters }), getSiteSettings()])
    return <section className="page-section"><div className="container"><nav className="breadcrumbs" aria-label="Навигация"><a href="/">Главная</a><span className="breadcrumbs-sep">›</span><a href="/catalog">Каталог</a><span className="breadcrumbs-sep">›</span><span>Поиск</span></nav><h1 className="catalog-category-title">Результаты поиска</h1><form className="catalog-search catalog-search--page" action="/catalog" method="get"><input aria-label="Поиск товаров" defaultValue={filters.query} name="search" placeholder="Например, iPhone 17 Pro" type="search" /><button className="button" type="submit">Найти</button></form><p className="catalog-category-subtitle">По запросу «{filters.query}» найдено {products.length} товаров</p><form className="search-results-filters" action="/catalog" method="get"><input type="hidden" name="search" value={filters.query} /><label><span>От, ₽</span><input name="minPrice" type="number" defaultValue={filters.minPrice || ''} /></label><label><span>До, ₽</span><input name="maxPrice" type="number" defaultValue={filters.maxPrice || ''} /></label><label><span>Память</span><input name="storage" defaultValue={filters.storage || ''} placeholder="256GB" /></label><label><span>Цвет</span><input name="color" defaultValue={filters.color || ''} placeholder="Black" /></label><label><span>SIM</span><input name="sim" defaultValue={filters.sim || ''} placeholder="eSIM" /></label><label><span>Сортировка</span><select name="sort" defaultValue={filters.sort || 'relevance'}><option value="relevance">По релевантности</option><option value="price_asc">Сначала дешевле</option><option value="price_desc">Сначала дороже</option><option value="name">По названию</option></select></label><label><span>Наличие</span><select name="inStock" defaultValue={filters.inStock ? '1' : ''}><option value="">Все</option><option value="1">В наличии</option></select></label><button className="button" type="submit">Применить</button></form><ProductGrid emptyText={`По запросу «${filters.query}» ничего не найдено. Попробуйте изменить запрос или сбросить фильтры.`} products={products} settings={settings} />{products.length > 0 && <p><Link href="/catalog">Сбросить поиск</Link></p>}</div></section>
  }
  if (filters.brand || filters.line) {
    if (filters.brand && !filters.line) {
      const brandNavigation = await getBrandCatalogNavigation()
      const group = brandNavigation.find((item) => item.filter?.brand === filters.brand)
      if (group?.children?.length) {
        return <section className="page-section"><div className="container catalog-categories-page"><nav className="breadcrumbs" aria-label="Навигация"><a href="/">Главная</a><span className="breadcrumbs-sep">›</span><a href="/catalog">Каталог</a><span className="breadcrumbs-sep">›</span><span>{group.title}</span></nav><h1 className="catalog-category-title">{group.title}</h1><div className="catalog-cat-grid">{group.children.filter((child) => child.isVisible !== false).map((child) => <CatalogGroupCard key={child.key} slug={child.key} label={child.title} href={child.href} coverImage={child.coverImage || null} compact />)}</div></div></section>
      }
    }
    const [products, brandNavigation] = await Promise.all([getProducts({ filters }), getBrandCatalogNavigation()])
    const title = filters.line || filters.brand || 'Каталог'
    const placement = resolveProductCatalogPlacement({ productGroup: filters.productGroup, brand: filters.brand, productLine: filters.line })
    const menuGroup = placement ? brandNavigation.find((item) => item.key === placement.groupKey) : undefined
    const childOrder = menuGroup?.children?.map((item) => item.key)
    return <section className="page-section"><div className="container"><CategoryCatalogClient categoryName={placement && filters.brand ? `${filters.brand} — ${placement.childTitle || placement.groupTitle}` : title} categorySlug="other" products={products} phone="+7 (917) 954-64-64" placementTabs={getCatalogPlacementTabs({ productGroup: filters.productGroup, brand: filters.brand, line: filters.line, appleAccessories: filters.appleAccessories, childOrder })} activePlacement={placement} breadcrumbBrand={placement && filters.brand ? filters.brand : undefined} breadcrumbChild={placement && filters.brand ? placement.childTitle : undefined} /></div></section>
  }
  const brandNavigation = await getBrandCatalogNavigation()
  return (
    <section className="page-section">
      <div className="container catalog-categories-page">
        <nav className="breadcrumbs" aria-label="Навигация">
          <a href="/">Главная</a>
          <span className="breadcrumbs-sep">›</span>
          <span>Каталог</span>
        </nav>

        <h1 className="catalog-category-title">Каталог техники</h1>
        <p className="catalog-category-subtitle">Выберите категорию, чтобы подобрать модель и конфигурацию.</p>

        <div className="catalog-cat-grid">
          {brandNavigation.map((group) => (
            <CatalogGroupCard key={group.key} slug={group.key} label={group.title} href={group.href} coverImage={group.coverImage || null} compact />
          ))}
        </div>
      </div>
    </section>
  )
}
