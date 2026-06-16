'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@/types'
import { hasAdminAccess } from '@/lib/roles'

interface NavBarProps {
  user: User
}

const navItems = [
  { href: '/', label: 'Games', icon: '🎮' },
  { href: '/wallet', label: 'Wallet', icon: '💰' },
  { href: '/withdrawals', label: 'Withdraw', icon: '💳' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

export default function NavBar({ user }: NavBarProps) {
  const pathname = usePathname()
  const isAdmin = hasAdminAccess(user.role)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-gray-100/80 safe-area-bottom">
      <div className="flex justify-around items-center h-[72px] max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-14 py-1 group active:scale-95 transition-transform duration-100"
            >
              {isActive && (
                <span className="absolute -top-px w-8 h-[3px] rounded-full bg-gradient-to-r from-purple-500 to-purple-600 animate-fade-in" />
              )}
              <span
                className={`text-xl transition-all duration-200 ${
                  isActive ? 'scale-110 -translate-y-0.5' : 'group-hover:scale-105'
                }`}
              >
                {item.icon}
              </span>
              <span
                className={`mt-0.5 text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                  isActive ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className="relative flex flex-col items-center justify-center w-14 py-1 group active:scale-95 transition-transform duration-100"
          >
            {pathname.startsWith('/admin') && (
              <span className="absolute -top-px w-8 h-[3px] rounded-full bg-gradient-to-r from-purple-500 to-purple-600 animate-fade-in" />
            )}
            <span
              className={`text-xl transition-all duration-200 ${
                pathname.startsWith('/admin') ? 'scale-110 -translate-y-0.5' : 'group-hover:scale-105'
              }`}
            >
              ⚙️
            </span>
            <span
              className={`mt-0.5 text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                pathname.startsWith('/admin') ? 'text-purple-600' : 'text-gray-400 group-hover:text-gray-500'
              }`}
            >
              Admin
            </span>
          </Link>
        )}
      </div>
    </nav>
  )
}
