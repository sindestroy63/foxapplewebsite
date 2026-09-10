'use client'

import { useMemo, useState } from 'react'

type ItemStatus = 'ready' | 'not_found' | 'invalid_price' | 'duplicate_sku_in_input' | 'conflict' | 'updated' | 'failed'

type PriceItem = {
  id: number
  lineNumber: number
  sourceLine: string
  sku?: string
  matchType?: 'product' | 'variant'
  productLabel?: string
  oldCashPrice?: number
  newCashPrice?: number
  oldCardPrice?: number
  newCardPrice?: number
  status: ItemStatus
  errorMessage?: string
}

type BatchResult = {
  batch: {
    id: number
    status: string
    token?: string
    totalLines: number
    readyCount: number
    errorCount: number
    updatedCount: number
  }
  items: PriceItem[]
}
type ImportCandidate = {
  key: string
  productName: string
  matchType: 'product' | 'variant'
  sku: string
  storage?: string
  ram?: string
  color?: string
  sim?: string
  reason: string
  displayPath?: string
}

type ImportItem = {
  id: number
  sourceLine: string
  contextHeading: string
  modelText: string
  price: number
  storage?: string | null
  ram?: string | null
  color?: string | null
  sim?: string | null
  region: string
  revision?: string | null
  manufacturerModelNumber?: string | null
  matchStatus: 'matched' | 'ambiguous' | 'not_found' | 'missing_attributes' | 'manual_review' | 'excluded_used'
  reason: string
  resolution: 'pending' | 'automatic' | 'manual' | 'skipped'
  selectedCandidateKey?: string
  selectedSku?: string
  candidates: ImportCandidate[]
}

type ImportResult = {
  session: { id: number; token: string; status: string; totalItems: number; resolvedCount: number; skippedCount: number }
  questions?: string[]
  items: ImportItem[]
}

const STATUS_LABELS: Record<ItemStatus, string> = {
  ready: 'Готово',
  not_found: 'SKU не найден',
  invalid_price: 'Неверная цена',
  duplicate_sku_in_input: 'Повтор SKU',
  conflict: 'Конфликт',
  updated: 'Обновлено',
  failed: 'Ошибка',
}

function money(value?: number): string {
  return typeof value === 'number' ? `${value.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} ₽` : '—'
}

function attentionKind(value: string): { title: string; message: string } {
  if (/от\s*\d+\s*шт|оптов/i.test(value)) return { title: 'Пропущено: оптовая цена', message: 'Оптовая цена пропущена. Используется только обычная цена товара.' }
  if (/по запросу|без цены|цена не указана/i.test(value)) return { title: 'Пропущено: цена не указана', message: 'Цена не указана. Строка пропущена.' }
  if (/б\/у|бывш|used/i.test(value)) return { title: 'Исключено: Б/У', message: 'Б/У товар исключён из автоматического обновления цен.' }
  if (/кандидат|выбрать|ручн/i.test(value)) return { title: 'Требует ручного выбора', message: 'Нужно выбрать товар из предложенных кандидатов или пропустить строку.' }
  return { title: 'Не удалось определить товар', message: 'Не удалось определить товар. Строка не попадёт в обновление.' }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Ошибка запроса.')
  return data as T
}

