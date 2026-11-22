import React, { useEffect, useState } from 'react'
import { useLedger } from '@/contexts/LedgerContext'
import { formatINR } from '@/lib/money'
import { RotateCcw, X, Check } from 'lucide-react'

export const UndoToast: React.FC = () => {
  const { lastRecordedTx, undoLastTransaction, dismissUndoToast, customers } = useLedger()
  const [secondsLeft, setSecondsLeft] = useState(6)
  const [isUndoing, setIsUndoing] = useState(false)
  const [undoneSuccess, setUndoneSuccess] = useState(false)

  useEffect(() => {
    if (!lastRecordedTx) {
      setSecondsLeft(6)
      setIsUndoing(false)
      setUndoneSuccess(false)
      return
    }

    setSecondsLeft(6)
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          dismissUndoToast()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [lastRecordedTx, dismissUndoToast])

  if (!lastRecordedTx) return null

  const customer = customers.find((c) => c.id === lastRecordedTx.customer_id)
  const isCredit = lastRecordedTx.type === 'CREDIT'

  const handleUndo = async () => {
    setIsUndoing(true)
    try {
      await undoLastTransaction()
      setUndoneSuccess(true)
      setTimeout(() => {
        dismissUndoToast()
      }, 1500)
    } catch (e) {
      console.error('Failed to undo transaction:', e)
    } finally {
      setIsUndoing(false)
    }
  }

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-bounce-subtle">
      <div className="bg-[#17233B] text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
            <span>{isCredit ? 'उधार दर्ज हुआ' : 'जमा दर्ज हुआ'}</span>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
              {secondsLeft}s
            </span>
          </div>
          <p className="text-sm font-semibold truncate text-white">
            {customer?.display_name || 'Grahak'}: {formatINR(lastRecordedTx.amount_paise)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleUndo}
            disabled={isUndoing || undoneSuccess}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            {undoneSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>वापस हो गया!</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>वापस लें (Undo)</span>
              </>
            )}
          </button>
          <button
            onClick={dismissUndoToast}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            title="बंद करें"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
