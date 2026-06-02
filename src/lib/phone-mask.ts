'use client'

/**
 * Форматирует номер телефона в маску +7 (999) 999-99-99
 * Принимает строку с цифрами и возвращает отформатированную строку
 */
export function formatPhoneMask(value: string): string {
  // Извлекаем только цифры
  const digits = value.replace(/\D/g, '')

  // Если начинается с 8, заменяем на 7
  let cleanDigits = digits
  if (cleanDigits.startsWith('8') && cleanDigits.length > 1) {
    cleanDigits = '7' + cleanDigits.slice(1)
  }

  // Если не начинается с 7, добавляем 7 в начало
  if (!cleanDigits.startsWith('7') && cleanDigits.length > 0) {
    cleanDigits = '7' + cleanDigits
  }

  // Ограничиваем до 11 цифр (7 + 10 цифр номера)
  cleanDigits = cleanDigits.slice(0, 11)

  if (cleanDigits.length === 0) {
    return ''
  }

  // Форматируем по маске
  let formatted = '+7'

  if (cleanDigits.length > 1) {
    formatted += ' (' + cleanDigits.slice(1, 4)
  }
  if (cleanDigits.length >= 4) {
    formatted += ') ' + cleanDigits.slice(4, 7)
  }
  if (cleanDigits.length >= 7) {
    formatted += '-' + cleanDigits.slice(7, 9)
  }
  if (cleanDigits.length >= 9) {
    formatted += '-' + cleanDigits.slice(9, 11)
  }

  return formatted
}

/**
 * Извлекает только цифры из номера телефона
 */
export function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Обрабатывает ввод в поле телефона
 * Возвращает отформатированное значение для отображения
 */
export function handlePhoneInput(value: string): string {
  // Если пользователь вставил полный номер, форматируем его
  if (value.startsWith('+7') || value.startsWith('8') || value.startsWith('7')) {
    return formatPhoneMask(value)
  }
  // Иначе добавляем +7 и форматируем
  return formatPhoneMask(value)
}