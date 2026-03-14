'use client'
import { useState, useEffect } from 'react'
import { MapPin, Package, RefreshCw, LogOut, Menu, X, AlertTriangle, Clock } from 'lucide-react'
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

  const nav = [
    { href: '/dashboard', label: 'Meus Rastreios', Icon: Package },
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

        <div className="p-3 border-t" style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
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
            <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium mt-2" style={{ color: '#64748b' }}>
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
                color: isExpired ? '#fca5a5' : '#fdba74',
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
    </div>
  )
}
