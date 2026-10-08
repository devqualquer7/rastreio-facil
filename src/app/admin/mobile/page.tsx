'use client'

/**
 * Modo Mobile — controle remoto do app desktop.
 *
 * Tudo aqui roda NO PC: cada ação vira um comando publicado na ponte
 * (/api/admin/mobile/cmd → Pusher → app → callback). As contas do Mercado Pago
 * nunca saem do computador; por isso a tela só funciona com o app aberto.
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
  Smartphone, WifiOff, Copy, Check, Share2, RefreshCw, AlertTriangle, X,
  Clock, CheckCircle2, XCircle, CreditCard, Wallet, Loader2, Search,
  Home, Receipt, Zap, KeyRound, QrCode, Link2, RotateCcw, OctagonX, ChevronRight,
  MessageCircle, TrendingUp, MoreVertical,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────

type Cred = { slot: number; name: string; banned: boolean; health_status: string | null; health_message?: string | null }
type Sale = {
  id: number; external_reference: string; slot: number; slot_name: string; title: string
  amount: number; net_amount: number | null; installments: number | null
  status: string; status_detail: string | null
  payment_type_id: string | null; payment_method_id: string | null
  link: string | null; approved_at: string | null; created_at: string
}
type Stats = {
  total: number; approved: number; rejected: number; pending: number
  approvedAmount: number; pendingAmount: number; netAmount: number; feeAmount: number
}
type PixResult = { ok: true; code: string; qrBase64: string } | { ok: false; reason: string; message: string }
type Generated = { link: string; reference: string; slotName: string; amount: number; pix: PixResult | null }
type Tab = 'inicio' | 'vendas' | 'gerar' | 'extrato' | 'contas'
type Conn = 'idle' | 'connecting' | 'online' | 'offline'
type Send = (command: string, args?: any, timeoutMs?: number) => Promise<any>
type Toast = (msg: string, type?: 'ok' | 'err' | 'info') => void

const BRIDGE_ID_KEY = 'mobile_bridge_id'
const TITLE_KEY     = 'mobile_default_title'
const MONO = "'JetBrains Mono', ui-monospace, Consolas, monospace"

// ─── Helpers ────────────────────────────────────────────

const fmtBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0)
// Aceita "1.234,56", "1234,56" e "1234.56" (teclados de celular variam entre vírgula e ponto)
const parseBRL = (s: string) => {
  const n = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  return Math.round(parseFloat(n) * 100) / 100
}

function fmtWhen(at: string | number) {
  const t = typeof at === 'number' ? at : new Date(at).getTime()
  const d = Date.now() - t
  if (d < 60_000)     return 'agora'
  if (d < 3_600_000)  return `há ${Math.floor(d / 60_000)} min`
  if (d < 86_400_000) return `há ${Math.floor(d / 3_600_000)} h`
  return new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const MANAGERS = ['R7', 'KEVEN', 'GUI', 'PABLO', 'BILA', 'GERENTE 6']
function managerOf(name: string) {
  const up = (name || '').toUpperCase()
  return MANAGERS.find(p => up.startsWith(p + ' -') || up.startsWith(p + '-')) || 'OUTRAS'
}

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  approved:     { label: 'Aprovado',   cls: 'text-ec-green border-ec-green/35 bg-ec-green/10',    icon: CheckCircle2 },
  pending:      { label: 'Pendente',   cls: 'text-ec-yellow border-ec-yellow/35 bg-ec-yellow/10', icon: Clock },
  in_process:   { label: 'Em análise', cls: 'text-ec-yellow border-ec-yellow/35 bg-ec-yellow/10', icon: Clock },
  gerado:       { label: 'Aguardando', cls: 'text-ec-blue border-ec-blue/35 bg-ec-blue/10',       icon: Link2 },
  rejected:     { label: 'Recusado',   cls: 'text-ec-red border-ec-red/35 bg-ec-red/10',          icon: XCircle },
  cancelled:    { label: 'Cancelado',  cls: 'text-ec-dim border-ec-line bg-ec-card2',             icon: XCircle },
  refunded:     { label: 'Estornado',  cls: 'text-ec-blue border-ec-blue/35 bg-ec-blue/10',       icon: RotateCcw },
  in_mediation: { label: 'Contestado', cls: 'text-ec-orange border-ec-orange/35 bg-ec-orange/10', icon: AlertTriangle },
  charged_back: { label: 'Chargeback', cls: 'text-ec-orange border-ec-orange/35 bg-ec-orange/10', icon: AlertTriangle },
  expired:      { label: 'Expirado',   cls: 'text-ec-dim border-ec-line bg-ec-card2',             icon: XCircle },
}
const METHOD: Record<string, string> = {
  pix: 'Pix', bank_transfer: 'Pix', credit_card: 'Crédito', debit_card: 'Débito', account_money: 'Conta MP', ticket: 'Boleto',
}

function Pill({ status }: { status: string }) {
  const s = STATUS[status] || { label: status, cls: 'text-ec-dim border-ec-line bg-ec-card2', icon: Clock }
  const Icon = s.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-wider uppercase whitespace-nowrap ${s.cls}`}>
      <Icon size={11} /> {s.label}
    </span>
  )
}

async function copyText(text: string, toast: Toast, okMsg: string) {
  try { await navigator.clipboard.writeText(text); toast(okMsg, 'ok') }
  catch { toast('Não foi possível copiar', 'err') }
}

async function shareText(text: string, toast: Toast) {
  try {
    if (navigator.share) await navigator.share({ text })
    else await copyText(text, toast, 'Copiado!')
  } catch { /* usuário fechou a folha de compartilhar */ }
}

// ─── Page ───────────────────────────────────────────────

