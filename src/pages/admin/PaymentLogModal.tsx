import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PaymentLog } from '@/types'
import { Modal } from '@/components/ui'
import { formatDate } from '@/lib/utils'
import { History, CheckCircle, Edit2, Trash2 } from 'lucide-react'

interface Props {
  paymentId: string | null
  open: boolean
  onClose: () => void
}

export function PaymentLogModal({ paymentId, open, onClose }: Props) {
  const [logs, setLogs] = useState<PaymentLog[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!paymentId || !open) return
    setLoading(true)
    supabase
      .from('payment_logs')
      .select('*')
      .eq('payment_id', paymentId)
      .order('changed_at', { ascending: false })
      .then(({ data }) => {
        setLogs(data || [])
        setLoading(false)
      })
  }, [paymentId, open])

  const actionIcon = (action: string) => {
    if (action === 'created') return <CheckCircle size={14} className="text-green-500" />
    if (action === 'updated') return <Edit2 size={14} className="text-amber-500" />
    return <Trash2 size={14} className="text-red-500" />
  }

  const actionColor = (action: string) => {
    if (action === 'created') return 'text-green-700 bg-green-50 border-green-200'
    if (action === 'updated') return 'text-amber-700 bg-amber-50 border-amber-200'
    return 'text-red-700 bg-red-50 border-red-200'
  }

  return (
    <Modal open={open} onClose={onClose} title="Payment History">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-4">
          <History size={14} />
          <span>Full audit trail for this payment record</span>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-stone-400 py-4 text-center">No history found</p>
        ) : (
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="border border-stone-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {actionIcon(log.action)}
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${actionColor(log.action)}`}>
                      {log.action}
                    </span>
                  </div>
                  <span className="text-xs text-stone-400">
                    {new Date(log.changed_at).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs text-stone-600 space-y-1">
                  <div className="flex gap-2">
                    <span className="text-stone-400 w-20 flex-shrink-0">By:</span>
                    <span className="font-medium">{log.changed_by_name || 'Unknown'}</span>
                  </div>
                  {log.amount && (
                    <div className="flex gap-2">
                      <span className="text-stone-400 w-20 flex-shrink-0">Amount:</span>
                      <span>₹{log.amount}</span>
                    </div>
                  )}
                  {log.month && (
                    <div className="flex gap-2">
                      <span className="text-stone-400 w-20 flex-shrink-0">Month:</span>
                      <span>{log.month}</span>
                    </div>
                  )}
                  {log.method && (
                    <div className="flex gap-2">
                      <span className="text-stone-400 w-20 flex-shrink-0">Method:</span>
                      <span className="capitalize">{log.method}</span>
                    </div>
                  )}

                  {/* Show what changed for updates */}
                  {log.action === 'updated' && log.old_data && log.new_data && (
                    <div className="mt-2 pt-2 border-t border-stone-100">
                      <p className="text-stone-400 mb-1">Changes:</p>
                      {Object.keys(log.new_data).map(key => {
                        const oldVal = log.old_data![key]
                        const newVal = log.new_data![key]
                        if (oldVal === newVal || ['id','created_at'].includes(key)) return null
                        return (
                          <div key={key} className="flex gap-2 text-xs">
                            <span className="text-stone-400 capitalize">{key.replace(/_/g,' ')}:</span>
                            <span className="line-through text-red-400">{String(oldVal)}</span>
                            <span>→</span>
                            <span className="text-green-600">{String(newVal)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
