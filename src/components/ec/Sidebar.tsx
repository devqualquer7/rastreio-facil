'use client'
import { LayoutDashboard, Key, ScrollText, Wallet, LogOut, CreditCard, Users, Layers, ChevronsUpDown, Bell, Zap, ArrowRight, ChevronRight, QrCode } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/ec-utils'
import { useApp, Screen } from '@/lib/ec-store'

const MONO = "'JetBrains Mono', ui-monospace, Consolas, monospace"

function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <motion.img src="/logo.png" alt="enCrypteD" width={size} height={size} draggable={false}
      className="object-contain flex-shrink-0"
      style={{ filter: 'drop-shadow(0 0 8px rgba(255,43,74,.65))' }}
      animate={{ filter: ['drop-shadow(0 0 6px rgba(255,43,74,.55))', 'drop-shadow(0 0 14px rgba(255,43,74,.9))', 'drop-shadow(0 0 6px rgba(255,43,74,.55))'] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
  )
}

/** Marca desenhada para o atalho da UTMify (não é o logotipo oficial deles) */
function UtmifyMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 4v8a6 6 0 0 0 12 0V9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M14.5 7.5 18 4l3.5 3.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Sidebar() {
  const router = useRouter()
  const { screen, setScreen, openModal, activeCred, isAdmin, username } = useApp()

  const nav: { id: Screen; icon: any; label: string; adminOnly?: boolean }[] = [
    { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'credentials', icon: Key,             label: 'Credenciais' },
    { id: 'gateways',    icon: CreditCard,      label: 'Gateways PIX' },
    { id: 'extrato',     icon: Wallet,          label: 'Extrato MP' },
    { id: 'logs',        icon: ScrollText,      label: 'Logs' },
    { id: 'users',       icon: Users,           label: 'Usuários', adminOnly: true },
    { id: 'studio',      icon: Layers,          label: 'Studio' },
  ]

  async function logout() {
    await fetch('/api/ec/auth/logout', { method: 'POST' })
    router.push('/checkout/login'); router.refresh()
  }

  return (
    <aside className="hidden md:flex w-[240px] flex-shrink-0 flex-col relative z-10"
      style={{ borderRight: '1px solid #1c1c33', background: 'rgba(11,11,22,.3)', fontFamily: MONO }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 flex flex-col items-center">
        <LogoMark size={84} />
        <div className="mt-3 text-center">
          <div className="font-bold text-[14px] leading-none" style={{ letterSpacing: '0.14em' }}>
            <span style={{ color: '#e4e4f4' }}>ENCRYPTED</span><span style={{ color: '#ff2b4a' }}>SOFTWARE</span>
          </div>
          <div className="text-[11px] mt-1" style={{ color: '#52526e', letterSpacing: '0.2em' }}>CHECKOUT · MP</div>
        </div>
      </div>

      <div className="h-px mx-5" style={{ background: '#1c1c33' }} />

      {/* Ações rápidas */}
      <div className="p-3">
        <div className="ec-label px-2 pt-1 pb-2">Ações Rápidas</div>

        {/* Ação principal — a mais usada do painel, por isso é a única com cor cheia e brilho */}
        <button onClick={() => openModal('generate')}
          className="ec-shine ec-cta-live group w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-left text-black transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#00f5a3 0%,#00e396 45%,#00a06b 100%)' }}>
          <span className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(0,0,0,.22)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.25)' }}>
            <Zap size={19} fill="currentColor" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-black text-[15px] leading-tight" style={{ letterSpacing: '0.06em' }}>GERAR LINK</span>
            <span className="block text-[11px] font-semibold leading-tight mt-0.5" style={{ color: 'rgba(0,0,0,.62)' }}>Link ou Pix na hora</span>
          </span>
          <ArrowRight size={16} className="flex-shrink-0 transition-transform duration-150 group-hover:translate-x-1" />
        </button>

        {/* Ações secundárias — mesmo cartão neutro, só o ícone muda de cor */}
        <div className="mt-2.5 space-y-1.5">
          {([
            { id: 'saque',    label: 'Gerador de PIX', hint: 'Cobranças por gateway', color: '#ff2b4a',
              icon: <QrCode size={15} /> },
            { id: 'pushover', label: 'Notificações',   hint: 'Avisos no celular',     color: '#ffc83d',
              icon: <Bell size={15} /> },
            { id: 'utmify',   label: 'UTMify',         hint: 'Rastreio de vendas',    color: '#8b5cf6',
              icon: <UtmifyMark size={16} /> },
          ] as const).map(a => (
            <button key={a.id} onClick={() => openModal(a.id)}
              className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left border border-ec-line bg-ec-card2/50 hover:bg-ec-hover hover:border-ec-line-glow transition-all duration-150">
              <span className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: `${a.color}1f`, border: `1px solid ${a.color}55`, color: a.color }}>
                {a.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold leading-tight text-ec-text truncate">{a.label}</span>
                <span className="block text-[11px] leading-tight mt-0.5 text-ec-muted truncate">{a.hint}</span>
              </span>
              <ChevronRight size={14} className="flex-shrink-0 text-ec-muted opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150" />
            </button>
          ))}
        </div>
      </div>

      <div className="h-px mx-5" style={{ background: '#1c1c33' }} />

      {/* Navegação */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="ec-label px-2 pt-1 pb-1">Navegação</div>
        {nav.filter(it => !it.adminOnly || isAdmin).map(it => {
          const Icon = it.icon; const isActive = screen === it.id
          return (
            <button key={it.id} onClick={() => setScreen(it.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative"
              style={{ background: isActive ? 'rgba(255,43,74,.10)' : 'transparent', color: isActive ? '#ff2b4a' : '#9a9ab5' }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#11111f'; e.currentTarget.style.color = '#e4e4f4' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9a9ab5' } }}>
              {isActive && (
                <motion.div layoutId="ec-nav-active" className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
                  style={{ background: '#ff2b4a', boxShadow: '0 0 10px rgba(255,43,74,.5)' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
              )}
              <Icon size={15} className="flex-shrink-0" />
              <span style={{ letterSpacing: '0.02em' }}>{it.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="h-px mx-5" style={{ background: '#1c1c33' }} />

      {/* Conta ativa — atalho pra trocar de conta */}
      <div className="px-3 pt-2 pb-1">
        <button onClick={() => openModal('switch-account')}
          className="w-full rounded-lg p-2.5 text-left transition-all group"
          style={{ background: 'rgba(17,17,31,.5)', border: '1px solid #1c1c33' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a1a30'; e.currentTarget.style.background = '#15152a' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1c1c33'; e.currentTarget.style.background = 'rgba(17,17,31,.5)' }}
          title="Trocar de conta">
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-1.5 h-1.5 rounded-full" style={activeCred?.connected
              ? { background: '#00e396', boxShadow: '0 0 15px rgba(0,227,150,.3)' }
              : { background: '#2a2a42' }} />
            <div className="ec-label text-[11px]">Conta Ativa</div>
            <ChevronsUpDown size={11} className="ml-auto flex-shrink-0" style={{ color: '#52526e' }} />
          </div>
          <div className="flex items-center justify-between gap-2 ml-3.5">
            <span className="text-xs truncate" style={{ color: '#e4e4f4' }}>{activeCred?.name || 'Selecionar conta'}</span>
            <span className="text-[11px] font-mono flex-shrink-0 opacity-0 group-hover:opacity-100 transition" style={{ color: '#ff2b4a', letterSpacing: '0.1em' }}>TROCAR</span>
          </div>
        </button>
      </div>

      {/* Logado + sair */}
      <div className="p-3">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(17,17,31,.5)', border: '1px solid #1c1c33' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(to bottom right,#ff2b4a,#cc1b35)' }}>
            {username?.slice(0, 1).toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs" style={{ color: '#9a9ab5' }}>Logado</div>
            <div className="text-xs truncate" style={{ color: '#e4e4f4' }}>{username || '—'}</div>
          </div>
          <button onClick={logout} title="Sair" className="p-1 transition" style={{ color: '#52526e' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff2b4a')} onMouseLeave={e => (e.currentTarget.style.color = '#52526e')}>
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}

// Barra superior mobile
export function MobileTopBar() {
  const { screen, setScreen, openModal, isAdmin } = useApp()
  const router = useRouter()

  const nav: { id: Screen; icon: any; adminOnly?: boolean }[] = [
    { id: 'dashboard', icon: LayoutDashboard },
    { id: 'credentials', icon: Key },
    { id: 'gateways', icon: CreditCard },
    { id: 'extrato', icon: Wallet },
    { id: 'logs', icon: ScrollText },
    { id: 'users', icon: Users, adminOnly: true },
    { id: 'studio', icon: Layers },
  ]

  async function logout() {
    await fetch('/api/ec/auth/logout', { method: 'POST' })
    router.push('/checkout/login'); router.refresh()
  }

  return (
    <div className="md:hidden" style={{ fontFamily: MONO }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #1c1c33', background: 'rgba(11,11,22,.9)' }}>
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="w-6 h-6 object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(255,43,74,.65))' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <span className="font-bold text-[13px]"><span style={{ color: '#e4e4f4' }}>ENCRYPTED</span><span style={{ color: '#ff2b4a' }}>SOFTWARE</span></span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => openModal('generate')} className="px-3 py-1.5 rounded-lg text-black text-xs font-bold" style={{ background: 'linear-gradient(to right,#00e396,#00a06b)' }}>GERAR</button>
          <button onClick={logout} className="p-1.5 transition" style={{ color: '#52526e' }}><LogOut size={14} /></button>
        </div>
      </div>
      <div className="flex" style={{ borderBottom: '1px solid #1c1c33', background: '#0b0b16' }}>
        {nav.filter(it => !it.adminOnly || isAdmin).map(it => {
          const Icon = it.icon; const isActive = screen === it.id
          return (
            <button key={it.id} onClick={() => setScreen(it.id)} className="flex-1 py-3 flex items-center justify-center transition"
              style={{ color: isActive ? '#ff2b4a' : '#52526e', borderBottom: isActive ? '2px solid #ff2b4a' : '2px solid transparent' }}>
              <Icon size={18} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
