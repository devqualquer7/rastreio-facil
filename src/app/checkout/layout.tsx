'use client'
import { useEffect, useState, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface User { id: string; username: string; isAdmin: boolean; isBanned: boolean }

const UserCtx = createContext<User | null>(null)
export const useCheckoutUser = () => useContext(UserCtx)

const PUBLIC_PATHS = ['/checkout/login', '/checkout/register']

const NAV = [
  { href: '/checkout', label: 'Dashboard', icon: '⬛' },
  { href: '/checkout/gateways', label: 'Gateways', icon: '⚡' },
  { href: '/checkout/transactions', label: 'Transações', icon: '💳' },
  { href: '/checkout/withdrawals', label: 'Saques', icon: '↗' },
]

const ADMIN_NAV = [
  { href: '/checkout/admin/users', label: 'Usuários', icon: '👥' },
  { href: '/checkout/admin/keys', label: 'Chaves', icon: '🔑' },
]

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isPublic = PUBLIC_PATHS.includes(pathname)

  useEffect(() => {
    if (isPublic) { setLoading(false); return }
    fetch('/api/checkout/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { router.push('/checkout/login'); return }
        setUser(d)
      })
      .catch(() => router.push('/checkout/login'))
      .finally(() => setLoading(false))
  }, [pathname])

  async function logout() {
    await fetch('/api/checkout/auth/logout', { method: 'POST' })
    router.push('/checkout/login')
  }

  if (isPublic) return <>{children}</>

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <UserCtx.Provider value={user}>
      <div className="min-h-screen bg-[#0a0a0a] flex">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed inset-y-0 left-0 z-30 w-60 bg-[#0f0f0f] border-r border-white/[0.06]
          flex flex-col transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto
        `}>
          <div className="px-4 py-5 border-b border-white/[0.06]">
            <span className="text-sm font-semibold text-white">Checkout Panel</span>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                  ${pathname === item.href
                    ? 'bg-white/[0.08] text-white'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300'}
                `}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            ))}

            {user.isAdmin && (
              <>
                <div className="pt-4 pb-1 px-3">
                  <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider">Admin</span>
                </div>
                {ADMIN_NAV.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`
                      flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                      ${pathname.startsWith(item.href)
                        ? 'bg-white/[0.08] text-white'
                        : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300'}
                    `}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>

          <div className="px-3 py-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white">
                {user.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{user.username}</p>
                {user.isAdmin && <p className="text-[10px] text-zinc-500">Admin</p>}
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#0f0f0f]">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <span className="text-sm font-medium text-white">Checkout Panel</span>
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </UserCtx.Provider>
  )
}