export default function MobilePage() {
  const [bridgeId, setBridgeId] = useState('')
  const [ready, setReady]       = useState(false)
  const [conn, setConn]         = useState<Conn>('idle')
  const [creds, setCreds]       = useState<Cred[]>([])
  const [activeSlot, setActiveSlot] = useState<number | null>(null)
  const [tab, setTab]           = useState<Tab>('inicio')
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'ok' | 'err' | 'info' } | null>(null)
  const [menu, setMenu]         = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setBridgeId(localStorage.getItem(BRIDGE_ID_KEY) || '')
    setReady(true)
  }, [])

  const toast: Toast = useCallback((msg, type = 'info') => {
    setToastMsg({ msg, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 3500)
  }, [])

  const send: Send = useCallback(async (command, args, timeoutMs = 20_000) => {
    if (!bridgeId) throw new Error('Pareie o PC primeiro.')
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs + 5000)
    try {
      const res = await fetch('/api/admin/mobile/cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bridgeId, command, args, timeoutMs }),
        signal: ctrl.signal, cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`)
      return data.data
    } catch (e: any) {
      if (e.name === 'AbortError') throw new Error('Tempo esgotado.')
      throw e
    } finally { clearTimeout(timer) }
  }, [bridgeId])

  const loadCreds = useCallback(async () => {
    try {
      const data = await send('mp:list-creds')
      const list: Cred[] = Array.isArray(data) ? data : (data?.creds || [])
      setCreds(list)
      if (typeof data?.activeSlot === 'number') setActiveSlot(data.activeSlot)
    } catch (e: any) { toast('Não foi possível carregar as contas: ' + e.message, 'err') }
  }, [send, toast])

  const check = useCallback(async () => {
    if (!bridgeId) { setConn('idle'); return }
    setConn(c => (c === 'online' ? c : 'connecting'))
    try { await send('ping', undefined, 8_000); setConn('online') }
    catch { setConn('offline') }
  }, [bridgeId, send])

  useEffect(() => {
    if (!bridgeId) return
    check()
    const t = setInterval(check, 30_000)
    return () => clearInterval(t)
  }, [bridgeId, check])

  useEffect(() => { if (conn === 'online' && creds.length === 0) loadCreds() }, [conn]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <div className="min-h-screen bg-ec-bg" />

  if (!bridgeId) {
    return <PairScreen onPaired={id => { localStorage.setItem(BRIDGE_ID_KEY, id); setBridgeId(id) }} />
  }

  const online = conn === 'online'
  const active = creds.find(c => c.slot === activeSlot)
  const common = { send, toast, online, creds, activeSlot }

  const NAV: { id: Tab; label: string; icon: any }[] = [
    { id: 'inicio',  label: 'Início',  icon: Home },
    { id: 'vendas',  label: 'Vendas',  icon: Receipt },
    { id: 'gerar',   label: 'Gerar',   icon: Zap },
    { id: 'extrato', label: 'Extrato', icon: Wallet },
    { id: 'contas',  label: 'Contas',  icon: KeyRound },
  ]

  return (
    <div className="min-h-screen bg-ec-bg text-ec-text" style={{ fontFamily: MONO }}>
      <div className="pointer-events-none fixed inset-0 ec-spotlight" />

      <div className="relative mx-auto max-w-xl min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-ec-bg/85 border-b border-ec-line px-4 py-3 flex items-center gap-3">
          <img src="/logo.png" alt="" className="w-9 h-9 object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(255,43,74,.6))' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold tracking-[0.14em] leading-none">
              ENCRYPTED<span className="text-ec-red">MOBILE</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={`w-2 h-2 rounded-full ${
                online ? 'bg-ec-green shadow-[0_0_8px_rgba(0,227,150,.7)]'
                : conn === 'connecting' ? 'bg-ec-yellow animate-pulse'
                : conn === 'offline' ? 'bg-ec-red' : 'bg-ec-muted'}`} />
              <span className="text-[11px] text-ec-dim truncate">
                {online ? (active ? `PC online · ${active.name}` : 'PC online')
                  : conn === 'connecting' ? 'Conectando ao PC…'
                  : conn === 'offline' ? 'PC offline' : 'Aguardando'}
              </span>
            </div>
          </div>
          <button onClick={() => { check(); loadCreds() }} className="w-9 h-9 rounded-lg border border-ec-line bg-ec-card2 text-ec-dim flex items-center justify-center active:scale-95" title="Atualizar">
            <RefreshCw size={15} className={conn === 'connecting' ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setMenu(true)} className="w-9 h-9 rounded-lg border border-ec-line bg-ec-card2 text-ec-dim flex items-center justify-center active:scale-95" title="Mais">
            <MoreVertical size={15} />
          </button>
        </header>

        <main className="flex-1 px-4 pt-4 pb-28">
          {conn === 'offline' && (
            <div className="mb-4 p-3.5 rounded-xl bg-ec-red/10 border border-ec-red/35 flex items-center gap-3">
              <WifiOff size={18} className="text-ec-red flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-bold text-ec-red">PC offline</div>
                <div className="text-xs text-ec-dim leading-snug">Abra o app no computador e deixe o Modo Mobile ligado.</div>
              </div>
              <button onClick={check} className="px-3 h-9 rounded-lg bg-ec-red/20 text-ec-red text-xs font-bold active:scale-95">TENTAR</button>
            </div>
          )}

          {tab === 'inicio'  && <InicioTab  {...common} goto={setTab} />}
          {tab === 'gerar'   && <GerarTab   {...common} />}
          {tab === 'vendas'  && <VendasTab  {...common} />}
          {tab === 'extrato' && <ExtratoTab {...common} />}
          {tab === 'contas'  && <ContasTab  {...common} onChanged={loadCreds} />}
        </main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-30">
          <div className="mx-auto max-w-xl border-t border-ec-line bg-ec-card/95 backdrop-blur-xl grid grid-cols-5 items-end px-2 pt-2"
            style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
            {NAV.map(n => {
              const Icon = n.icon; const on = tab === n.id
              if (n.id === 'gerar') return (
                <button key={n.id} onClick={() => setTab('gerar')} className="flex flex-col items-center gap-1 -mt-6">
                  <span className={`w-14 h-14 rounded-2xl flex items-center justify-center text-black active:scale-95 transition ${on ? 'ec-cta-live' : ''}`}
                    style={{ background: 'linear-gradient(135deg,#00f5a3,#00e396 45%,#00a06b)', boxShadow: '0 0 20px rgba(0,227,150,.4)' }}>
                    <Zap size={24} fill="currentColor" />
                  </span>
                  <span className={`text-[11px] font-bold ${on ? 'text-ec-green' : 'text-ec-dim'}`}>Gerar</span>
                </button>
              )
              return (
                <button key={n.id} onClick={() => setTab(n.id)}
                  className={`flex flex-col items-center gap-1 py-1.5 rounded-lg transition ${on ? 'text-ec-red' : 'text-ec-muted'}`}>
                  <Icon size={20} />
                  <span className="text-[11px] font-bold">{n.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      </div>

      {menu && (
        <Sheet title="Opções" onClose={() => setMenu(false)}>
          <div className="text-xs text-ec-dim leading-relaxed mb-4">
            Este celular está pareado com o PC <span className="text-ec-text">{bridgeId.slice(0, 8)}…</span>. Tudo o que você faz aqui é executado no app do computador.
          </div>
          <button onClick={() => { localStorage.removeItem(BRIDGE_ID_KEY); setBridgeId(''); setMenu(false); setCreds([]); setConn('idle') }}
            className="w-full h-12 rounded-xl border border-ec-red/40 bg-ec-red/10 text-ec-red text-sm font-bold active:scale-[0.98]">
            Desparear / trocar de PC
          </button>
        </Sheet>
      )}

      {toastMsg && (
        <div className={`fixed left-4 right-4 bottom-28 z-[60] mx-auto max-w-md rounded-xl px-4 py-3 backdrop-blur-xl shadow-2xl border text-[13px] font-bold ${
          toastMsg.type === 'ok'  ? 'bg-ec-green/15 border-ec-green/45 text-ec-green'
          : toastMsg.type === 'err' ? 'bg-ec-red/15 border-ec-red/45 text-ec-red'
          : 'bg-ec-card2 border-ec-line text-ec-text'}`}>
          {toastMsg.msg}
        </div>
      )}
    </div>
  )
}

// ─── Shared UI ──────────────────────────────────────────

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-ec-card border border-ec-line rounded-t-2xl sm:rounded-2xl max-h-[88vh] flex flex-col"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06] flex-shrink-0">
          <div className="text-sm font-bold tracking-[0.18em] uppercase text-ec-text">{title}</div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg text-ec-dim flex items-center justify-center active:bg-white/10"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-ec-card border border-ec-line rounded-xl ${className}`}>{children}</div>
}

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="py-14 text-center">
      <Icon size={30} className="mx-auto mb-3 text-ec-muted" />
      <div className="text-sm text-ec-dim">{text}</div>
    </div>
  )
}

