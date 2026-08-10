import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...rest }: InputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-neutral-700">{label}</span>}
      <input
        id={id}
        className={clsx(
          'h-12 rounded-xl border bg-white px-4 text-sm text-neutral-900 outline-none transition-colors',
          'placeholder:text-neutral-400 focus:border-primary-500',
          error ? 'border-danger' : 'border-neutral-200',
          className,
        )}
        {...rest}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  maxLength?: number
}

export function Textarea({ label, error, className, maxLength, value, ...rest }: TextareaProps) {
  const length = typeof value === 'string' ? value.length : 0
  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-neutral-700">{label}</span>}
      <textarea
        className={clsx(
          'min-h-[96px] resize-none rounded-xl border bg-white p-4 text-sm text-neutral-900 outline-none transition-colors',
          'placeholder:text-neutral-400 focus:border-primary-500',
          error ? 'border-danger' : 'border-neutral-200',
          className,
        )}
        maxLength={maxLength}
        value={value}
        {...rest}
      />
      <div className="flex justify-between text-xs text-neutral-400">
        <span>{error && <span className="text-danger">{error}</span>}</span>
        {maxLength && (
          <span>
            {length}/{maxLength}
          </span>
        )}
      </div>
    </label>
  )
}
