import { cn } from '@/lib/utils'
import { forwardRef } from 'react'
import { AlertCircle } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[14px] font-medium text-[#2c3e50]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full border border-gray-300 rounded-lg px-4 py-3 text-[14px] text-[#2c3e50] placeholder:text-gray-400',
            'focus:border-[#2980b9] focus:outline-none focus:ring-2 focus:ring-[#2980b9]/20 transition-colors',
            error && 'border-[#c0392b] focus:border-[#c0392b] focus:ring-[#c0392b]/20',
            'disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed',
            'min-h-[44px]',
            className
          )}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="flex items-center gap-1 text-[12px] text-[#c0392b]"
            role="alert"
          >
            <AlertCircle size={12} />
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-[12px] text-[#555555]">
            {hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  charCount?: { current: number; max: number }
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, charCount, className, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[14px] font-medium text-[#2c3e50]"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={ref}
            id={textareaId}
            className={cn(
              'w-full border border-gray-300 rounded-lg px-4 py-3 text-[14px] text-[#2c3e50] placeholder:text-gray-400 resize-none',
              'focus:border-[#2980b9] focus:outline-none focus:ring-2 focus:ring-[#2980b9]/20 transition-colors',
              error && 'border-[#c0392b] focus:border-[#c0392b] focus:ring-[#c0392b]/20',
              className
            )}
            aria-invalid={!!error}
            {...props}
          />
          {charCount && (
            <span className="absolute bottom-2 right-3 text-[11px] text-gray-400">
              {charCount.current}/{charCount.max}
            </span>
          )}
        </div>
        {error && (
          <p className="flex items-center gap-1 text-[12px] text-[#c0392b]" role="alert">
            <AlertCircle size={12} />
            {error}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
