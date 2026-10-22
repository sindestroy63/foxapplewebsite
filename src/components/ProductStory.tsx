"use client"

import React, { useState } from "react"
import { getStoryForProduct } from "@/lib/product-stories"
import { RichText } from "@/components/RichText"
import type { Product } from "@/lib/types"

function getProductSpecs(product: Product): Array<{ label: string; value: string }> {
  const specs: Array<{ label: string; value: string }> = []
  if (product.name) specs.push({ label: "Модель", value: product.name })
  if (product.model && product.model !== product.name) specs.push({ label: "Серия", value: product.model })
  const category = product.category
  const categoryName =
    category && typeof category === "object" && "name" in category && typeof category.name === "string"
      ? category.name
      : ""
  if (categoryName) specs.push({ label: "Категория", value: categoryName })

  const memories = Array.from(
    new Set(
      [
        product.memory,
        ...(product.variants || []).map((v) => v.memory || v.storage),
      ].filter(Boolean) as string[],
    ),
  )
  if (memories.length > 0) specs.push({ label: "Объем памяти", value: memories.join(" / ") })

  const colors = Array.from(
    new Set(
      [
        product.color,
        ...(product.variants || []).map((v) => v.color?.russianLabel || v.color?.englishLabel),
      ].filter(Boolean) as string[],
    ),
  )
  if (colors.length > 0) specs.push({ label: "Цвета в наличии", value: colors.join(", ") })

  const sims = Array.from(
    new Set(
      [
        product.simType,
        ...(product.variants || []).map((v) => v.simType || v.sim),
      ].filter(Boolean) as string[],
    ),
  )
  if (sims.length > 0) specs.push({ label: "Связь", value: sims.join(" / ") })

  if (product.chip) specs.push({ label: "Процессор", value: product.chip })
  if (product.screenSize) specs.push({ label: "Дисплей", value: product.screenSize })
  if (product.packageLabel) specs.push({ label: "Комплектация", value: product.packageLabel })

  specs.push({ label: "Гарантия", value: "1 год официальной гарантии ФОХСТОР" })
  specs.push({ label: "Доставка", value: "Бесплатная доставка по Самаре в день заказа" })

  return specs
}

export function ProductStory({ product }: { product: Product }) {
  const [activeTab, setActiveTab] = useState<"story" | "specs">("story")

  const story = getStoryForProduct(product)
  const specs = getProductSpecs(product)
  const cards = story?.cards || []

  if (!story && specs.length === 0) return null

  function scrollToSection(tab: "story" | "specs") {
    setActiveTab(tab)
    const targetId = tab === "specs" ? "restore-specs" : "restore-story"
    const el = document.getElementById(targetId)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <section className="restore-story-section" id="restore-story" aria-label="Подробнее о товаре">
      <div className="container">
        <h2 className="restore-story-heading">Подробнее о товаре</h2>
        <div className="restore-tabs-header">
          <div className="restore-tabs">
            <button
              type="button"
              className={`restore-tab-btn ${activeTab === "story" ? "active" : ""}`}
              onClick={() => scrollToSection("story")}
            >
              О товаре
            </button>
            <button
              type="button"
              className={`restore-tab-btn ${activeTab === "specs" ? "active" : ""}`}
              onClick={() => scrollToSection("specs")}
            >
              Характеристики
            </button>
          </div>
        </div>

        {!story && product.description ? (
          <div className="product-own-description">
            <RichText content={product.description} />
          </div>
        ) : null}

        {story?.hero && (
          <div className="restore-hero-card">
            <div className="restore-hero-content">
              <h2 className="restore-hero-title">{story.hero.title}</h2>
              <p className="restore-hero-subtitle">{story.hero.subtitle}</p>
              {story.hero.description && (
                <p className="restore-hero-description">{story.hero.description}</p>
              )}
            </div>
            <div className="restore-hero-media">
              <img src={story.hero.image} alt={story.hero.title} className="restore-hero-img" />
            </div>
          </div>
        )}

        {cards.length > 0 && (
          <div className="restore-cards-block">
            <div className="restore-cards-grid">
              {cards.map((card, idx) => (
                <article
                  className={`restore-card ${cards.length % 2 !== 0 && idx === cards.length - 1 ? "restore-card--wide" : ""}`}
                  key={card.title}
                >
                  <div className="restore-card-header">
                    {card.badge && <span className="restore-card-badge">{card.badge}</span>}
                    <h3 className="restore-card-title">{card.title}</h3>
                  </div>
                  <div className="restore-card-media">
                    <img src={card.image} alt={card.title} className="restore-card-img" />
                  </div>
                  {card.text && <p className="restore-card-text">{card.text}</p>}
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="restore-specs-block" id="restore-specs">
          <div className="restore-specs-header">
            <span className="restore-specs-eyebrow">Детали</span>
            <h2 className="restore-specs-title">Характеристики</h2>
          </div>
          <div className="restore-specs-table">
            {specs.map((item) => (
              <div className="restore-specs-row" key={item.label}>
                <span className="restore-specs-label">{item.label}</span>
                <span className="restore-specs-value">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