function Loading({ text = 'Carregando…' }: { text?: string }) {
  return <div className="py-14 flex items-center justify-center gap-2 text-sm text-ec-dim"><Loader2 size={16} className="animate-spin" /> {text}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold tracking-[0.2em] uppercase text-ec-muted mb-1.5">{children}</div>
}

const inputCls = 'w-full h-12 bg-ec-input border border-ec-line rounded-xl px-4 text-[15px] text-ec-text placeholder-ec-muted outline-none focus:border-ec-red/60 transition'
const btnGhost = 'h-12 rounded-xl border border-ec-line bg-ec-card2 text-ec-text text-[13px] font-bold tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40'

type Common = { send: Send; toast: Toast; online: boolean; creds: Cred[]; activeSlot: number | null }

// ─── Pair screen ────────────────────────────────────────

function PairScreen({ onPaired }: { onPaired: (id: string) => void }) {
  const [code, setCode] = useState('')
  const [err, setErr]   = useState('')
  function submit() {
    const cleaned = code.trim().toLowerCase()
    if (!/^[a-f0-9]{16,}$/.test(cleaned)) { setErr('Código inválido. Cole o código que aparece no app.'); return }
    onPaired(cleaned)
  }
  return (
    <div className="min-h-screen bg-ec-bg text-ec-text flex items-center justify-center px-6" style={{ fontFamily: MONO }}>
      <div className="pointer-events-none fixed inset-0 ec-spotlight" />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-ec-red/15 border border-ec-red/40 items-center justify-center mb-4">
            <Smartphone size={28} className="text-ec-red" />
          </div>
          <div className="text-lg font-bold tracking-[0.2em] mb-2">PAREAR COM O PC</div>
          <div className="text-[13px] text-ec-dim leading-relaxed">
            No app do computador, abra <span className="text-ec-red">Modo Mobile</span> e copie o código de pareamento.
          </div>
        </div>
        <div className="space-y-3">
          <input type="text" value={code} onChange={e => { setCode(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="cole o código aqui" autoCapitalize="none" autoCorrect="off" spellCheck={false} className={inputCls} />
          {err && <div className="text-xs text-ec-red">{err}</div>}
          <button onClick={submit} disabled={!code.trim()}
            className="w-full h-12 rounded-xl bg-ec-red-deep text-white text-sm font-bold tracking-[0.2em] active:scale-[0.98] disabled:opacity-30">
            CONECTAR
          </button>
        </div>
        <div className="mt-8 text-center text-xs text-ec-muted leading-relaxed">
          O pareamento fica salvo neste celular.<br />Funciona enquanto o app estiver aberto no PC.
        </div>
      </div>
    </div>
  )
}

// ─── Início ─────────────────────────────────────────────

const PERIODS = [
  { id: 'hoje', label: 'Hoje' }, { id: '7d', label: '7 dias' }, { id: '30d', label: '30 dias' }, { id: 'tudo', label: 'Tudo' },
] as const

function InicioTab({ send, toast, online, goto }: Common & { goto: (t: Tab) => void }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('hoje')
  const [stats, setStats]   = useState<Stats | null>(null)
  const [recent, setRecent] = useState<Sale[] | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      const from = period === 'hoje' ? start.toISOString()
        : period === '7d'  ? new Date(Date.now() - 7 * 86_400_000).toISOString()
        : period === '30d' ? new Date(Date.now() - 30 * 86_400_000).toISOString() : undefined
      const [s, r] = await Promise.all([
        send('mp:get-stats', from ? { from } : {}),
        send('mp:list-recent-sales', { limit: 8 }),
      ])
      setStats(s); setRecent(r?.sales || [])
    } catch (e: any) { toast(e.message, 'err') }
    finally { setLoading(false) }
  }, [period, send, toast])

  useEffect(() => { if (online) load() }, [online, load])

  const rate = stats && stats.approved + stats.rejected > 0 ? (stats.approved / (stats.approved + stats.rejected)) * 100 : 0
  const v = (x: string) => (stats ? x : '—')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1">
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={`px-3.5 h-9 rounded-lg border text-xs font-bold tracking-wider uppercase whitespace-nowrap ${
              period === p.id ? 'bg-ec-red/10 border-ec-red/45 text-ec-red' : 'bg-ec-card border-ec-line text-ec-dim'}`}>
            {p.label}
          </button>
        ))}
        {loading && <Loader2 size={15} className="animate-spin text-ec-dim ml-1 flex-shrink-0" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-ec-green/30 bg-gradient-to-br from-ec-green/[0.08] to-ec-card col-span-2">
          <div className="text-[11px] font-bold tracking-[0.2em] text-ec-green/80 uppercase">Aprovado</div>
          <div className="text-[28px] font-black text-ec-green tabular-nums leading-tight mt-1">{v(fmtBRL(stats?.approvedAmount || 0))}</div>
          <div className="text-xs text-ec-dim mt-1">
            {v(`${stats?.approved} ${stats?.approved === 1 ? 'venda' : 'vendas'} · líquido ${fmtBRL(stats?.netAmount || 0)}`)}
          </div>
        </Card>
        <Card className="p-4 border-ec-yellow/25">
          <div className="text-[11px] font-bold tracking-[0.2em] text-ec-yellow/80 uppercase">Pendentes</div>
          <div className="text-2xl font-black text-ec-yellow tabular-nums mt-1">{v(String(stats?.pending))}</div>
          <div className="text-xs text-ec-dim mt-0.5 tabular-nums">{v(fmtBRL(stats?.pendingAmount || 0))}</div>
        </Card>
        <Card className="p-4 border-ec-red/25">
          <div className="text-[11px] font-bold tracking-[0.2em] text-ec-red/80 uppercase">Recusadas</div>
          <div className="text-2xl font-black text-ec-red tabular-nums mt-1">{v(String(stats?.rejected))}</div>
          <div className="text-xs text-ec-dim mt-0.5">taxas {v(fmtBRL(stats?.feeAmount || 0))}</div>
        </Card>
      </div>

      {!!stats && stats.approved + stats.rejected > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-ec-dim uppercase"><TrendingUp size={14} className="text-ec-red" /> Taxa de aprovação</div>
            <div className="text-lg font-black text-ec-text tabular-nums">{rate.toFixed(1)}%</div>
          </div>
          <div className="h-2 rounded-full bg-ec-card2 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-ec-green-deep to-ec-green transition-all" style={{ width: `${rate}%` }} />
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="text-[11px] font-bold tracking-[0.2em] text-ec-dim uppercase">Últimas vendas</div>
          <button onClick={() => goto('vendas')} className="text-xs font-bold text-ec-red flex items-center gap-0.5">VER TODAS <ChevronRight size={14} /></button>
        </div>
        {recent === null ? <Loading />
          : recent.length === 0 ? <Empty icon={Receipt} text="Nenhuma venda ainda." />
          : <div className="divide-y divide-white/[0.05]">{recent.map(s => <SaleLine key={s.id} sale={s} />)}</div>}
      </Card>
    </div>
  )
}

