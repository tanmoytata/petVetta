import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'triage' | 'info' | 'premium'
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        {
          'bg-white rounded-xl shadow-sm p-4 border border-gray-100': variant === 'default',
          'bg-white rounded-xl shadow-md p-4 border-2 border-[#2980b9]': variant === 'triage',
          'bg-[#ecf0f1] rounded-xl p-4 border border-[#cccccc]/50': variant === 'info',
          'bg-white rounded-xl shadow-md p-4 border-2 border-[#f1c40f]': variant === 'premium',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface SkeletonCardProps {
  lines?: number
  className?: string
}

export function SkeletonCard({ lines = 3, className }: SkeletonCardProps) {
  return (
    <div className={cn('bg-white rounded-xl shadow-sm p-4 border border-gray-100', className)}>
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton h-4 rounded',
              i === 0 && 'w-3/4 h-5',
              i === lines - 1 && 'w-1/2'
            )}
          />
        ))}
      </div>
    </div>
  )
}
