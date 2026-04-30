import Link from 'next/link'

import type { Category } from '@/lib/types'

export function CatalogControls({
  activeSlug,
  categories,
  query,
  sort,
}: {
  activeSlug?: string
  categories: Category[]
  query?: string
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
        <button className="button" type="submit">
          Найти
        </button>
      </form>
    </section>
  )
}
