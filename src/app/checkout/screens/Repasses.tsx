'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HandCoins, RefreshCw, Copy, Check, AlertTriangle, ChevronDown, Trophy, TrendingUp, Wallet, Undo2, ShoppingBag, Settings2,
} from 'lucide-react'
import { SectionTitle, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtBRL, fmtDate, cn } from '@/lib/ec-utils'

type Period = 'today' | 'week' | 'month' | 'year' | 'custom'

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
  { id: 'year', label: 'Ano' },
  { id: 'custom', label: 'Período' },
]

const CARD = 'bg-ec-card border border-ec-line rounded-2xl'

async function postJson(url: string, body: unknown) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return r.json()
}

function SetupNotice() {
  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200 flex gap-3">
      <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
      <div>
        <div className="font-bold mb-1">Falta criar as tabelas do painel</div>
        <div className="text-xs leading-relaxed text-amber-200/80">
          Rode o arquivo <span className="font-bold">ec-repasses-migration.sql</span> no SQL Editor do Supabase e atualize esta tela.
        </div>
      </div>
    </div>
  )
}

/** Linha com o dado à vista e o botão de copiar ao lado: o que se copia é o que se vê. */
function CopyRow({ step, label, value, shown, empty }: { step: number; label: string; value: string; shown?: string; empty?: string }) {
  const { toast } = useApp()
  const [done, setDone] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      toast('success', `${label} copiado`)
      setTimeout(() => setDone(false), 1500)
    } catch { toast('error', 'Não consegui copiar. Selecione o texto.') }
  }
  return (
    <div className="flex items-center gap-3 rounded-xl bg-ec-card2 pl-3 pr-1.5 py-1.5 min-h-[48px]">
      <span className="w-5 h-5 rounded-full bg-ec-line text-[10px] font-bold text-ec-dim flex items-center justify-center flex-shrink-0">{step}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-ec-muted">{label}</div>
        {value
          ? <div className="text-sm text-ec-text break-all leading-snug">{shown ?? value}</div>
          : <div className="text-xs text-amber-300 leading-snug">{empty}</div>}
      </div>
      {value && (
        <button onClick={copy}
          className={cn('h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 flex-shrink-0 active:scale-95 transition border',
            done ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' : 'border-ec-line text-ec-text bg-ec-card hover:border-ec-dim')}>
          {done ? <Check size={13} /> : <Copy size={13} />} {done ? 'Copiado' : 'Copiar'}
        </button>
      )}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ec-red/40 to-ec-red/10 border border-ec-red/30 text-ec-text font-black text-sm flex items-center justify-center flex-shrink-0 uppercase">
      {name.slice(0, 1)}
    </div>
  )
}

function UserCard({ user, payouts, onChanged }: { user: any; payouts: any[]; onChanged: () => void }) {
  const { toast } = useApp()
  const [confirming, setConfirming] = useState(false)
  const [paying, setPaying] = useState(false)
  const [open, setOpen] = useState(false)
  const [percent, setPercent] = useState(user.percent ?? '')
  const [saving, setSaving] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setPercent(user.percent ?? '') }, [user.percent])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const needsPercent = user.percent == null
  const canPay = user.balance > 0 && user.missingPercent === 0
  const mine = payouts.filter(p => p.username === user.username)

  function askPay() {
    setConfirming(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setConfirming(false), 5000)
  }

  async function pay() {
    setPaying(true)
    try {
      const d = await postJson('/api/ec/repasses/pay', { username: user.username, maxId: user.maxId, amount: user.balance })
      if (d.ok) {
        toast('success', d.notified ? `Pago · ${user.username} foi avisado` : `Pago · ${user.username} não tem Pushover ativo`)
        onChanged()
      } else {
        toast('error', d.error || 'Falha ao registrar')
        onChanged()
      }
    } catch { toast('error', 'Erro de rede') }
    finally { setPaying(false); setConfirming(false) }
  }

  async function savePercent() {
    setSaving(true)
    try {
      const d = await postJson('/api/ec/repasses/user', { username: user.username, percent })
      if (d.ok) { toast('success', 'Porcentagem salva'); onChanged() }
      else toast('error', d.error || 'Falha ao salvar')
    } catch { toast('error', 'Erro de rede') }
    finally { setSaving(false) }
  }

  async function confirmPix() {
    const d = await postJson('/api/ec/repasses/user', { username: user.username, confirmPix: true }).catch(() => null)
    if (d?.ok) onChanged(); else toast('error', 'Falha ao confirmar')
  }

  async function undo(id: number) {
    if (!confirm('Desfazer este pagamento? O valor volta para o saldo.')) return
    const d = await postJson('/api/ec/repasses/undo', { payoutId: id }).catch(() => null)
    if (d?.ok) { toast('success', 'Pagamento desfeito'); onChanged() }
    else toast('error', d?.error || 'Falha ao desfazer')
  }

  const hasBalance = user.balance !== 0 || user.missingPercent > 0
  const pixChanged = !!user.pix?.changed

  return (
    <div className={cn(CARD, 'overflow-hidden', !hasBalance && 'bg-ec-card/60')}>
      <div className="p-4 flex items-center gap-3">
        <Avatar name={user.username} />
        <div className="min-w-0 flex-1">
          <div className="font-bold text-ec-text truncate">{user.username}</div>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-bold',
              needsPercent ? 'bg-amber-500/15 text-amber-300' : 'bg-ec-card2 text-ec-dim')}>
              {needsPercent ? 'sem %' : `${user.percent}%`}
            </span>
            {hasBalance && (
              <span className="text-xs text-ec-dim">{user.sales} {user.sales === 1 ? 'venda' : 'vendas'}</span>
            )}
            {user.refunds > 0 && <span className="text-xs text-red-400">{user.refunds} estorno{user.refunds > 1 ? 's' : ''}</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-ec-muted">A receber</div>
          <div className={cn('text-xl font-black tabular-nums leading-tight',
            user.balance < 0 ? 'text-red-400' : user.balance > 0 ? 'text-emerald-400' : 'text-ec-muted')}>
            {fmtBRL(user.balance)}
          </div>
        </div>
        <button onClick={() => setOpen(v => !v)} title="Porcentagem e histórico"
          className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border transition',
            open ? 'border-ec-red/40 text-ec-red bg-ec-red/10' : 'border-ec-line text-ec-dim hover:text-ec-text')}>
          <Settings2 size={15} />
        </button>
      </div>

      {hasBalance && (
        <div className="px-4 pb-4 space-y-2.5">
          {!needsPercent && user.gross !== 0 && (
            <div className="text-xs text-ec-dim">
              {fmtBRL(user.gross)} em vendas pendentes · parte de {user.percent}%
            </div>
          )}
          {user.balance < 0 && (
            <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">Estorno maior que o saldo: desconta das próximas vendas.</div>
          )}
          {user.missingPercent > 0 && (
            <button onClick={() => setOpen(true)}
              className="w-full text-left rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {user.missingPercent} {user.missingPercent === 1 ? 'venda está' : 'vendas estão'} sem %. <span className="underline font-bold">Definir agora</span>
            </button>
          )}
          {pixChanged && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><AlertTriangle size={13} /> Chave trocada em {fmtDate(user.pix.updatedAt)}</span>
              <button onClick={confirmPix} className="font-bold underline flex-shrink-0">Confirmei</button>
            </div>
          )}

          {user.balance > 0 && (
            <>
              <CopyRow step={1} label="Chave Pix" value={user.pix?.key || ''}
                empty={`Ainda não cadastrada. ${user.username} cadastra em Meus ganhos.`} />
              <CopyRow step={2} label="Valor" value={user.balance.toFixed(2).replace('.', ',')} shown={fmtBRL(user.balance)} />
              {confirming ? (
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <button onClick={pay} disabled={paying}
                    className="h-12 rounded-xl bg-emerald-500 text-black text-sm font-black flex items-center justify-center gap-2 active:scale-[.98] transition disabled:opacity-60">
                    {paying ? <RefreshCw size={15} className="animate-spin" /> : <Check size={16} />}
                    Confirmar {fmtBRL(user.balance)}
                  </button>
                  <button onClick={() => setConfirming(false)} className="h-12 px-4 rounded-xl border border-ec-line text-xs font-bold text-ec-dim">
                    Voltar
                  </button>
                </div>
              ) : (
                <button onClick={askPay} disabled={!canPay}
                  className="w-full h-12 rounded-xl border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 text-sm font-black flex items-center justify-center gap-2 active:scale-[.98] transition disabled:opacity-40 hover:bg-emerald-500/25">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/25 text-[10px] flex items-center justify-center">3</span>
                  Já fiz o Pix · marcar como pago
                </button>
              )}
            </>
          )}
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-ec-line space-y-3 bg-ec-card2/30">
          <div>
            <div className="ec-label pb-1.5">Parte do usuário (%)</div>
            <div className="flex gap-2">
              <input type="number" inputMode="decimal" min={0} max={100} step="0.5" value={percent}
                onChange={e => setPercent(e.target.value)} placeholder="70"
                className="flex-1 min-w-0 h-11 rounded-xl border border-ec-line bg-ec-card2 px-3 text-sm text-ec-text outline-none focus:border-ec-red/50" />
              <Button variant="accent" size="md" onClick={savePercent} loading={saving}>SALVAR</Button>
            </div>
            <div className="text-xs text-ec-dim mt-1.5">Vale para as próximas vendas. As já registradas mantêm a % da época.</div>
          </div>
          <div>
            <div className="ec-label pb-1.5">Pagamentos feitos</div>
            {mine.length === 0 ? (
              <div className="text-xs text-ec-dim">Nenhum pagamento ainda.</div>
            ) : (
              <div className="space-y-1.5">
                {mine.slice(0, 10).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-xs rounded-lg bg-ec-card2 px-3 py-2">
                    <span className="text-ec-dim">{fmtDate(p.created_at)}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-bold text-ec-text tabular-nums">{fmtBRL(Number(p.amount))}</span>
                      {i === 0 && (
                        <button onClick={() => undo(p.id)} title="Desfazer" className="text-ec-muted hover:text-red-400 p-1">
                          <Undo2 size={13} />
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const CHECK_GROUPS: { id: string; label: string; dot: string }[] = [
  { id: 'counted', label: 'Já no saldo dos usuários', dot: 'bg-emerald-400' },
  { id: 'repaired', label: 'Faltavam e foram adicionadas agora', dot: 'bg-emerald-400' },
  { id: 'beforePanel', label: 'Antes do painel existir (não contam)', dot: 'bg-amber-400' },
  { id: 'admin', label: 'Suas vendas (sem repasse)', dot: 'bg-sky-400' },
  { id: 'noOwner', label: 'Do exe ou fora do site (sem repasse)', dot: 'bg-ec-dim' },
]

function DayCheck({ reload }: { reload: () => void }) {
  const { toast } = useApp()
  const [res, setRes] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    try {
      const r = await fetch('/api/ec/repasses/check')
      const d = await r.json()
      if (d.ok) { setRes(d); if (d.groups.repaired.count) reload() }
      else toast('error', d.error || 'Falha ao conferir')
    } catch { toast('error', 'Erro de rede') }
    finally { setBusy(false) }
  }

  const shown = res ? CHECK_GROUPS.filter(g => res.groups[g.id].count > 0) : []
  const failing = res ? res.accounts.filter((a: any) => a.failed || a.error) : []

  return (
    <div className="border-t border-ec-line pt-3 mt-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-ec-dim min-w-0">
          {res
            ? failing.length ? <span className="text-red-300">{failing.length} conta(s) com erro no Mercado Pago</span>
              : <span className="flex items-center gap-1.5"><Check size={13} className="text-emerald-400" /> Conferido com o Mercado Pago</span>
            : 'O saldo é conferido com o Mercado Pago a cada 5 minutos.'}
        </div>
        <button onClick={run} disabled={busy}
          className="h-8 px-3 rounded-lg border border-ec-line text-[11px] font-bold text-ec-dim hover:text-ec-text flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50">
          <RefreshCw size={12} className={cn(busy && 'animate-spin')} /> Conferir hoje
        </button>
      </div>
      {res && (
        <div className="mt-3 rounded-xl bg-ec-card2/60 p-3 space-y-2 text-xs">
          {shown.length === 0 && <div className="text-ec-dim">Nenhuma venda aprovada hoje no Mercado Pago.</div>}
          {shown.map(g => (
            <div key={g.id} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-ec-dim min-w-0">
                <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', g.dot)} />{g.label}
              </span>
              <span className="tabular-nums text-ec-text flex-shrink-0">
                <span className="text-ec-muted">{res.groups[g.id].count}×</span> <b>{fmtBRL(res.groups[g.id].gross)}</b>
              </span>
            </div>
          ))}
          {failing.map((a: any) => (
            <div key={a.slot} className="text-red-300 break-all">{a.name || `slot #${a.slot}`}: {a.failed || a.error}</div>
          ))}
          <div className="text-ec-muted pt-1">Saldo conta vendas desde {res.start ? fmtDate(res.start) : '—'}</div>
        </div>
      )}
    </div>
  )
}

function ToPay({ data, reload }: { data: any; reload: () => void }) {
  const users: any[] = data.users
  const withBalance = users.filter(u => u.balance !== 0 || u.missingPercent > 0)
  const settled = users.filter(u => !withBalance.includes(u))
  const toPay = withBalance.filter(u => u.balance > 0)
  const total = users.reduce((s, u) => s + Math.max(u.balance, 0), 0)
  const pendingSales = withBalance.reduce((s, u) => s + u.sales, 0)
  const noPix = toPay.filter(u => !u.pix?.key).length
  const [showAll, setShowAll] = useState(false)

  return (
    <div className="space-y-4">
      <div className={cn(CARD, 'p-5')}
        style={{ backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(16,185,129,.12), transparent 45%)' }}>
        <div className="text-xs text-ec-dim">Total a pagar agora</div>
        <div className="text-4xl font-black text-emerald-400 tabular-nums mt-1 tracking-tight">{fmtBRL(total)}</div>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-2.5 py-1 rounded-lg bg-ec-card2 text-xs text-ec-text">
            <b>{toPay.length}</b> {toPay.length === 1 ? 'pessoa aguardando' : 'pessoas aguardando'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-ec-card2 text-xs text-ec-text">
            <b>{pendingSales}</b> {pendingSales === 1 ? 'venda pendente' : 'vendas pendentes'}
          </span>
          {noPix > 0 && (
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-xs text-amber-300">
              {noPix} sem chave Pix
            </span>
          )}
        </div>
        <DayCheck reload={reload} />
      </div>

      {withBalance.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {withBalance.map(u => <UserCard key={u.username} user={u} payouts={data.payouts} onChanged={reload} />)}
        </div>
      )}

      {settled.length > 0 && (
        <div>
          <button onClick={() => setShowAll(v => !v)}
            className="w-full h-11 rounded-xl border border-dashed border-ec-line text-xs text-ec-dim flex items-center justify-center gap-1.5 hover:text-ec-text">
            {showAll ? 'Esconder' : 'Ver'} {settled.length} {settled.length === 1 ? 'pessoa' : 'pessoas'} sem nada a receber
            <ChevronDown size={13} className={cn('transition-transform', showAll && 'rotate-180')} />
          </button>
          {showAll && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3 items-start">
              {settled.map(u => <UserCard key={u.username} user={u} payouts={data.payouts} onChanged={reload} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Metric({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={cn(CARD, 'p-3 min-w-0')}>
      <div className="flex items-center gap-1.5 text-xs text-ec-dim">{icon} {label}</div>
      <div className={cn('text-[15px] sm:text-xl font-black tabular-nums mt-1.5 break-words', color)}>{value}</div>
      {sub && <div className="text-xs text-ec-dim mt-0.5">{sub}</div>}
    </div>
  )
}

function Summary({ data, period, setPeriod, from, to, setFrom, setTo }: {
  data: any; period: Period; setPeriod: (p: Period) => void
  from: string; to: string; setFrom: (s: string) => void; setTo: (s: string) => void
}) {
  const s = data.summary
  const maxBar = Math.max(1, ...s.series.map((b: any) => Math.abs(b.gross)))
  const fmtKey = (k: string) => data.groupBy === 'month' ? `${k.slice(5)}/${k.slice(2, 4)}` : `${k.slice(8)}/${k.slice(5, 7)}`

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto">
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={cn('px-3.5 h-9 rounded-lg text-xs font-bold flex-shrink-0 border transition',
              period === p.id ? 'border-ec-red/50 bg-ec-red/10 text-ec-red' : 'border-ec-line bg-ec-card2 text-ec-dim')}>
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="De"
            className="h-11 min-w-0 rounded-xl border border-ec-line bg-ec-card2 px-3 text-sm text-ec-text outline-none" />
          <input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Até"
            className="h-11 min-w-0 rounded-xl border border-ec-line bg-ec-card2 px-3 text-sm text-ec-text outline-none" />
        </div>
      )}

      {s.missingPercent > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {s.missingPercent} {s.missingPercent === 1 ? 'lançamento' : 'lançamentos'} sem % configurada: até definir, conta inteiro como sua parte.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={<TrendingUp size={14} />} label="Faturamento" value={fmtBRL(s.gross)} sub={`${s.sales} vendas`} color="text-ec-text" />
        <Metric icon={<HandCoins size={14} />} label="Sua parte" value={fmtBRL(s.myShare)} color="text-emerald-400" />
        <Metric icon={<Wallet size={14} />} label="Dos usuários" value={fmtBRL(s.userShare)} color="text-amber-400" />
        <Metric icon={<Undo2 size={14} />} label="Estornos" value={fmtBRL(s.refunds)} color="text-red-400" />
      </div>

      <div className={cn(CARD, 'p-4')}>
        <div className="flex items-center gap-2 font-bold text-sm text-ec-text mb-3"><Trophy size={15} className="text-amber-400" /> Top 3</div>
        {s.ranking.length === 0 ? (
          <div className="text-xs text-ec-dim">Nenhuma venda neste período.</div>
        ) : (
          <div className="space-y-3">
            {s.ranking.slice(0, 3).map((u: any, i: number) => (
              <div key={u.username}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="truncate text-ec-text">{i + 1}. {u.username}</span>
                  <span className="font-bold tabular-nums text-ec-text flex-shrink-0">{fmtBRL(u.gross)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-ec-card2 mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${Math.max(2, (Math.max(u.gross, 0) / Math.max(s.ranking[0].gross, 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {s.series.length > 1 && (
        <div className={cn(CARD, 'p-4')}>
          <div className="font-bold text-sm text-ec-text mb-3">{data.groupBy === 'month' ? 'Por mês' : 'Por dia'}</div>
          <div className="space-y-1.5">
            {s.series.map((b: any) => (
              <div key={b.key} className="grid grid-cols-[48px_1fr_92px] items-center gap-2 text-xs">
                <span className="text-ec-muted tabular-nums">{fmtKey(b.key)}</span>
                <div className="h-2 rounded-full bg-ec-card2 overflow-hidden">
                  <div className={cn('h-full rounded-full', b.gross < 0 ? 'bg-red-500' : 'bg-emerald-500')}
                    style={{ width: `${(Math.abs(b.gross) / maxBar) * 100}%` }} />
                </div>
                <span className={cn('text-right tabular-nums', b.gross < 0 ? 'text-red-400' : 'text-ec-text')}>{fmtBRL(b.gross)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={cn(CARD, 'p-4')}>
        <div className="flex items-center gap-2 font-bold text-sm text-ec-text mb-3"><ShoppingBag size={15} /> Quanto cada um rendeu</div>
        {s.ranking.length === 0 ? (
          <div className="text-xs text-ec-dim">Nenhuma venda neste período.</div>
        ) : (
          <div className="divide-y divide-ec-line">
            {s.ranking.map((u: any) => (
              <div key={u.username} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-bold text-ec-text truncate">{u.username}</span>
                  <span className="font-bold text-emerald-400 tabular-nums flex-shrink-0">{fmtBRL(u.myShare)}</span>
                </div>
                <div className="text-xs text-ec-dim mt-0.5">
                  {u.sales} vendas · {fmtBRL(u.gross)} · parte do usuário {fmtBRL(u.userShare)}
                  {u.refunds < 0 && <span className="text-red-400"> · estornos {fmtBRL(u.refunds)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function Repasses() {
  const { toast } = useApp()
  const [tab, setTab] = useState<'pay' | 'summary'>('pay')
  const [period, setPeriod] = useState<Period>('today')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ period })
      if (period === 'custom' && from && to) { params.set('from', from); params.set('to', to) }
      const r = await fetch(`/api/ec/repasses?${params}`)
      const d = await r.json()
      if (d.ok) setData(d)
      else toast('error', d.error || 'Falha ao carregar')
    } catch { toast('error', 'Erro de rede') }
    finally { setLoading(false) }
  }, [period, from, to, toast])

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  return (
    <div>
      <SectionTitle
        icon={<HandCoins size={18} />}
        title="Repasses"
        subtitle="Saldo de cada usuário e quanto rendeu para você"
        action={<Button variant="outline" size="md" icon={<RefreshCw size={13} />} onClick={load} loading={loading}>ATUALIZAR</Button>}
      />

      {data?.needsSetup ? <SetupNotice /> : !data ? (
        <div className="py-14 flex items-center justify-center gap-3 text-xs text-ec-dim">
          <RefreshCw size={16} className="animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-1 mb-4 rounded-xl border border-ec-line bg-ec-card2/50 p-1">
            {([['pay', 'A pagar'], ['summary', 'Resumo']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn('h-10 rounded-lg text-xs font-bold transition', tab === id ? 'bg-ec-red/15 text-ec-red' : 'text-ec-dim')}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'pay'
            ? <ToPay data={data} reload={load} />
            : <Summary data={data} period={period} setPeriod={setPeriod} from={from} to={to} setFrom={setFrom} setTo={setTo} />}
        </>
      )}
    </div>
  )
}
