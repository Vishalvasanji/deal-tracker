'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Building2, LayoutDashboard, CheckSquare, LogOut } from 'lucide-react'
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
  }

  return (
    <header className="border-b bg-card px-4 py-3 flex items-center gap-6">
      <span className="font-semibold text-sm tracking-tight text-foreground shrink-0">
        Deal Tracker
      </span>
      <nav className="flex items-center gap-1 flex-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              pathname === href || (href !== '/' && pathname.startsWith(href))
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <button
        onClick={logout}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  )
}
