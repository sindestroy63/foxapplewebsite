import type { Metadata } from 'next'

import { LeadForm } from '@/components/LeadForm'

export const metadata: Metadata = {
  title: 'Рассрочка и кредит на технику',
  description:
    'Рассрочка и кредит на технику Apple в FOX APPLE. Оформление за 10 минут в магазине в Самаре.',
}

export default function InstallmentPage() {
  return (
    <section className="page-section">
      <div className="container content-page">
        <p className="eyebrow">Рассрочка</p>
        <h1>Рассрочка и кредит на технику — обновляйтесь без ожидания</h1>

        <div className="rich-text">
          <p>
            Новый смартфон, мощный ноутбук или современные часы — не стоит откладывать покупку, если
            техника нужна уже сейчас. С рассрочкой или кредитом вы можете забрать товар сразу и
            оплачивать его постепенно.
          </p>
          <p>
            Оформление занимает всего <strong>10 минут</strong> прямо в магазине — без визитов в банк
            и лишних документов.
          </p>
        </div>

        <div className="benefit-grid" style={{ marginTop: 32 }}>
          <div className="benefit">
            <h3>Как это работает</h3>
            <p>
              Во время покупки наш специалист подберёт оптимальный вариант оплаты, оформит заявку на
              месте и сообщит решение уже через несколько минут.
            </p>
            <p>Вы просто выбираете технику — всё остальное мы берём на себя.</p>
          </div>
          <div className="benefit">
            <h3>Рассрочка на технику</h3>
            <p>Идеальный вариант, если хотите приобрести устройство без переплаты.</p>
            <ul>
              <li>Срок: до 36 месяцев</li>
              <li>Фиксированные платежи</li>
              <li>Без скрытых комиссий</li>
            </ul>
            <p>Подходит для покупки смартфонов, ноутбуков, бытовой и цифровой техники.</p>
          </div>
          <div className="benefit">
            <h3>Требования к покупателю</h3>
            <ul>
              <li>Гражданство РФ</li>
              <li>Возраст от 18 до 75 лет</li>
              <li>Стаж на последнем месте работы от 4 месяцев</li>
              <li>Постоянная регистрация в РФ</li>
              <li>Наличие мобильного телефона</li>
            </ul>
          </div>
          <div className="benefit">
            <h3>Минимум документов</h3>
            <p>
              Чаще всего достаточно только <strong>паспорта РФ</strong>. Даже если у вас нет
              официального трудоустройства, банк всё равно рассмотрит заявку.
            </p>
          </div>
        </div>

        <div className="promo-card" style={{ marginTop: 40, textAlign: 'center' }}>
          <h2>Почему это удобно</h2>
          <div
            className="benefit-grid"
            style={{ marginTop: 20, textAlign: 'left' }}
          >
            <div className="benefit">
              <h3>Быстро</h3>
              <p>Оформляете прямо в магазине, решение за 10 минут.</p>
            </div>
            <div className="benefit">
              <h3>Просто</h3>
              <p>Забираете покупку сразу, платите постепенно, без нагрузки на бюджет.</p>
            </div>
          </div>
          <p style={{ marginTop: 16, fontSize: 13, opacity: 0.6 }}>
            Позволяет выбрать технику без компромиссов — берите именно то, что хотите.
          </p>
        </div>

        <div style={{ marginTop: 40 }}>
          <img
            src="/halva.jpg"
            alt="Халва — карта рассрочки. Покупай в рассрочку здесь. ПАО Совкомбанк."
            style={{
              width: '100%',
              maxWidth: 480,
              borderRadius: 'var(--radius-lg)',
              display: 'block',
              margin: '0 auto',
            }}
          />
        </div>

        <LeadForm
          description="Оставьте контакт, и мы подскажем доступные варианты рассрочки под нужную модель."
          source="contact_form"
          title="Заявка на рассрочку"
        />
      </div>
    </section>
  )
}
