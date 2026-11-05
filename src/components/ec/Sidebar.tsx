'use client'
import { useState } from 'react'
import { LayoutDashboard, Key, ScrollText, Wallet, LogOut, CreditCard, Users, Layers, ChevronsUpDown, Bell, Zap, ArrowRight, ChevronRight, QrCode, Menu, HandCoins, Coins } from 'lucide-react'
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

/** Logo da UTMify: as duas peças brancas do "U" com o canto azul */
function UtmifyMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="utmify-corner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3aa0ff" /><stop offset="1" stopColor="#0b5fe0" />
        </linearGradient>
      </defs>
      <path d="M4 4h5a1 1 0 0 1 1 1v7h3v4H7a3 3 0 0 1-3-3z" fill="#f2f2f7" />
      <path d="M14 4h6v14a4 4 0 0 1-4 4h-5v-4h3z" fill="#f2f2f7" />
      <path d="M16.6 4H20v3.4z" fill="url(#utmify-corner)" />
    </svg>
  )
}

export function Sidebar() {
  const router = useRouter()
  const { screen, setScreen, openModal, activeCred, isAdmin, username } = useApp()

  const nav: { id: Screen; icon: any; label: string; adminOnly?: boolean; userOnly?: boolean }[] = [
    { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'repasses',    icon: HandCoins,       label: 'Repasses', adminOnly: true },
    { id: 'ganhos',      icon: Coins,           label: 'Meus ganhos', userOnly: true },
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
      <div className="px-5 pt-5 pb-4 flex flex-col items-center">
        <LogoMark size={68} />
        <div className="mt-3 text-center">
          <div className="font-bold text-[14px] leading-none" style={{ letterSpacing: '0.14em' }}>
            <span style={{ color: '#e4e4f4' }}>ENCRYPTED</span><span style={{ color: '#ff2b4a' }}>SOFTWARE</span>
          </div>
          <div className="text-[11px] mt-1" style={{ color: '#52526e', letterSpacing: '0.2em' }}>CHECKOUT · MP</div>
        </div>
      </div>

      <div className="h-px mx-5" style={{ background: '#1c1c33' }} />

      {/* Ações rápidas */}
      <div className="px-3 pt-3 pb-3.5">
        {/* Ação principal — a mais usada do painel, por isso é a única com cor cheia */}
        <button onClick={() => openModal('generate')}
          className="ec-shine ec-cta-live group w-full h-[52px] flex items-center gap-3 pl-3 pr-3.5 rounded-xl text-left text-black transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg,#00f5a3 0%,#00e396 50%,#00b578 100%)' }}>
          <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,0,0,.16)' }}>
            <Zap size={16} fill="currentColor" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block font-extrabold text-[14px] leading-none" style={{ letterSpacing: '0.04em' }}>Gerar link</span>
            <span className="block text-[11px] font-semibold leading-none mt-1" style={{ color: 'rgba(0,0,0,.55)' }}>Link ou Pix</span>
          </span>
          <ArrowRight size={15} className="flex-shrink-0 opacity-70 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>

        {/* Ações secundárias — três atalhos lado a lado, só o ícone tem cor */}
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {([
            { id: 'saque',    label: 'Pix',    hint: 'Gerador de Pix por gateway', color: '#ff2b4a', icon: <QrCode size={16} /> },
            { id: 'pushover', label: 'Avisos', hint: 'Notificações no celular',    color: '#ffc83d', icon: <Bell size={16} /> },
            { id: 'utmify',   label: 'UTMify', hint: 'Rastreio de vendas',         color: '#3b82f6', icon: <UtmifyMark size={18} /> },
          ] as const).map(a => (
            <button key={a.id} onClick={() => openModal(a.id)} title={a.hint}
              className="group h-[62px] flex flex-col items-center justify-center gap-1.5 rounded-xl border border-ec-line bg-ec-card2/40 hover:bg-ec-hover hover:border-ec-line-glow active:scale-[0.97] transition-all duration-150">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-150 group-hover:-translate-y-0.5"
                style={{ background: `${a.color}1a`, color: a.color }}>
                {a.icon}
              </span>
              <span className="text-[11px] font-bold leading-none text-ec-dim group-hover:text-ec-text transition-colors">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px mx-5" style={{ background: '#1c1c33' }} />

      {/* Navegação */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="ec-label px-2 pt-1 pb-1">Navegação</div>
        {nav.filter(it => (it.adminOnly ? isAdmin : it.userOnly ? !isAdmin : true)).map(it => {
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

// ── Celular: barra superior + navegação inferior ─────────────────────────────
// No celular a sidebar some; estas duas barras dão acesso a TUDO o que ela tem.

export function MobileTopBar() {
  const { openModal, activeCred } = useApp()
  return (
    <div className="md:hidden flex items-center gap-2.5 px-3.5 py-2.5 flex-shrink-0 relative z-20"
      style={{ borderBottom: '1px solid #1c1c33', background: 'rgba(11,11,22,.92)', fontFamily: MONO }}>
      <img src="/logo.png" alt="" className="w-8 h-8 object-contain flex-shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(255,43,74,.65))' }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
      <div className="font-bold text-[13px] leading-none flex-shrink-0" style={{ letterSpacing: '0.1em' }}>
        <span style={{ color: '#e4e4f4' }}>ENCRYPTED</span><span style={{ color: '#ff2b4a' }}>SOFTWARE</span>
      </div>
      {/* Conta ativa — toque para trocar */}
      <button onClick={() => openModal('switch-account')}
        className="ml-auto min-w-0 flex items-center gap-2 pl-2.5 pr-2 h-9 rounded-lg border border-ec-line bg-ec-card2 active:scale-95"
        title="Trocar de conta">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={activeCred?.connected
          ? { background: '#00e396', boxShadow: '0 0 8px rgba(0,227,150,.6)' } : { background: '#52526e' }} />
        <span className="text-xs font-bold text-ec-text truncate max-w-[110px]">{activeCred?.name || 'Sem conta'}</span>
        <ChevronsUpDown size={12} className="text-ec-muted flex-shrink-0" />
      </button>
    </div>
  )
}

export function MobileBottomNav() {
  const { screen, setScreen, openModal, isAdmin, username } = useApp()
  const router = useRouter()
  const [more, setMore] = useState(false)

  async function logout() {
    await fetch('/api/ec/auth/logout', { method: 'POST' })
    router.push('/checkout/login'); router.refresh()
  }

  const tabs: { id: Screen; icon: any; label: string }[] = [
    { id: 'dashboard',   icon: LayoutDashboard, label: 'Início' },
    { id: 'extrato',     icon: Wallet,          label: 'Extrato' },
  ]
  const tabsRight: { id: Screen; icon: any; label: string }[] = [
    isAdmin
      ? { id: 'repasses', icon: HandCoins, label: 'Repasses' }
      : { id: 'ganhos',   icon: Coins,     label: 'Ganhos' },
  ]
  const moreScreens: { id: Screen; icon: any; label: string; adminOnly?: boolean }[] = [
    { id: 'credentials', icon: Key,     label: 'Contas' },
    { id: 'gateways', icon: CreditCard, label: 'Gateways PIX' },
    { id: 'logs',     icon: ScrollText, label: 'Logs' },
    { id: 'users',    icon: Users,      label: 'Usuários', adminOnly: true },
  ]
  const inMore = moreScreens.some(s => s.id === screen)

  const Tab = ({ id, icon: Icon, label }: { id: Screen; icon: any; label: string }) => (
    <button onClick={() => { setScreen(id); setMore(false) }}
      className="flex flex-col items-center gap-1 py-1.5 transition"
      style={{ color: screen === id ? '#ff2b4a' : '#52526e' }}>
      <Icon size={20} />
      <span className="text-[11px] font-bold">{label}</span>
    </button>
  )

  return (
    <div className="md:hidden" style={{ fontFamily: MONO }}>
      {/* Folha "Mais" */}
      {more && (
        <div className="fixed inset-0 z-30 flex items-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMore(false)} />
          <div className="relative w-full bg-ec-card border-t border-ec-line rounded-t-2xl p-4"
            style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom))' }}>
            <div className="ec-label px-1 pb-2">Telas</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {moreScreens.filter(s => !s.adminOnly || isAdmin).map(s => {
                const Icon = s.icon; const on = screen === s.id
                return (
                  <button key={s.id} onClick={() => { setScreen(s.id); setMore(false) }}
                    className={cn('h-20 rounded-xl border flex flex-col items-center justify-center gap-2 text-xs font-bold active:scale-95',
                      on ? 'border-ec-red/50 bg-ec-red/10 text-ec-red' : 'border-ec-line bg-ec-card2 text-ec-dim')}>
                    <Icon size={20} /> {s.label}
                  </button>
                )
              })}
            </div>
            <div className="ec-label px-1 pb-2">Ações</div>
            <div className="space-y-1.5">
              {([
                { id: 'saque',    label: 'Gerador de PIX', hint: 'Pix por gateway',    color: '#ff2b4a', icon: <QrCode size={16} /> },
                { id: 'pushover', label: 'Notificações',   hint: 'Avisos no celular',  color: '#ffc83d', icon: <Bell size={16} /> },
                { id: 'utmify',   label: 'UTMify',         hint: 'Rastreio de vendas', color: '#3b82f6', icon: <UtmifyMark size={19} /> },
              ] as const).map(a => (
                <button key={a.id} onClick={() => { setMore(false); openModal(a.id) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left border border-ec-line bg-ec-card2 active:scale-[0.99]">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${a.color}1f`, border: `1px solid ${a.color}55`, color: a.color }}>{a.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-ec-text">{a.label}</span>
                    <span className="block text-xs text-ec-muted">{a.hint}</span>
                  </span>
                  <ChevronRight size={16} className="text-ec-muted" />
                </button>
              ))}
            </div>
            <button onClick={logout}
              className="mt-4 w-full h-11 rounded-xl border border-ec-line bg-ec-card2 text-ec-dim text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 active:scale-[0.99]">
              <LogOut size={14} /> Sair{username ? ` · ${username}` : ''}
            </button>
          </div>
        </div>
      )}

      {/* Barra inferior */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 items-end px-2 pt-2 border-t border-ec-line"
        style={{ background: 'rgba(11,11,22,.96)', backdropFilter: 'blur(16px)', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
        {tabs.map(t => <Tab key={t.id} {...t} />)}
        {/* Ação principal no centro */}
        <button onClick={() => { setMore(false); openModal('generate') }} className="flex flex-col items-center gap-1 -mt-6">
          <span className="ec-cta-live w-14 h-14 rounded-2xl flex items-center justify-center text-black active:scale-95 transition"
            style={{ background: 'linear-gradient(135deg,#00f5a3,#00e396 45%,#00a06b)' }}>
            <Zap size={24} fill="currentColor" />
          </span>
          <span className="text-[11px] font-bold" style={{ color: '#00e396' }}>Gerar</span>
        </button>
        {tabsRight.map(t => <Tab key={t.id} {...t} />)}
        <button onClick={() => setMore(v => !v)} className="flex flex-col items-center gap-1 py-1.5 transition"
          style={{ color: more || inMore ? '#ff2b4a' : '#52526e' }}>
          <Menu size={20} />
          <span className="text-[11px] font-bold">Mais</span>
        </button>
      </nav>
    </div>
  )
}
