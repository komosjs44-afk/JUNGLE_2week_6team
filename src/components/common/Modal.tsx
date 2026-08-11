import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
}

/** 하단 시트 형태의 모달. 배경을 누르면 onClose(있으면) 호출. */
export function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-2xl bg-white p-6 pb-8 sm:rounded-2xl sm:pb-6"
      >
        {children}
      </div>
    </div>
  )
}