export function PriceUpdateViewClient() {
  const [sourceText, setSourceText] = useState('')
  const [result, setResult] = useState<BatchResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [candidateChoices, setCandidateChoices] = useState<Record<number, string>>({})
  const errors = useMemo(() => result?.items.filter((item) => item.status !== 'ready' && item.status !== 'updated') || [], [result])

  async function parsePriceList() {
    setBusy(true); setError(''); setImportResult(null); setResult(null)
    try {
      const matched = await post<ImportResult>('/api/price-updates/match-price-list', { message: sourceText })
      setImportResult(matched)
      setCandidateChoices(Object.fromEntries(matched.items.filter((item) => item.candidates.length).map((item) => [item.id, item.candidates[0].key])))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка разбора сообщения.')
    } finally { setBusy(false) }
  }

  async function resolveImportItem(item: ImportItem, action: 'select' | 'skip') {
    if (!importResult) return
    setBusy(true); setError('')
    try {
      const updated = await post<ImportResult>('/api/price-updates/resolve-import-item', {
        sessionId: importResult.session.id,
        token: importResult.session.token,
        itemId: item.id,
        action,
        ...(action === 'select' ? { candidateKey: candidateChoices[item.id] } : {}),
      })
      setImportResult({ ...updated, questions: importResult.questions })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось сохранить решение.')
    } finally { setBusy(false) }
  }

  async function previewImport() {
    if (!importResult) return
    setBusy(true); setError('')
    try {
      setResult(await post<BatchResult>('/api/price-updates/preview-import', { sessionId: importResult.session.id, token: importResult.session.token }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Не удалось создать предпросмотр.')
    } finally { setBusy(false) }
  }

  async function confirm() {
    if (!result?.batch.token) return
    setBusy(true)
    setError('')
    try {
      setResult(await post<BatchResult>('/api/price-updates/confirm', {
        batchId: result.batch.id,
        token: result.batch.token,
      }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Ошибка подтверждения.')
    } finally {
      setBusy(false)
    }
  }

  const canConfirm = Boolean(result?.batch.token && result.batch.status === 'preview' && result.batch.readyCount > 0)
  const canPreviewImport = Boolean(importResult?.items.length && importResult.items.some((item) => item.resolution === 'automatic' || item.resolution === 'manual') && importResult.items.every((item) => item.resolution !== 'pending'))

  return (
    <div className="price-update-tool">
      <div className="price-update-heading">
        <div>
          <h1>Обновление цен</h1>
          <p>Меняется только цена за наличные. Цена по карте рассчитывается автоматически.</p>
        </div>
        <a href="/admin/collections/price-update-batches">Журнал обновлений</a>
      </div>

      <label className="price-update-input">
        <span>Прайс-лист</span>
        <small>Вставьте список товаров и цен в свободном формате. Артикулы указывать не нужно.</small>
        <textarea
          rows={10}
          value={sourceText}
          onChange={(event) => { setSourceText(event.target.value); setResult(null) }}
          placeholder={'iPhone 17 Pro Max 256GB Deep Blue — 129 990 ₽\nSamsung Galaxy S26 Ultra 12/256GB Black: 78 000'}
        />
      </label>
      <div className="price-update-actions">
        <button type="button" onClick={parsePriceList} disabled={busy || !sourceText.trim()}>Разобрать прайс</button>
        {canPreviewImport && !result ? <button className="primary" type="button" onClick={previewImport} disabled={busy}>Перейти к предпросмотру</button> : null}
        {canConfirm ? <button className="primary" type="button" onClick={confirm} disabled={busy}>Подтвердить обновление</button> : null}
        {busy ? <span>Обработка…</span> : null}
      </div>
      {error ? <div className="price-update-alert error">{error}</div> : null}
      {importResult ? <div className="price-update-ai-result">
        <h2>Сопоставление прайса</h2>
        <div className="price-update-table-wrap">
          <table>
            <thead><tr><th>Исходный текст</th><th>Распознано</th><th>Цена</th><th>Товар / вариант</th><th>Статус</th><th>Решение</th></tr></thead>
            <tbody>{importResult.items.map((item) => <tr key={`import-${item.id}`}>
              <td>{item.sourceLine}</td>
              <td>
                <strong>{item.modelText}</strong>{item.contextHeading ? <><br /><small>Контекст: {item.contextHeading}</small></> : null}
                <br /><small>{[item.storage, item.ram, item.color, item.sim, item.revision, item.manufacturerModelNumber].filter(Boolean).join(' · ') || 'Без дополнительных признаков'}{item.region ? ` · Регион: ${item.region}` : ''}</small>
              </td>
              <td>{money(item.price)}</td>
              <td>{(() => {
                const selected = item.selectedSku ? item.candidates.find((candidate) => candidate.sku === item.selectedSku) : undefined
                const candidates = selected ? [selected] : item.candidates
                if (!candidates.length) return 'Подходящий товар в каталоге не найден.'
                return <div>{candidates.map((candidate, index) => <div key={candidate.key} style={{ marginBottom: index < candidates.length - 1 ? 8 : 0 }}>
                  {candidates.length > 1 ? <strong>Кандидат {index + 1}</strong> : null}
                  <br /><strong>{candidate.displayPath || candidate.productName}</strong>
                  <br /><small>{candidate.matchType === 'variant' ? 'Вариант' : 'Товар'}</small>
                  <br /><small>Служебный SKU: <code>{candidate.sku}</code></small>
                  <br /><small>{candidate.reason}</small>
                </div>)}</div>
              })()}</td>
              <td><strong>{item.matchStatus}</strong><br /><small>{item.reason}</small></td>
              <td>
                {item.resolution === 'automatic' ? 'Выбрано автоматически' : null}
                {item.resolution === 'manual' ? 'Выбрано менеджером' : null}
                {item.resolution === 'skipped' ? 'Пропущено' : null}
                {item.resolution === 'pending' && ['ambiguous', 'missing_attributes', 'manual_review'].includes(item.matchStatus) && item.candidates.length > 1 ? <>
                  <select value={candidateChoices[item.id] || ''} onChange={(event) => setCandidateChoices((current) => ({ ...current, [item.id]: event.target.value }))}>
                    {item.candidates.map((candidate) => <option key={candidate.key} value={candidate.key}>{candidate.productName} · {[candidate.storage, candidate.color, candidate.sim].filter(Boolean).join(' · ')} · {candidate.sku}</option>)}
                  </select>
                  <button type="button" disabled={busy || !candidateChoices[item.id]} onClick={() => resolveImportItem(item, 'select')}>Выбрать</button>
                </> : null}
                {item.resolution === 'pending' && ['ambiguous', 'missing_attributes', 'manual_review'].includes(item.matchStatus) && item.candidates.length === 1 ? <button type="button" disabled={busy} onClick={() => resolveImportItem(item, 'select')}>Подтвердить найденный товар</button> : null}
                {item.resolution === 'pending' && ['ambiguous', 'manual_review', 'missing_attributes', 'not_found', 'excluded_used'].includes(item.matchStatus) ? <button type="button" disabled={busy} onClick={() => resolveImportItem(item, 'skip')}>Пропустить</button> : null}
              </td>
            </tr>)}</tbody>
          </table>
        </div>
        {importResult.questions?.length ? <div className="price-update-errors"><h3>Строки, требующие внимания</h3><p>Эти строки не попадут в обновление цен автоматически.</p>{importResult.questions.map((question) => { const kind = attentionKind(question); return <div key={question}><strong>{kind.title}</strong><p>{question}</p><small>{kind.message}</small></div> })}</div> : null}
      </div> : null}

      {result ? (
        <>
          <div className="price-update-summary">
            <span>Строк: <strong>{result.batch.totalLines}</strong></span>
            <span>Готово: <strong>{result.batch.readyCount}</strong></span>
            <span>Ошибок: <strong>{result.batch.errorCount}</strong></span>
            <span>Обновлено: <strong>{result.batch.updatedCount}</strong></span>
          </div>
          <div className="price-update-table-wrap">
            <table>
              <caption>Безналичные = наличные × 1,2 с округлением.</caption>
              <thead><tr><th>Служебный SKU</th><th>Товар / вариант</th><th>Наличные, было</th><th>Наличные, станет</th><th>Безналичные, было</th><th>Безналичные, станет</th><th>Статус</th></tr></thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id || item.lineNumber}>
                    <td><code>{item.sku || '—'}</code>{item.matchType ? <><br /><small>{item.matchType === 'variant' ? 'Вариант' : 'Товар'}</small></> : null}</td>
                    <td>{item.productLabel || '—'}</td>
                    <td>{money(item.oldCashPrice)}</td><td>{money(item.newCashPrice)}</td>
                    <td>{money(item.oldCardPrice)}</td><td>{money(item.newCardPrice)}</td>
                    <td><span className={`price-update-status ${item.status}`}>{STATUS_LABELS[item.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.length > 0 ? (
            <div className="price-update-errors">
              <h2>Строки, которые не будут обновлены</h2>
              {errors.map((item) => <p key={`error-${item.id || item.lineNumber}`}><code>{item.sku || `Строка ${item.lineNumber}`}</code>: {item.errorMessage || STATUS_LABELS[item.status]}</p>)}
            </div>
          ) : null}
          {result.batch.status === 'confirmed' ? <div className="price-update-alert success">Обновлено: {result.batch.updatedCount}. Пропущено: {result.batch.errorCount}.</div> : null}
        </>
      ) : null}
    </div>
  )
}
