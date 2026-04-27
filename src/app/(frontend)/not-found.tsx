import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="page-section">
      <div className="container content-page">
        <p className="eyebrow">404</p>
        <h1>Страница не найдена</h1>
        <p>Проверьте адрес или откройте каталог FOX APPLE.</p>
        <Link className="button" href="/catalog">
          Открыть каталог
        </Link>
      </div>
    </section>
  )
}
