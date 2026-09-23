'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div
      className={cn('flex flex-col items-center gap-3', className)}
      role="status"
      aria-label={label ?? 'Loading'}
    >
      <div
        className={cn(
          'rounded-full border-4 border-gray-200 border-t-[#2980b9] animate-spin',
          sizes[size]
        )}
      />
      {label && <p className="text-sm text-[#555555]">{label}</p>}
    </div>
  )
}

export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <LoadingSpinner size="lg" label={message} />
    </div>
  )
}

export function InlineLoader({ message = 'Analyzing symptoms...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-[#ecf0f1] border-t-[#2980b9] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl">🐾</span>
        </div>
      </div>
      <p className="text-[14px] text-[#555555] animate-pulse">{message}</p>
    </div>
  )
}
