import type { FC } from 'react'

const Section = ({ children }: { children: string }) => <h2 className="product-form-section">{children}</h2>

export const BasicsSection: FC = () => <Section>Основное</Section>
export const PlacementSection: FC = () => <Section>Размещение в каталоге</Section>
export const CommerceSection: FC = () => <Section>Цена и наличие</Section>
export const VariantsSection: FC = () => <Section>Варианты товара</Section>
export const MediaSection: FC = () => <Section>Фото и описание</Section>
