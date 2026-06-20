'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Role } from '@/types'
import clsx from 'clsx'

interface NavItem {
  href: string
  label: string
  icon: string
  roles: Role[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Аналитика', icon: '📊', roles: ['owner'] },
  { href: '/dashboard/expenses', label: 'Расходы', icon: '💸', roles: ['owner'] },
  { href: '/parcels', label: 'Накладные', icon: '📦', roles: ['owner', 'employee'] },
  { href: '/parcels/upload', label: 'Загрузить', icon: '⬆️', roles: ['owner', 'employee'] },
  { href: '/clients', label: 'Клиенты', icon: '👥', roles: ['owner', 'employee'] },
  { href: '/track', label: 'Мои посылки', icon: '🔍', roles: ['client'] },
]

interface SidebarProps {
  role: Role
  userPhone?: string
}

export default function Sidebar({ role, userPhone }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const filtered = navItems.filter(item => item.roles.includes(role))

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleLabels: Record<Role, string> = {
    owner: 'Владелец',
    employee: 'Сотрудник',
    client: 'Клиент',
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center font-bold text-sm">
            BP
          </div>
          <div>
            <div className="font-bold text-sm">Baraka Pochta</div>
            <div className="text-xs text-gray-400">{roleLabels[role]}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {filtered.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                ? 'bg-indigo-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User info + Sign out */}
      <div className="p-4 border-t border-gray-700">
        {userPhone && (
          <div className="text-xs text-gray-400 mb-3 px-1">{userPhone}</div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <span>🚪</span>
          Выйти
        </button>
      </div>
    </aside>
  )
}
