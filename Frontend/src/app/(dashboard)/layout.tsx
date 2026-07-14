'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Layers,
  FileText,
  BookOpen,
  Settings,
  LogOut,
  Users,
  Database,
  BarChart3,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'sme', 'intern'] },
  { href: '/batches', label: 'Batches', icon: Layers, roles: ['super_admin', 'admin', 'intern'] },
  { href: '/coverage', label: 'Coverage', icon: BarChart3, roles: ['super_admin', 'admin', 'intern'] },
  { href: '/review', label: 'Review Queue', icon: FileText, roles: ['super_admin', 'admin', 'sme'] },
  { href: '/prompts', label: 'Prompt Library', icon: BookOpen, roles: ['super_admin', 'admin'] },
  { href: '/master', label: 'Master Data', icon: Database, roles: ['super_admin', 'admin'] },
  { href: '/users', label: 'Users', icon: Users, roles: ['super_admin'] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'admin'] },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout, refreshSession } = useAuth()

  useEffect(() => {
    if (!user) {
      refreshSession().then((ok) => {
        if (!ok) router.replace('/login')
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  const visibleNav = navItems.filter(
    (item) => !user || item.roles.includes(user.role),
  )

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-brand text-white flex flex-col">
        <div className="px-5 py-6 border-b border-white/10">
          <h1 className="font-bold text-lg leading-tight">Question Factory</h1>
          {user && (
            <p className="text-white/60 text-xs mt-1 truncate">{user.name}</p>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          {user && (
            <div className="mb-2 px-3 py-2">
              <p className="text-white/80 text-xs uppercase tracking-wider">{user.role.replace('_', ' ')}</p>
              <p className="text-white/60 text-xs truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