function SaleLine({ sale, onClick }: { sale: Sale; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-ec-card2 disabled:active:bg-transparent">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-ec-text truncate">{sale.title}</div>
        <div className="text-xs text-ec-muted truncate mt-0.5">
          {sale.slot_name} · {fmtWhen(sale.created_at)}{sale.payment_type_id ? ` · ${METHOD[sale.payment_type_id] || sale.payment_type_id}` : ''}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[15px] font-black text-ec-text tabular-nums">{fmtBRL(sale.amount)}</div>
        <div className="mt-1"><Pill status={sale.status} /></div>
      </div>
    </button>
  )
}

// ─── Gerar ──────────────────────────────────────────────

function AccountPicker({ creds, value, onPick, onClose }: { creds: Cred[]; value: number | null; onPick: (slot: number) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const groups = useMemo(() => {
    const g: Record<string, Cred[]> = {}
    for (const c of creds) {
      if (c.banned) continue
      if (q.trim() && !c.name.toLowerCase().includes(q.toLowerCase()) && !String(c.slot).includes(q)) continue
      ;(g[managerOf(c.name)] ||= []).push(c)
    }
    return g
  }, [creds, q])
  return (
    <Sheet title="Escolher conta" onClose={onClose}>
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ec-muted" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar conta ou slot…" className={inputCls + ' pl-10'} />
      </div>
      {Object.keys(groups).length === 0 && <Empty icon={KeyRound} text="Nenhuma conta encontrada." />}
      {Object.entries(groups).map(([m, list]) => (
        <div key={m} className="mb-4">
          <div className="text-[11px] font-bold tracking-[0.2em] text-ec-muted uppercase mb-1.5">{m} · {list.length}</div>
          <div className="space-y-1.5">
            {list.map(c => (
              <button key={c.slot} onClick={() => { onPick(c.slot); onClose() }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left active:scale-[0.99] ${
                  value === c.slot ? 'border-ec-yellow/60 bg-ec-yellow/10' : 'border-ec-line bg-ec-card2'}`}>
                <span className="w-9 h-9 rounded-lg border border-ec-green/40 bg-ec-green/10 text-ec-green text-sm font-black flex items-center justify-center flex-shrink-0">{c.slot}</span>
                <span className="flex-1 min-w-0 text-sm font-bold truncate">{c.name}</span>
                {value === c.slot && <Check size={16} className="text-ec-yellow" />}
              </button>
            ))}
          </div>
        </div>
      ))}
    </Sheet>
  )
}

function PixBlock({ pix, amount, toast }: { pix: PixResult; amount: number; toast: Toast }) {
  if (!pix.ok) {
    const rejected = pix.reason === 'rejected'
    return (
      <div className={`p-3.5 rounded-xl border flex gap-3 text-[13px] leading-relaxed ${rejected ? 'bg-ec-red/10 border-ec-red/35 text-ec-red-soft' : 'bg-ec-yellow/10 border-ec-yellow/30 text-ec-yellow'}`}>
        <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
        <div><b>{rejected ? 'Mercado Pago recusou o Pix. ' : 'Não deu para gerar o Pix. '}</b>{pix.message} Use o link.</div>
      </div>
    )
  }
  const msg = `✅ *GEREI SEU PEDIDO, SEGUE O PIX COPIA E COLA PRA FINALIZAR SUA COMPRA:*\n\n💰 *Valor:* ${fmtBRL(amount)}\n\n${pix.code}\n\nQuando concluir, me informa aqui!`
  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pix.qrBase64} alt="QR Code Pix" className="w-48 h-48 rounded-xl bg-white p-2" />
      </div>
      <div className="bg-ec-input border border-ec-green/25 rounded-xl p-3">
        <Label>Pix copia e cola</Label>
        <div className="text-xs text-ec-green break-all leading-relaxed">{pix.code}</div>
      </div>
      <button onClick={() => copyText(pix.code, toast, 'Pix copiado!')}
        className="w-full h-14 rounded-xl text-black text-sm font-black tracking-[0.15em] uppercase flex items-center justify-center gap-2 active:scale-[0.98]"
        style={{ background: 'linear-gradient(135deg,#00f5a3,#00e396 45%,#00a06b)' }}>
        <Copy size={16} /> Copiar Pix
      </button>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => copyText(msg, toast, 'Mensagem copiada!')} className="h-12 rounded-xl border border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98]">
          <MessageCircle size={15} /> Msg WhatsApp
        </button>
        <button onClick={() => shareText(pix.code, toast)} className={btnGhost}><Share2 size={15} /> Enviar</button>
      </div>
    </div>
  )
}

function GerarTab({ send, toast, online, creds, activeSlot }: Common) {
  const [slot, setSlot]     = useState<number | null>(null)
  const [picker, setPicker] = useState(false)
  const [title, setTitle]   = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy]     = useState<false | 'link' | 'pix'>(false)
  const [done, setDone]     = useState<Generated | null>(null)

  useEffect(() => { setTitle(localStorage.getItem(TITLE_KEY) || '') }, [])
  useEffect(() => {
    if (slot === null && activeSlot && creds.some(c => c.slot === activeSlot && !c.banned)) setSlot(activeSlot)
  }, [creds, activeSlot, slot])

  const cred = creds.find(c => c.slot === slot)

  async function generate(withPix: boolean) {
    if (!slot)          { toast('Escolha uma conta', 'err'); return }
    if (!title.trim())  { toast('Digite o título', 'err'); return }
    const value = parseBRL(amount)
    if (!isFinite(value) || value < 1) { toast('Valor inválido (mínimo R$ 1,00)', 'err'); return }
    setBusy(withPix ? 'pix' : 'link')
    try {
      localStorage.setItem(TITLE_KEY, title.trim())
      const r = await send('mp:create-link', { slot, title: title.trim(), amount: value })
      let pix: PixResult | null = null
      if (withPix) {
        try { pix = await send('mp:auto-pix', { link: r.link }, 45_000) }
        catch (e: any) { pix = { ok: false, reason: 'error', message: e.message } }
      }
      setDone({ link: r.link, reference: r.reference, slotName: r.slotName, amount: value, pix })
      toast(pix?.ok ? 'Pix gerado!' : withPix ? 'Link gerado (Pix não saiu)' : 'Link gerado!', pix && !pix.ok ? 'info' : 'ok')
    } catch (e: any) { toast(e.message, 'err') }
    finally { setBusy(false) }
  }

  if (done) {
    const linkMsg = `✅ *GEREI SEU PEDIDO, SEGUE LINK PRA FINALIZAR SUA COMPRA:*\n\n💰 *Valor:* ${fmtBRL(done.amount)}\n🔗 Link: ${done.link}\n\nQuando concluir, me informa aqui!`
    return (
      <div className="space-y-4">
        <div className="text-center pt-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-ec-green/10 border border-ec-green/35 items-center justify-center mb-2.5">
            <Check size={26} className="text-ec-green" />
          </div>
          <div className="text-base font-black tracking-[0.2em] text-ec-green">{done.pix?.ok ? 'PIX GERADO' : 'LINK GERADO'}</div>
          <div className="text-xs text-ec-dim mt-1">{fmtBRL(done.amount)} · {done.slotName}</div>
        </div>

        {done.pix && <PixBlock pix={done.pix} amount={done.amount} toast={toast} />}

        <Card className="p-3.5">
          <Label>Link de pagamento</Label>
          <div className="text-xs text-ec-dim break-all leading-relaxed">{done.link}</div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <button onClick={() => copyText(done.link, toast, 'Link copiado!')} className={btnGhost}><Copy size={15} /> Link</button>
            <button onClick={() => copyText(linkMsg, toast, 'Mensagem copiada!')} className={btnGhost}><MessageCircle size={15} /> Msg</button>
            <button onClick={() => shareText(done.link, toast)} className={btnGhost}><Share2 size={15} /> Enviar</button>
          </div>
        </Card>

        <button onClick={() => { setDone(null); setAmount('') }} className={btnGhost + ' w-full'}>Gerar outro</button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Conta</Label>
        <button onClick={() => setPicker(true)} disabled={!online}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-ec-line bg-ec-card active:scale-[0.99] disabled:opacity-50 text-left">
          <span className={`w-10 h-10 rounded-lg border text-sm font-black flex items-center justify-center flex-shrink-0 ${
            cred ? 'border-ec-yellow/60 bg-ec-yellow/15 text-ec-yellow' : 'border-ec-line bg-ec-card2 text-ec-muted'}`}>{cred ? cred.slot : '?'}</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold truncate">{cred ? cred.name : 'Escolher conta'}</span>
            <span className="block text-xs text-ec-muted">{cred ? (cred.slot === activeSlot ? 'Conta ativa no PC' : 'Toque para trocar') : `${creds.filter(c => !c.banned).length} contas disponíveis`}</span>
          </span>
          <ChevronRight size={18} className="text-ec-muted" />
        </button>
      </div>

      <div>
        <Label>Valor (R$)</Label>
        <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
          placeholder="0,00" className={inputCls + ' h-16 text-2xl font-black tabular-nums'} />
      </div>

      <div>
        <Label>Título do produto</Label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="Ex: Produto / Serviço" className={inputCls} />
        <div className="text-xs text-ec-muted mt-1.5">Fica salvo neste celular para a próxima vez.</div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <button onClick={() => generate(false)} disabled={!online || !!busy} className={btnGhost + ' h-14'}>
          {busy === 'link' ? <Loader2 size={17} className="animate-spin" /> : <Link2 size={17} />} Gerar link
        </button>
        <button onClick={() => generate(true)} disabled={!online || !!busy}
          className="h-14 rounded-xl text-black text-[13px] font-black tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#00f5a3,#00e396 45%,#00a06b)', boxShadow: '0 0 20px rgba(0,227,150,.3)' }}>
          {busy === 'pix' ? <Loader2 size={17} className="animate-spin" /> : <QrCode size={17} />} Gerar Pix
        </button>
      </div>
      {busy === 'pix' && <div className="text-xs text-ec-dim text-center">Gerando o Pix no checkout do Mercado Pago… leva uns 10 segundos.</div>}

      {picker && <AccountPicker creds={creds} value={slot} onPick={setSlot} onClose={() => setPicker(false)} />}
    </div>
  )
}

// ─── Vendas ─────────────────────────────────────────────

const SALE_FILTERS = [
  { id: 'todos', label: 'Todas' }, { id: 'approved', label: 'Aprovadas' }, { id: 'aberto', label: 'Em aberto' }, { id: 'rejected', label: 'Recusadas' },
] as const
const OPEN = ['gerado', 'pending', 'in_process']

function VendasTab({ send, toast, online }: Common) {
  const [sales, setSales]   = useState<Sale[] | null>(null)
  const [filter, setFilter] = useState<(typeof SALE_FILTERS)[number]['id']>('todos')
  const [loading, setLoading] = useState(false)
  const [open, setOpen]     = useState<Sale | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { const d = await send('mp:list-sales', { limit: 100 }); setSales(Array.isArray(d) ? d : []) }
    catch (e: any) { toast(e.message, 'err') }
    finally { setLoading(false) }
  }, [send, toast])

  useEffect(() => { if (online) load() }, [online, load])

  const list = (sales || []).filter(s =>
    filter === 'todos' ? true : filter === 'aberto' ? OPEN.includes(s.status) : s.status === filter)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1">
        {SALE_FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3.5 h-9 rounded-lg border text-xs font-bold tracking-wider uppercase whitespace-nowrap ${
              filter === f.id ? 'bg-ec-red/10 border-ec-red/45 text-ec-red' : 'bg-ec-card border-ec-line text-ec-dim'}`}>
            {f.label}
          </button>
        ))}
        <button onClick={load} className="ml-auto w-9 h-9 rounded-lg border border-ec-line bg-ec-card text-ec-dim flex items-center justify-center flex-shrink-0">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <Card className="overflow-hidden">
        {sales === null ? <Loading />
          : list.length === 0 ? <Empty icon={Receipt} text="Nenhuma venda neste filtro." />
          : <div className="divide-y divide-white/[0.05]">{list.map(s => <SaleLine key={s.id} sale={s} onClick={() => setOpen(s)} />)}</div>}
      </Card>
      {!!sales && <div className="text-center text-xs text-ec-muted">{list.length} de {sales.length} vendas (últimas 100)</div>}

      {open && <SaleSheet sale={open} send={send} toast={toast} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); load() }} />}
    </div>
  )
}

function SaleSheet({ sale, send, toast, onClose, onChanged }: { sale: Sale; send: Send; toast: Toast; onClose: () => void; onChanged: () => void }) {
  const [pix, setPix]   = useState<PixResult | null>(null)
  const [busy, setBusy] = useState<false | 'pix' | 'cancel'>(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const unpaid = OPEN.includes(sale.status)

  async function genPix() {
    if (!sale.link) return
    setBusy('pix')
    try { setPix(await send('mp:auto-pix', { link: sale.link }, 45_000)) }
    catch (e: any) { setPix({ ok: false, reason: 'error', message: e.message }) }
    finally { setBusy(false) }
  }
  async function cancel() {
    setBusy('cancel')
    try { await send('mp:cancel-link', { saleId: sale.id }); toast('Link cancelado', 'ok'); onChanged() }
    catch (e: any) { toast(e.message, 'err'); setBusy(false) }
  }

  return (
    <Sheet title="Venda" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-snug">{sale.title}</div>
            <div className="text-xs text-ec-muted mt-1">Slot {sale.slot} · {sale.slot_name}</div>
          </div>
          <Pill status={sale.status} />
        </div>
        <div className="bg-ec-card2 border border-ec-line rounded-xl p-3.5 space-y-1.5 text-[13px]">
          <Row k="Valor" v={fmtBRL(sale.amount)} strong />
          {sale.status === 'approved' && Number(sale.net_amount) > 0 && <Row k="Líquido" v={fmtBRL(Number(sale.net_amount))} />}
          {!!sale.payment_type_id && <Row k="Método" v={`${METHOD[sale.payment_type_id] || sale.payment_type_id}${(sale.installments || 1) > 1 ? ` ${sale.installments}x` : ''}`} />}
          <Row k="Criada" v={fmtWhen(sale.created_at)} />
          {!!sale.approved_at && <Row k="Aprovada" v={fmtWhen(sale.approved_at)} />}
          <Row k="Referência" v={sale.external_reference} small />
        </div>

        {pix && <PixBlock pix={pix} amount={sale.amount} toast={toast} />}

        {!!sale.link && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => copyText(sale.link!, toast, 'Link copiado!')} className={btnGhost}><Copy size={15} /> Copiar link</button>
            <button onClick={() => shareText(sale.link!, toast)} className={btnGhost}><Share2 size={15} /> Enviar</button>
          </div>
        )}
        {unpaid && !!sale.link && !pix?.ok && (
          <button onClick={genPix} disabled={!!busy}
            className="w-full h-12 rounded-xl text-black text-[13px] font-black tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#00f5a3,#00e396 45%,#00a06b)' }}>
            {busy === 'pix' ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />} {busy === 'pix' ? 'Gerando Pix…' : 'Gerar Pix deste link'}
          </button>
        )}
        {unpaid && (confirmCancel ? (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setConfirmCancel(false)} className={btnGhost}>Voltar</button>
            <button onClick={cancel} disabled={!!busy} className="h-12 rounded-xl bg-ec-red-deep text-white text-[13px] font-bold tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40">
              {busy === 'cancel' ? <Loader2 size={16} className="animate-spin" /> : <OctagonX size={16} />} Confirmar
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirmCancel(true)} className="w-full h-12 rounded-xl border border-ec-red/40 bg-ec-red/10 text-ec-red text-[13px] font-bold tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98]">
            <OctagonX size={16} /> Cancelar link
          </button>
        ))}
      </div>
    </Sheet>
  )
}

