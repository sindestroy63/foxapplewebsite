'use client'

const TICKER_TEXT =
  'Гарантия низкой цены | Нашли дешевле? Сделаем еще дешевле! | Trade-in | Рассрочка | Гарантия 1 год.'

export function BottomTicker() {
  const segments = Array.from({ length: 3 }, (_, index) => index)

  return (
    <div className="bottom-ticker" aria-hidden="true">
      <div className="bottom-ticker__track">
        {segments.map((segment) => (
          <span className="bottom-ticker__segment" key={segment}>
            <span className="bottom-ticker__item">{TICKER_TEXT}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
