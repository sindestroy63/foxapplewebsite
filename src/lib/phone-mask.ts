'use client'

export function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '')

  let cleanDigits = digits
  if (cleanDigits.startsWith('8') && cleanDigits.length > 1) {
    cleanDigits = '7' + cleanDigits.slice(1)
  }

  if (!cleanDigits.startsWith('7') && cleanDigits.length > 0) {
    cleanDigits = '7' + cleanDigits
  }

  cleanDigits = cleanDigits.slice(0, 11)

  if (cleanDigits.length === 0) {
    return ''
  }

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

export function extractPhoneDigits(value: string): string {
  return value.replace(/\D/g, '')
}

export function handlePhoneInput(value: string): string {
  if (value.startsWith('+7') || value.startsWith('8') || value.startsWith('7')) {
    return formatPhoneMask(value)
  }
  return formatPhoneMask(value)
}