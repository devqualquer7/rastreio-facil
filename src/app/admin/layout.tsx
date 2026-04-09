'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Package, Users, LayoutDashboard, LogOut, Menu, X, UserCog , LinkIcon} from 'lucide-react'
import { useState } from 'react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (pathname === '/admin/login') return <>{children}</>

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/admin/login')
    router.refresh()
  }

  const navItems = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/clients', icon: Users, label: 'Clientes' },
    { href: '/admin/tracking-codes', icon: Package, label: 'Rastreios' },
    { href: '/admin/users', icon: UserCog, label: 'Usuários' },
    { href: '/admin/generate-links', icon: LinkIcon, label: 'Gerar Links' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-56 bg-[#0f0f0f] border-r border-white/[0.06] flex flex-col
        transition-transform duration-200 md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:static md:flex
      `}>
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
              <Package className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-white tracking-tight">Rastreio</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <div className="md:hidden h-14 border-b border-white/[0.06] flex items-center justify-between px-4 bg-[#0f0f0f]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center">
              <Package className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm text-white">Rastreio</span>
          </div>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="text-zinc-400 hover:text-white">
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
