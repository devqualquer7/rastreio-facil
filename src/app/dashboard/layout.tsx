'use client'
import { useState, useEffect } from 'react'
import { MapPin, Package, RefreshCw, LogOut, Menu, X, AlertTriangle, Clock, Headphones, MessageCircle, LayoutDashboard, Users, Zap } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

interface UserInfo {
  id: string; username: string; email?: string
  expiresAt?: string; trackingLimit: number; trackingUsed: number
  active: number; daysLeft: number | null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/user/me').then(r => r.json()).then(d => {
      if (d.error) router.push('/login')
      else setUser(d)
    }).catch(() => router.push('/login'))
  }, [router])

  const logout = async () => {
    await fetch('/api/user/logout', { method: 'POST' })
    router.push('/login')
  }

  const DISCORD_URL = 'https://discord.gg/VAHMyYGEeU'

  const nav = [
    { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { href: '/dashboard/clientes', label: 'Clientes', Icon: Users },
    { href: '/dashboard/rastreios', label: 'Rastreios', Icon: Package },
    { href: '/dashboard/automacao', label: 'Automação', Icon: Zap },
    { href: '/dashboard/renovar', label: 'Renovar / Planos', Icon: RefreshCw },
  ]

  const isExpiringSoon = user?.daysLeft !== null && user?.daysLeft !== undefined && user.daysLeft <= 7 && user.daysLeft > 0
  const isExpired = user?.daysLeft !== null && user?.daysLeft !== undefined && user.daysLeft <= 0

  return (
    <div className="min-h-screen flex" style={{ background: '#06060f', color: '#e2e8f0' }}>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0" style={{ background: '#09090f', borderRight: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-white text-sm">Rastreio<span style={{ color: '#818cf8' }}>Fácil</span></span>
          </a>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 mx-3 mt-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <p className="text-xs font-semibold text-white">{user.username}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{user.trackingUsed}/{user.trackingLimit} rastreios</p>
            {user.expiresAt && (
              <p className="text-xs mt-0.5" style={{ color: isExpired ? '#ef4444' : isExpiringSoon ? '#f97316' : '#64748b' }}>
                {isExpired ? '⛔ Expirado' : `Expira em ${user.daysLeft}d`}
              </p>
            )}
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, label, Icon }) => (
            <a key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: pathname === href ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: pathname === href ? '#a5b4fc' : '#94a3b8',
                border: pathname === href ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
              }}>
              <Icon className="w-4 h-4" /> {label}
            </a>
          ))}
        </nav>

        <div className="p-3 border-t space-y-1" style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
          <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#818cf8' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = '#a5b4fc' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#818cf8' }}>
            <Headphones className="w-4 h-4" /> Suporte
          </a>
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: '#64748b' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ background: 'rgba(9,9,15,0.95)', borderBottom: '1px solid rgba(99,102,241,0.12)', backdropFilter: 'blur(10px)' }}>
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
            <MapPin className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-white text-sm">Rastreio<span style={{ color: '#818cf8' }}>Fácil</span></span>
        </a>
        <button onClick={() => setMobileOpen(p => !p)} style={{ color: '#94a3b8' }}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 pt-14" style={{ background: '#09090f' }}>
          <nav className="px-4 py-4 space-y-1">
            {nav.map(({ href, label, Icon }) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
                style={{ background: pathname === href ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', color: pathname === href ? '#a5b4fc' : '#94a3b8' }}>
                <Icon className="w-4 h-4" /> {label}
              </a>
            ))}
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium mt-2"
              style={{ background: 'rgba(99,102,241,0.08)', color: '#818cf8' }}>
              <Headphones className="w-4 h-4" /> Suporte (Discord)
            </a>
            <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium mt-1" style={{ color: '#64748b' }}>
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </nav>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:overflow-auto">
        <div className="md:hidden h-14" />

        {/* Banners de expiração */}
        {(isExpiringSoon || isExpired) && (
          <div className="px-4 pt-4">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl text-sm font-semibold"
              style={{
                background: isExpired ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
                border: `1px solid ${isExpired ? 'rgba(239,68,68,0.3)' : 'rgba(249,115,22,0.3)'}`,
                color: isExpired? '#fca5a5' : '#fdba74',
              }}>
              {isExpired ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <Clock className="w-4 h-4 flex-shrink-0" />}
              {isExpired
                ? '⛔ Sua assinatura expirou. Renove agora para continuar criando rastreios.'
                : `⚠️ Sua assinatura expira em ${user?.daysLeft} dia${user?.daysLeft === 1 ? '' : 's'}. Renove para não perder o acesso.`}
              <a href="/dashboard/renovar" className="ml-auto flex-shrink-0 underline font-bold">Renovar agora</a>
            </div>
          </div>
        )}

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Botão flutuante de suporte Discord */}
      <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-40 group flex items-center gap-2 pl-4 pr-5 py-3 rounded-full text-white text-sm font-semibold shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #5865F2, #4752C4)',
          boxShadow: '0 4px 20px rgba(88,101,242,0.4), 0 0 40px rgba(88,101,242,0.15)',
        }}>
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
        </svg>
        <span className="hidden sm:inline">Suporte</span>
      </a>
    </div>
  )
}
