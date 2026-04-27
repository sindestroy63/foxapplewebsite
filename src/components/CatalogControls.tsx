import Link from 'next/link'

import type { CatalogFacets, Category } from '@/lib/types'

export function CatalogControls({
  activeSlug,
  categories,
  color,
  facets,
  memory,
  query,
  sim,
  sort,
}: {
  activeSlug?: string
  categories: Category[]
  color?: string
  facets: CatalogFacets
  memory?: string
  query?: string
  sim?: string
  sort?: string
}) {
  const action = activeSlug ? `/catalog/${activeSlug}` : '/catalog'

  return (
    <section className="catalog-panel" aria-label="Фильтры каталога">
      <div className="category-tabs">
        <Link className={!activeSlug ? 'active' : ''} href="/catalog">
          Все
        </Link>
        {categories.map((category) => (
          <Link
            className={activeSlug === category.slug ? 'active' : ''}
            href={`/catalog/${category.slug}`}
            key={category.id}
          >
            {category.name}
          </Link>
        ))}
      </div>

      <form action={action} className="catalog-search">
        <label>
          <span>Поиск</span>
          <input name="q" placeholder="Например, iPhone 17" defaultValue={query} />
        </label>
        <label>
          <span>Сортировка</span>
          <select name="sort" defaultValue={sort || ''}>
            <option value="">По умолчанию</option>
            <option value="price_asc">Сначала дешевле</option>
            <option value="price_desc">Сначала дороже</option>
          </select>
        </label>
        {facets.memories.length > 0 && (
          <label>
            <span>Память</span>
            <select name="memory" defaultValue={memory || ''}>
              <option value="">Любая</option>
              {facets.memories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}
        {facets.colors.length > 0 && (
          <label>
            <span>Цвет</span>
            <select name="color" defaultValue={color || ''}>
              <option value="">Любой</option>
              {facets.colors.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}
        {facets.simTypes.length > 0 && (
          <label>
            <span>SIM / eSIM</span>
            <select name="sim" defaultValue={sim || ''}>
              <option value="">Любой</option>
              {facets.simTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="button" type="submit">
          Найти
        </button>
      </form>
    </section>
  )
}
