'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PawPrint, Stethoscope, Heart, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: 'Home',   href: '/',        icon: Home         },
  { label: 'Pets',   href: '/pets',    icon: PawPrint     },
  { label: 'Triage', href: '/triage',  icon: Stethoscope  },
  { label: 'Health', href: '/health',  icon: Heart        },
  { label: 'Profile',href: '/profile', icon: User         },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-[#1a2e4a] flex justify-around items-center h-[60px] z-50 border-t border-[#2c3e50]"
      aria-label="Main navigation"
    >
      {tabs.map(({ label, href, icon: Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] flex-1 transition-colors',
              isActive ? 'text-[#16a085]' : 'text-gray-400 hover:text-gray-200',
              // Triage tab is slightly larger
              label === 'Triage' && 'relative'
            )}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
          >
            {label === 'Triage' ? (
              <div className="flex flex-col items-center">
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center -mt-4',
                  isActive ? 'bg-[#16a085]' : 'bg-[#2980b9]'
                )}>
                  <Icon size={22} className="text-white" />
                </div>
                <span className="text-[10px] mt-0.5">{label}</span>
              </div>
            ) : (
              <>
                <Icon size={20} />
                <span className="text-[10px]">{label}</span>
              </>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
