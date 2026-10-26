const points = [
  'Только оригинальная техника с официальной гарантией 1 год.',
  'Честный Trade-in — выгодный обмен старого устройства на новое.',
  'Удобная рассрочка на покупку гаджетов на гибких условиях.',
  'Товары в наличии в Самаре — без долгого ожидания и предзаказов.',
  'Оплата при получении после полной проверки устройства.',
  'Контроль качества — проверка комплектации и подлинности перед оплатой.',
  'Большой ассортимент оригинальных аксессуаров всегда в магазине.',
  'Сервисная поддержка — помощь в активации и настройке после покупки.',
  '8 лет надежности на рынке и тысячи довольных клиентов.',
]

export function StoreAbout() {
  return (
    <section className="section">
      <div className="container store-about">
        <div className="store-about-body">
          <h2 className="store-about-title">
            <span>ФОХСТОР.РФ:</span> Оригинальная техника ближе, чем кажется
          </h2>
          <ul className="store-about-list">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="store-about-address">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.5" />
            </svg>
            <span>Ждем вас: г. Самара, ТЦ «Русь на Волге», 1 этаж, секция 113</span>
          </p>
        </div>
        <div className="store-about-photo">
          <img src="/store/storefront.jpg" width={960} height={1280} alt="Магазин ФОХСТОР.РФ в Самаре" loading="lazy" decoding="async" />
        </div>
      </div>
    </section>
  )
}
