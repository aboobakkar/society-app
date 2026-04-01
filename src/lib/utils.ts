import { format, parseISO } from 'date-fns'

// ============================================
// Currency
// ============================================
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

// ============================================
// Month helpers
// ============================================
const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTHS_ML = ['ജനുവരി','ഫെബ്രുവരി','മാർച്ച്','ഏപ്രിൽ','മേയ്','ജൂൺ','ജൂലൈ','ഓഗസ്റ്റ്','സെപ്തംബർ','ഒക്ടോബർ','നവംബർ','ഡിസംബർ']

export function formatMonth(yearMonth: string, lang: 'en' | 'ml' = 'en'): string {
  const [year, month] = yearMonth.split('-')
  const idx = parseInt(month) - 1
  const months = lang === 'ml' ? MONTHS_ML : MONTHS_EN
  return `${months[idx]} ${year}`
}

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function getMonthOptions(fromYear = 2023, toYear?: number): string[] {
  const now = new Date()
  // Never show future months by default
  const endYear = toYear ?? now.getFullYear()
  const endMonth = toYear ? 12 : now.getMonth() + 1
  const options: string[] = []
  for (let y = fromYear; y <= endYear; y++) {
    const lastMonth = y === endYear ? endMonth : 12
    for (let m = 1; m <= lastMonth; m++) {
      options.push(`${y}-${String(m).padStart(2, '0')}`)
    }
  }
  return options
}

export function getMonthsInYear(year: string): string[] {
  return Array.from({ length: 12 }, (_, i) =>
    `${year}-${String(i + 1).padStart(2, '0')}`
  )
}

export function isPastOrCurrentMonth(yearMonth: string): boolean {
  const current = getCurrentMonth()
  return yearMonth <= current
}

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return dateStr
  }
}

// ============================================
// Member ID
// ============================================
export function formatMemberId(num: number): string {
  return `SCY${String(num).padStart(3, '0')}`
}

// ============================================
// Translations helper
// ============================================
export function t(en: string, ml: string, lang: 'en' | 'ml'): string {
  return lang === 'ml' ? ml : en
}

// ============================================
// Class names helper (simple version)
// ============================================
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
