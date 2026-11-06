'use client'

import { useDocumentInfo } from '@payloadcms/ui'

import styles from './VariantTools.module.css'

export default function VariantBuilderLink() {
  const { id } = useDocumentInfo()

  if (!id) {
    return (
      <div className={styles.formLink}>
        <strong>Добавить сразу несколько вариантов</strong>
        <span className={styles.muted}>Сначала сохраните товар, затем здесь появится кнопка конструктора вариантов.</span>
      </div>
    )
  }

  return (
    <div className={styles.formLink}>
      <strong>Добавить сразу несколько вариантов</strong>
      <span className={styles.muted}>Отметьте цвета, память и SIM, и недостающие комбинации добавятся одним действием. Существующие варианты не изменятся.</span>
      <a className={styles.button} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={`/admin/variant-builder?productId=${id}`}>
        Открыть конструктор вариантов
      </a>
    </div>
  )
}
