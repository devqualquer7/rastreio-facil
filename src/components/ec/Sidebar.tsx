'use client'
import { LayoutDashboard, Key, Receipt, ScrollText, Zap, LogOut, Settings2, ChevronDown, Circle, Sparkles, CreditCard, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/ec-utils'
import { useApp, Screen } from '@/lib/ec-store'

export function Sidebar() {
  const router = useRouter()
  const { screen, setScreen, openModal, activeCred, isAdmin } = useApp()

  const nav: { id: Screen; icon: any; label: string; adminOnly?: boolean }[] = [
    { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'credentials', icon: Key,             label: 'Credenciais' },
    { id: 'gateways',    icon: CreditCard,      label: 'Gateways PIX' },
    { id: 'extrato',     icon: Receipt,         label: 'Extrato MP' },
    { id: 'logs',        icon: ScrollText,      label: 'Logs' },
    { id: 'users',       icon: Users,           label: 'Usuários', adminOnly: true },
  ]

  async function logout() {
    await fetch('/api/ec/auth/logout', { method: 'POST' })
    router.push('/checkout/login'); router.refresh()
  }

  return (
    <aside className="hidden md:flex w-64 h-full flex-col relative z-10 border-r border-purple-500/10 bg-gradient-to-b from-[#0d0d14]/95 via-[#0a0a0f]/80 to-[#0d0d14]/95 backdrop-blur-xl">
      {/* Brand */}
      <div className="p-5 pt-7">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-500/50 to-cyan-400 opacity-40 blur-lg" />
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-700 to-cyan-600 flex items-center justify-center text-white font-black text-lg border border-purple-400/20">
              E
            </div>
          </div>
          <div>
            <div className="font-black text-sm tracking-tight ec-shimmer-text">ENCRYPTED</div>
            <div className="text-[9px] font-mono text-zinc-600 tracking-[0.25em] uppercase">Checkout · Web</div>
          </div>
        </div>
      </div>

      {/* CTA Gerar Link */}
      <div className="px-4 pb-5">
        <button onClick={() => openModal('generate')}
          className="ec-shine relative w-full py-3.5 rounded-2xl bg-gradient-to-br from-violet-700 via-purple-500 to-cyan-300 text-white font-black tracking-wide text-sm uppercase shadow-[0_0_20px_rgba(168,85,247,.4)] hover:shadow-[0_0_35px_rgba(168,85,247,.6)] active:scale-95 transition-all flex items-center justify-center gap-2 border border-white/10">
          <Sparkles size={14} className="drop-shadow" />
          <span>Gerar Link</span>
          <Zap size={14} fill="white" />
        </button>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1 space-y-1">
        <div className="text-[9px] font-mono text-zinc-700 tracking-[0.3em] px-3 mb-3 uppercase">Navegação</div>
        {nav.filter(item => !item.adminOnly || isAdmin).map(item => {
          const Icon = item.icon; const active = screen === item.id
          return (
            <button key={item.id} onClick={() => setScreen(item.id)}
              className={cn('relative w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-sm transition-all group',
                active
                  ? 'bg-gradient-to-r from-purple-500/20 via-purple-500/5 to-transparent text-purple-300'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300')}>
              {active && (
                <motion.div layoutId="ec-nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-purple-500 to-cyan-400 shadow-[0_0_12px_rgba(168,85,247,.6)]"
                />
              )}
              <Icon size={16} className={active ? 'text-purple-300' : 'group-hover:scale-110 transition-transform'} />
              <span className="tracking-wide">{item.label}</span>
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,.8)]" />}
            </button>
          )
        })}
      </nav>

      {/* Conta ativa */}
      <div className="p-3 border-t border-purple-500/10">
        <div className="text-[9px] font-mono text-zinc-700 tracking-[0.3em] px-2 mb-2 uppercase">Conta Ativa</div>
        <button onClick={() => openModal('switch-account')}
          className={cn('relative w-full rounded-2xl p-4 text-left transition-all group overflow-hidden',
            activeCred?.connected
              ? 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-purple-500/10 border border-emerald-500/40 shadow-[0_0_20px_rgba(34,197,94,.2)]'
              : 'bg-[#0d0d14] border border-[#1a1a28] hover:border-[#252538]')}>
          {activeCred?.connected && (
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-emerald-500/20 blur-2xl pointer-events-none" />
          )}
          <div className="flex items-center justify-between mb-2 relative">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Circle size={8} className={activeCred?.connected ? 'text-emerald-400 fill-emerald-400' : 'text-zinc-600 fill-zinc-600'} />
                {activeCred?.connected && <span className="absolute inset-0 rounded-full bg-emerald-400/50 blur-md animate-pulse" />}
              </div>
              <div className="text-[9px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase">Slot #{activeCred?.slot ?? '—'}</div>
            </div>
            <ChevronDown size={12} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <div className="font-bold text-sm text-zinc-100 truncate relative">{activeCred?.name || 'Sem conta'}</div>
          {activeCred?.mp_user_id && (
            <div className="text-[10px] font-mono text-zinc-600 mt-1 tracking-wider relative">
              MP · <span className="text-zinc-500 tabular">{activeCred.mp_user_id}</span>
            </div>
          )}
        </button>
      </div>

      {/* Ações */}
      <div className="p-3 border-t border-purple-500/10 flex gap-1.5">
        {isAdmin && (
          <button onClick={() => openModal('settings')}
            className="flex-1 py-2.5 rounded-xl text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300 flex items-center justify-center gap-2 font-mono text-[10px] tracking-[0.2em] transition uppercase">
            <Settings2 size={12} /> Config
          </button>
        )}
        <button onClick={logout}
          className="px-4 py-2.5 rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition flex items-center justify-center" title="Sair">
          <LogOut size={12} />
        </button>
      </div>
    </aside>
  )
}

// Mobile top bar
export function MobileTopBar() {
  const { screen, setScreen, openModal, isAdmin } = useApp()
  const router = useRouter()

  const nav: { id: Screen; icon: any; adminOnly?: boolean }[] = [
    { id: 'dashboard',   icon: LayoutDashboard },
    { id: 'credentials', icon: Key },
    { id: 'gateways',    icon: CreditCard },
    { id: 'extrato',     icon: Receipt },
    { id: 'logs',        icon: ScrollText },
    { id: 'users',       icon: Users, adminOnly: true },
  ]

  async function logout() {
    await fetch('/api/ec/auth/logout', { method: 'POST' })
    router.push('/checkout/login'); router.refresh()
  }

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/10 bg-[#0d0d14]/95 backdrop-blur">
        <span className="font-black text-sm ec-shimmer-text">ENCRYPTED</span>
        <div className="flex items-center gap-2">
          <button onClick={() => openModal('generate')}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-400 text-white text-xs font-bold">
            GERAR
          </button>
          <button onClick={logout} className="p-1.5 text-zinc-500 hover:text-red-400 transition">
            <LogOut size={14} />
          </button>
        </div>
      </div>
      <div className="flex border-b border-[#1a1a28] bg-[#0a0a0f]">
        {nav.filter(item => !item.adminOnly || isAdmin).map(item => {
          const Icon = item.icon; const active = screen === item.id
          return (
            <button key={item.id} onClick={() => setScreen(item.id)}
              className={cn('flex-1 py-3 flex items-center justify-center transition',
                active ? 'text-purple-400 border-b-2 border-purple-500' : 'text-zinc-600')}>
              <Icon size={18} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
