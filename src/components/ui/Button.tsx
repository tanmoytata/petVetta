import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const variantClasses = {
  primary: 'bg-[#2980b9] hover:bg-blue-700 text-white',
  secondary: 'border-2 border-[#2980b9] text-[#2980b9] hover:bg-blue-50 bg-transparent',
  danger: 'bg-[#c0392b] hover:bg-red-800 text-white',
  success: 'bg-[#27ae60] hover:bg-green-700 text-white',
  ghost: 'bg-transparent text-[#2c3e50] hover:bg-gray-100',
}

const sizeClasses = {
  sm: 'h-[36px] px-4 text-sm',
  md: 'h-[44px] px-5 text-[15px]',
  lg: 'h-[52px] px-6 text-[15px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-[24px] transition-colors duration-100 min-w-[44px] disabled:bg-[#cccccc] disabled:text-[#999999] disabled:cursor-not-allowed disabled:border-0',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}
