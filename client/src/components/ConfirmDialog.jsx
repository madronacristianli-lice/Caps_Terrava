import { useEffect, useRef } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'

export default function ConfirmDialog({
  open,
  title = 'Confirm action',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'brand',
  onConfirm,
  onCancel
}) {
  const confirmRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    confirmRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const isDanger = tone === 'danger'
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel()
    }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terrava-confirm-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDanger ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
            {isDanger ? <AlertTriangle className="h-5 w-5" /> : <Check className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="terrava-confirm-title" className="text-base font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">{message}</p>
          </div>
          <button type="button" onClick={onCancel} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close confirmation">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col-reverse gap-2 bg-slate-50 px-5 py-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
            {cancelLabel}
          </button>
          <button ref={confirmRef} type="button" onClick={onConfirm} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
