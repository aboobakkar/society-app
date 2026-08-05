import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// ============================================
// Button
// ============================================
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-amber-700 hover:bg-amber-800 text-white focus:ring-amber-600',
    secondary: 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 focus:ring-stone-400',
    danger: 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 focus:ring-red-400',
    ghost: 'hover:bg-stone-100 text-stone-600 focus:ring-stone-300',
  }
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-base' }

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} disabled={disabled || loading} {...props}>
      {loading ? <span className="animate-spin mr-2">⟳</span> : null}
      {children}
    </button>
  )
}

// ============================================
// Input
// ============================================
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, type, onFocus, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs text-stone-500 font-medium">{label}</label>}
      <input
        type={type}
        onFocus={(e) => {
          // Number fields (amounts) select their existing text on focus, so the
          // first keystroke replaces it instead of appending after a lingering '0'.
          if (type === 'number') e.target.select()
          onFocus?.(e)
        }}
        className={cn(
          'w-full px-3 py-2 text-sm border rounded-lg bg-white text-stone-900 placeholder:text-stone-400',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
          'border-stone-200',
          error && 'border-red-400 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-stone-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ============================================
// Select
// ============================================
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export function Select({ label, error, className, children, ...props }: SelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-xs text-stone-500 font-medium">{label}</label>}
      <select
        className={cn(
          'w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white text-stone-900',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
          error && 'border-red-400',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ============================================
// Card
// ============================================
export function Card({ children, className, padding = true }: { children: ReactNode; className?: string; padding?: boolean }) {
  return (
    <div className={cn('bg-white border border-stone-200 rounded-xl', padding && 'p-4 md:p-5', className)}>
      {children}
    </div>
  )
}

// ============================================
// Stat Card
// ============================================
export function StatCard({ label, value, sub, valueClass }: {
  label: string; value: string | number; sub?: string; valueClass?: string
}) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className={cn('text-2xl font-semibold text-stone-900', valueClass)}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  )
}

// ============================================
// Badge
// ============================================
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'cash' | 'online' | 'bank'

export function Badge({ text, variant = 'neutral' }: { text: string; variant?: BadgeVariant }) {
  const variants: Record<BadgeVariant, string> = {
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    neutral: 'bg-stone-100 text-stone-600 border-stone-200',
    cash: 'bg-amber-50 text-amber-700 border-amber-200',
    online: 'bg-blue-50 text-blue-700 border-blue-200',
    bank: 'bg-purple-50 text-purple-700 border-purple-200',
  }
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', variants[variant])}>
      {text}
    </span>
  )
}

// ============================================
// Page Header
// ============================================
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
        {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ============================================
// Modal
// ============================================
export function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-stone-200">
          <h2 className="font-semibold text-stone-900">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ============================================
// Empty State
// ============================================
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-12 text-center text-stone-400 text-sm">{message}</div>
  )
}

// ============================================
// Loading Spinner
// ============================================
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ============================================
// Confirm Dialog
// ============================================
export function ConfirmDialog({ open, message, onConfirm, onCancel }: {
  open: boolean; message: string; onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <p className="text-stone-800 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  )
}