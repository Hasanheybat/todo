// Sadə natural language date parser — Azərbaycan + Türk dili
// "bugün", "sabah", "gələn həftə", "cümə", "3 gün sonra" kimi ifadələri parse edir
// Saat dəstəyi: "sabah saat 3-də", "cümə 14:00", "bugün 9:30"

const DAY_NAMES: Record<string, number> = {
  'bazar': 0, 'bazar ertəsi': 1, 'çərşənbə axşamı': 2, 'çərşənbə': 3,
  'cümə axşamı': 4, 'cümə': 5, 'şənbə': 6,
  // Qısa formlar
  'b.e': 1, 'ç.a': 2, 'ç': 3, 'c.a': 4, 'c': 5, 'ş': 6, 'b': 0,
  // Türk
  'pazartesi': 1, 'salı': 2, 'çarşamba': 3, 'perşembe': 4, 'cuma': 5, 'cumartesi': 6, 'pazar': 0,
}

interface ParseResult {
  date: string      // YYYY-MM-DD
  hour?: number     // 0-23
  minute?: number   // 0-59
}

// Saat ifadəsini parse et
function extractTime(text: string): { cleanText: string; hour?: number; minute?: number } {
  // "saat 3-də", "saat 3:30-da", "saat 14", "saat 9:00"
  const saatMatch = text.match(/saat\s+(\d{1,2})(?::(\d{2}))?(?:-[dD][əeaA])?/i)
  if (saatMatch) {
    const hour = parseInt(saatMatch[1])
    const minute = saatMatch[2] ? parseInt(saatMatch[2]) : 0
    const cleanText = text.replace(/\s*saat\s+\d{1,2}(?::\d{2})?(?:-[dD][əeaA])?\s*/i, ' ').trim()
    return { cleanText, hour: hour <= 23 ? hour : undefined, minute }
  }

  // "14:00", "9:30" — birbaşa saat formatı
  const timeMatch = text.match(/(\d{1,2}):(\d{2})/)
  if (timeMatch) {
    const hour = parseInt(timeMatch[1])
    const minute = parseInt(timeMatch[2])
    const cleanText = text.replace(/\s*\d{1,2}:\d{2}\s*/, ' ').trim()
    return { cleanText, hour: hour <= 23 ? hour : undefined, minute }
  }

  return { cleanText: text }
}

export function parseDateString(input: string): string | null {
  const text = input.toLowerCase().trim()
  const result = parseDateWithTime(text)
  return result ? result.date : null
}

export function parseDateWithTime(input: string): ParseResult | null {
  const text = input.toLowerCase().trim()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Əvvəlcə saat hissəsini ayır
  const { cleanText, hour, minute } = extractTime(text)
  const dateText = cleanText || text

  const makeResult = (d: Date): ParseResult => ({
    date: toDateStr(d),
    ...(hour !== undefined && { hour, minute: minute || 0 }),
  })

  // "bugün" / "bu gün"
  if (dateText === 'bugün' || dateText === 'bu gün') return makeResult(today)

  // "sabah" / "yarın"
  if (dateText === 'sabah' || dateText === 'yarın') {
    const d = new Date(today); d.setDate(d.getDate() + 1); return makeResult(d)
  }

  // "birigün" / "öbürgün"
  if (dateText === 'birigün' || dateText === 'öbürgün' || dateText === 'öbür gün') {
    const d = new Date(today); d.setDate(d.getDate() + 2); return makeResult(d)
  }

  // "gələn həftə" / "gelecek hafta"
  if (dateText === 'gələn həftə' || dateText === 'gelecek hafta' || dateText === 'gelen hafta') {
    const d = new Date(today); d.setDate(d.getDate() + 7); return makeResult(d)
  }

  // "bu həftəsonu" / "hafta sonu"
  if (dateText === 'bu həftəsonu' || dateText === 'həftəsonu' || dateText === 'hafta sonu') {
    const d = new Date(today)
    const dow = d.getDay()
    const diff = dow === 6 ? 0 : dow === 0 ? 0 : 6 - dow
    d.setDate(d.getDate() + diff)
    return makeResult(d)
  }

  // "N gün sonra" / "N gün"
  const daysMatch = dateText.match(/^(\d+)\s*(gün|gun)\s*(sonra)?$/)
  if (daysMatch) {
    const d = new Date(today); d.setDate(d.getDate() + parseInt(daysMatch[1])); return makeResult(d)
  }

  // "N həftə sonra"
  const weeksMatch = dateText.match(/^(\d+)\s*(həftə|hafta)\s*(sonra)?$/)
  if (weeksMatch) {
    const d = new Date(today); d.setDate(d.getDate() + parseInt(weeksMatch[1]) * 7); return makeResult(d)
  }

  // "N ay sonra"
  const monthsMatch = dateText.match(/^(\d+)\s*(ay)\s*(sonra)?$/)
  if (monthsMatch) {
    const d = new Date(today); d.setMonth(d.getMonth() + parseInt(monthsMatch[1])); return makeResult(d)
  }

  // Gün adı — "cümə", "bazar ertəsi"
  for (const [name, dow] of Object.entries(DAY_NAMES)) {
    if (dateText === name || dateText === `gələn ${name}`) {
      const d = new Date(today)
      const currentDow = d.getDay()
      let diff = dow - currentDow
      if (diff <= 0) diff += 7
      d.setDate(d.getDate() + diff)
      return makeResult(d)
    }
  }

  return null // parse olunmadı
}

function toDateStr(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