function Row({ k, v, strong, small }: { k: string; v: string; strong?: boolean; small?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ec-muted flex-shrink-0">{k}</span>
      <span className={`text-right tabular-nums ${strong ? 'text-ec-text font-black' : 'text-ec-dim'} ${small ? 'text-xs break-all' : ''}`}>{v}</span>
    </div>
  )
}

// ─── Extrato ────────────────────────────────────────────

function ExtratoTab({ send, toast, online, creds, activeSlot }: Common) {
  const [slot, setSlot]     = useState<number | null>(null)
  const [picker, setPicker] = useState(false)
  const [items, setItems]   = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen]     = useState<any | null>(null)

  useEffect(() => {
    if (slot === null && activeSlot && creds.some(c => c.slot === activeSlot)) setSlot(activeSlot)
  }, [creds, activeSlot, slot])

  const load = useCallback(async () => {
    if (!slot) return
    setLoading(true)
    try { const d = await send('mp:list-extrato', { slot, limit: 50 }, 30_000); setItems(Array.isArray(d) ? d : []) }
    catch (e: any) { toast(e.message, 'err'); setItems(i => i ?? []) }
    finally { setLoading(false) }
  }, [slot, send, toast])

  useEffect(() => { if (online && slot) { setItems(null); load() } }, [online, slot, load])

  const cred = creds.find(c => c.slot === slot)
  const approved = (items || []).filter(p => p.status === 'approved')
  const bruto = approved.reduce((a, p) => a + (Number(p.transaction_amount) || 0), 0)
  const liq   = approved.reduce((a, p) => a + (Number(p.net_received_amount) || 0), 0)

  return (
    <div className="space-y-3">
      <button onClick={() => setPicker(true)} disabled={!online}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-ec-line bg-ec-card text-left active:scale-[0.99] disabled:opacity-50">
        <span className="w-10 h-10 rounded-lg border border-ec-line bg-ec-card2 text-ec-dim text-sm font-black flex items-center justify-center flex-shrink-0">{cred ? cred.slot : '?'}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold truncate">{cred ? cred.name : 'Escolher conta'}</span>
          <span className="block text-xs text-ec-muted">Extrato direto do Mercado Pago · últimos 50</span>
        </span>
        <RefreshCw size={16} className={`text-ec-muted ${loading ? 'animate-spin' : ''}`} onClick={e => { e.stopPropagation(); load() }} />
      </button>

      {!!items && items.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3.5 border-ec-green/25"><Label>Bruto aprovado</Label><div className="text-lg font-black text-ec-green tabular-nums">{fmtBRL(bruto)}</div></Card>
          <Card className="p-3.5"><Label>Líquido</Label><div className="text-lg font-black tabular-nums">{fmtBRL(liq)}</div></Card>
        </div>
      )}

      <Card className="overflow-hidden">
        {!slot ? <Empty icon={Wallet} text="Escolha uma conta para ver o extrato." />
          : items === null ? <Loading text="Consultando o Mercado Pago…" />
          : items.length === 0 ? <Empty icon={Wallet} text="Nenhum pagamento nesta conta." />
          : <div className="divide-y divide-white/[0.05]">
              {items.map(p => (
                <button key={p.id} onClick={() => setOpen(p)} className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-ec-card2">
                  <span className="w-9 h-9 rounded-lg border border-ec-line bg-ec-card2 text-ec-dim flex items-center justify-center flex-shrink-0">
                    {p.payment_type_id === 'credit_card' || p.payment_type_id === 'debit_card' ? <CreditCard size={15} /> : <QrCode size={15} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold truncate">{p.description || 'Pagamento'}</span>
                    <span className="block text-xs text-ec-muted truncate mt-0.5">{METHOD[p.payment_type_id] || p.payment_type_id} · {fmtWhen(p.date_created)}</span>
                  </span>
                  <span className="text-right flex-shrink-0">
                    <span className="block text-[15px] font-black tabular-nums">{fmtBRL(p.transaction_amount)}</span>
                    <span className="block mt-1"><Pill status={p.status} /></span>
                  </span>
                </button>
              ))}
            </div>}
      </Card>

      {picker && <AccountPicker creds={creds} value={slot} onPick={setSlot} onClose={() => setPicker(false)} />}
      {open && slot && <PaymentSheet payment={open} slot={slot} send={send} toast={toast} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); load() }} />}
    </div>
  )
}

