'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@/types'

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
  const isAdmin = user.role === 'admin' || user.role === 'super_admin'

  return (
    <nav style={{ backgroundColor: '#ede7e0' }} className="border-t border-gray-200 dark:border-gray-700 fixed bottom-0 left-0 right-0 z-50">
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center px-3 py-1 text-xs transition-colors ${
                isActive ? 'opacity-100' : 'opacity-50'
              }`}
              style={{ color: isActive ? '#0ca3db' : '#c39977' }}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          )
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={`flex flex-col items-center justify-center px-3 py-1 text-xs transition-colors ${
              pathname.startsWith('/admin') ? 'opacity-100' : 'opacity-50'
            }`}
            style={{ color: pathname.startsWith('/admin') ? '#0ca3db' : '#c39977' }}
          >
            <span className="text-lg">⚙️</span>
            <span className="mt-0.5">Admin</span>
          </Link>
        )}
      </div>
    </nav>
  )
}
