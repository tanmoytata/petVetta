'use client'

import Link from 'next/link'
import { ArrowLeft, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store'
import { getInitials } from '@/lib/utils'

interface TopHeaderProps {
  title?: string
  showBack?: boolean
  backHref?: string
  rightSlot?: React.ReactNode
  transparent?: boolean
}

export function TopHeader({
  title,
  showBack = false,
  backHref,
  rightSlot,
  transparent = false,
}: TopHeaderProps) {
  const { profile } = useAuthStore()

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 max-w-[480px] mx-auto h-[56px] flex items-center justify-between px-4 z-40',
        transparent ? 'bg-transparent' : 'bg-white border-b border-gray-100 shadow-sm'
      )}
    >
      <div className="flex items-center gap-3">
        {showBack ? (
          <Link
            href={backHref ?? '#'}
            onClick={backHref ? undefined : () => window.history.back()}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-[#2c3e50]" />
          </Link>
        ) : (
          <span className="font-bold text-[18px] text-[#1a2e4a]">
            pet<span className="text-[#16a085]">Vetta</span>
          </span>
        )}
        {title && (
          <h1 className="text-[16px] font-semibold text-[#2c3e50]">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {rightSlot}
        {!rightSlot && (
          <>
            <button
              className="p-2 rounded-full hover:bg-gray-100 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-[#2c3e50]" />
            </button>
            <Link
              href="/profile"
              className="w-9 h-9 rounded-full bg-[#1a2e4a] flex items-center justify-center text-white text-sm font-semibold"
              aria-label="Profile"
            >
              {profile?.full_name ? getInitials(profile.full_name) : <User size={16} />}
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
