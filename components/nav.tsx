'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Building2, CheckSquare, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Board', icon: LayoutDashboard },
  { href: '/deals', label: 'Deals', icon: Building2 },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
]

export function Nav() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-black/[0.06]">
      <div className="max-w-[1400px] mx-auto px-4 h-12 flex items-center gap-6">
        {/* Logo */}
        <span className="text-sm font-semibold tracking-tight text-foreground shrink-0 select-none">
          Deal Tracker
        </span>

        {/* Nav links */}
        <nav className="flex items-center gap-0.5 flex-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 select-none',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-black/[0.04]'
                )}
              >
                <Icon className="h-[15px] w-[15px]" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 select-none"
        >
          <LogOut className="h-[15px] w-[15px]" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}