function PaymentSheet({ payment: p, slot, send, toast, onClose, onChanged }: { payment: any; slot: number; send: Send; toast: Toast; onClose: () => void; onChanged: () => void }) {
  const [info, setInfo]     = useState<{ status: string; amount: number; refunded: number; refundable: number } | null>(null)
  const [mode, setMode]     = useState<'view' | 'amount' | 'confirm'>('view')
  const [amount, setAmount] = useState('')
  const [busy, setBusy]     = useState(false)
  const canAct = ['approved', 'pending', 'in_process'].includes(p.status)
  const isCancel = p.status !== 'approved'

  async function start() {
    setBusy(true)
    try {
      const i = await send('mp:refund-info', { slot, paymentId: String(p.id) })
      setInfo(i)
      if (i.status === 'approved' && i.refundable <= 0) { toast('Já foi estornado integralmente', 'info'); return }
      setMode(i.status === 'approved' ? 'amount' : 'confirm')
    } catch (e: any) { toast(e.message, 'err') }
    finally { setBusy(false) }
  }

  const value = parseBRL(amount)
  const ok = !!info && value > 0 && value <= info.refundable
  const total = !!info && value === info.refundable

  async function confirm() {
    setBusy(true)
    try {
      const r = await send('mp:refund', { slot, paymentId: String(p.id), ...(isCancel ? {} : { amount: value }) }, 30_000)
      toast(r.action === 'cancelled' ? 'Pagamento cancelado' : r.action === 'partially_refunded' ? `Estorno parcial de ${fmtBRL(r.amount)} feito` : 'Estorno total feito', 'ok')
      onChanged()
    } catch (e: any) { toast(e.message, 'err'); setBusy(false) }
  }

  return (
    <Sheet title={mode === 'view' ? 'Pagamento' : isCancel ? 'Cancelar pagamento' : 'Estornar pagamento'} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-bold leading-snug">{p.description || 'Pagamento'}</div>
            <div className="text-xs text-ec-muted mt-1 tabular-nums">ID {p.id}</div>
          </div>
          <Pill status={p.status} />
        </div>

        <div className="bg-ec-card2 border border-ec-line rounded-xl p-3.5 space-y-1.5 text-[13px]">
          <Row k="Valor" v={fmtBRL(p.transaction_amount)} strong />
          {p.net_received_amount != null && <Row k="Líquido" v={fmtBRL(p.net_received_amount)} />}
          {Number(p.fee_amount) > 0 && <Row k="Taxas" v={fmtBRL(p.fee_amount)} />}
          <Row k="Método" v={`${METHOD[p.payment_type_id] || p.payment_type_id}${(p.installments || 1) > 1 ? ` ${p.installments}x` : ''}${p.card_last_four ? ` · final ${p.card_last_four}` : ''}`} />
          <Row k="Data" v={fmtWhen(p.date_created)} />
          {!!p.payer_email && <Row k="Pagador" v={p.payer_email} small />}
          {!!info && info.refunded > 0 && <Row k="Já estornado" v={fmtBRL(info.refunded)} />}
          {!!info && mode !== 'view' && !isCancel && <Row k="Disponível p/ estorno" v={fmtBRL(info.refundable)} strong />}
        </div>

        {mode === 'view' && canAct && (
          <button onClick={start} disabled={busy} className="w-full h-12 rounded-xl bg-ec-yellow text-black text-[13px] font-black tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} {isCancel ? 'Cancelar pagamento' : 'Estornar'}
          </button>
        )}

        {mode === 'amount' && info && (
          <>
            <div>
              <Label>Valor do estorno (R$)</Label>
              <div className="flex gap-2">
                <input type="text" inputMode="decimal" autoFocus value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder="0,00" className={inputCls + ' flex-1 min-w-0 text-lg font-black tabular-nums'} />
                <button onClick={() => setAmount(info.refundable.toFixed(2).replace('.', ','))} className={btnGhost + ' px-3 text-xs flex-shrink-0'}>Valor total</button>
              </div>
              {!!amount && !ok && <div className="text-xs text-ec-red mt-1.5">{value > info.refundable ? `Máximo disponível: ${fmtBRL(info.refundable)}` : 'Valor inválido.'}</div>}
            </div>
            <button onClick={() => setMode('confirm')} disabled={!ok} className="w-full h-12 rounded-xl bg-ec-yellow text-black text-[13px] font-black tracking-wider uppercase active:scale-[0.98] disabled:opacity-40">Prosseguir</button>
          </>
        )}

        {mode === 'confirm' && info && (
          <>
            <div className="text-center py-1">
              <div className="text-sm font-bold">{isCancel ? 'Cancelar este pagamento pendente?' : total ? 'Confirmar estorno total?' : 'Confirmar estorno parcial?'}</div>
              {!isCancel && <div className="text-3xl font-black text-ec-yellow tabular-nums mt-1.5">{fmtBRL(value)}</div>}
              <div className="text-xs text-ec-muted mt-2">A ação é irreversível.</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setMode(isCancel ? 'view' : 'amount')} disabled={busy} className={btnGhost}>Voltar</button>
              <button onClick={confirm} disabled={busy} className="h-12 rounded-xl bg-ec-yellow text-black text-[13px] font-black tracking-wider uppercase flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Confirmar
              </button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

// ─── Contas ─────────────────────────────────────────────

function ContasTab({ send, toast, online, creds, activeSlot, onChanged }: Common & { onChanged: () => void }) {
  const [busy, setBusy] = useState<number | null>(null)
  const sorted = useMemo(() => [...creds].sort((a, b) => Number(b.slot === activeSlot) - Number(a.slot === activeSlot)), [creds, activeSlot])

  async function activate(slot: number) {
    setBusy(slot)
    try { await send('mp:set-active-slot', { slot }); toast(`Slot ${slot} ativado no PC`, 'ok'); onChanged() }
    catch (e: any) { toast(e.message, 'err') }
    finally { setBusy(null) }
  }

  if (!online && creds.length === 0) return <Empty icon={KeyRound} text="Conecte ao PC para ver as contas." />
  if (creds.length === 0) return <Loading />

  const banned = creds.filter(c => c.banned).length
  return (
    <div className="space-y-3">
      <div className="text-xs text-ec-dim">
        {creds.length} {creds.length === 1 ? 'conta conectada' : 'contas conectadas'} no PC{banned ? <span className="text-ec-red"> · {banned} banida{banned > 1 ? 's' : ''}</span> : null}
      </div>
      {sorted.map(c => {
        const isActive = c.slot === activeSlot
        const problem = !c.banned && c.health_status === 'error'
        return (
          <div key={c.slot} className={`rounded-xl border overflow-hidden ${
            c.banned ? 'border-ec-red/55 bg-gradient-to-br from-ec-red/[0.12] to-ec-card'
            : isActive ? 'ec-slot-live border-ec-yellow/70 bg-gradient-to-br from-ec-yellow/[0.14] to-ec-card'
            : 'border-ec-green/25 bg-gradient-to-br from-ec-green/[0.05] to-ec-card'}`}>
            {isActive && (
              <div className="px-4 py-1.5 bg-ec-yellow/15 border-b border-ec-yellow/35 text-[11px] font-black tracking-[0.2em] text-ec-yellow uppercase text-center">
                Em uso · cobrando agora
              </div>
            )}
            <div className="p-3.5 flex items-center gap-3">
              <span className={`w-11 h-11 rounded-lg border text-base font-black flex items-center justify-center flex-shrink-0 ${
                c.banned ? 'border-ec-red/50 bg-ec-red/15 text-ec-red'
                : isActive ? 'border-ec-yellow bg-ec-yellow/20 text-ec-yellow'
                : 'border-ec-green/40 bg-ec-green/10 text-ec-green'}`}>{c.slot}</span>
              <span className="flex-1 min-w-0">
                <span className={`block text-sm font-bold truncate ${c.banned ? 'text-ec-red' : ''}`}>{c.name}</span>
                <span className={`block text-xs mt-0.5 truncate ${c.banned ? 'text-ec-red-soft' : problem ? 'text-ec-orange' : 'text-ec-green'}`}>
                  {c.banned ? 'Banida pelo Mercado Pago' : problem ? (c.health_message || 'Com problema') : 'Conectada'}
                </span>
              </span>
              {!c.banned && !isActive && (
                <button onClick={() => activate(c.slot)} disabled={!online || busy !== null}
                  className="h-10 px-3.5 rounded-lg border border-ec-red/40 bg-ec-red/10 text-ec-red text-xs font-bold tracking-wider uppercase flex items-center gap-1.5 active:scale-95 disabled:opacity-40 flex-shrink-0">
                  {busy === c.slot ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} fill="currentColor" />} Ativar
                </button>
              )}
            </div>
          </div>
        )
      })}
      <div className="text-xs text-ec-muted text-center pt-1 leading-relaxed">
        Para conectar ou remover contas, use o app no computador.
      </div>
    </div>
  )
}
