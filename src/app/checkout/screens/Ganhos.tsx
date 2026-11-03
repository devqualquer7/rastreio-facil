'use client'
import { useCallback, useEffect, useState } from 'react'
import { Coins, RefreshCw, Save, ArrowDownLeft, Undo2 } from 'lucide-react'
import { SectionTitle, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtBRL, fmtDate, cn } from '@/lib/ec-utils'

const CARD = 'bg-ec-card border border-ec-line rounded-2xl'

function entryStatus(e: any): { label: string; color: string } {
  if (e.settled) return { label: 'Antes do painel', color: 'text-ec-muted' }
  if (e.payout_id) return { label: 'Pago', color: 'text-emerald-400' }
  return { label: 'Pendente', color: 'text-amber-400' }
}

export function Ganhos() {
  const { toast } = useApp()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pix, setPix] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'sales' | 'payouts'>('sales')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/ec/me/ganhos')
      const d = await r.json()
      if (d.ok) setData(d)
      else toast('error', d.error || 'Falha ao carregar')
    } catch { toast('error', 'Erro de rede') }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  // Não apaga o que a pessoa está digitando quando a tela atualiza sozinha.
  useEffect(() => { if (!dirty) setPix(data?.pix?.key || '') }, [data, dirty])

  async function savePix() {
    setSaving(true)
    try {
      const r = await fetch('/api/ec/me/ganhos', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pixKey: pix }),
      })
      const d = await r.json()
      if (d.ok) { toast('success', 'Chave Pix salva'); setDirty(false); load() }
      else toast('error', d.error || 'Falha ao salvar')
    } catch { toast('error', 'Erro de rede') }
    finally { setSaving(false) }
  }

  const periods = data && !data.needsSetup ? [
    { label: 'Hoje', ...data.today },
    { label: 'Semana', ...data.week },
    { label: 'Mês', ...data.month },
  ] : []

  return (
    <div className="space-y-4">
      <SectionTitle
        icon={<Coins size={18} />}
        title="Meus ganhos"
        subtitle="Seu saldo, suas vendas e seus pagamentos"
        action={<Button variant="outline" size="md" icon={<RefreshCw size={13} />} onClick={load} loading={loading}>ATUALIZAR</Button>}
      />

      {data && !data.needsSetup && (
        <div className={cn(CARD, 'p-4')}>
          <div className="ec-label">A receber</div>
          <div className={cn('text-3xl font-black tabular-nums mt-1', data.balance < 0 ? 'text-red-400' : 'text-emerald-400')}>
            {fmtBRL(data.balance)}
          </div>
          <div className="text-xs text-ec-dim mt-1">
            {data.pendingSales} {data.pendingSales === 1 ? 'venda pendente' : 'vendas pendentes'}
            {data.percent != null ? ` · sua parte: ${data.percent}%` : ' · % ainda não definida'}
            {' · '}já recebido: {fmtBRL(data.paidTotal)}
          </div>
          {data.balance < 0 && (
            <div className="text-xs text-red-300 mt-2">Um estorno passou do saldo: o valor desconta das próximas vendas.</div>
          )}
        </div>
      )}

      <div className={cn(CARD, 'p-4')}>
        <div className="ec-label pb-1.5">Sua chave Pix</div>
        <div className="flex gap-2">
          <input value={pix} onChange={e => { setPix(e.target.value); setDirty(true) }}
            placeholder="CPF, e-mail, celular ou chave aleatória" maxLength={140} autoComplete="off"
            className="flex-1 min-w-0 h-11 rounded-xl border border-ec-line bg-ec-card2 px-3 text-sm text-ec-text outline-none focus:border-ec-red/50" />
          <Button variant="accent" size="md" icon={<Save size={13} />} onClick={savePix} loading={saving}>SALVAR</Button>
        </div>
        <div className="text-xs text-ec-dim mt-1.5">Os repasses são enviados para esta chave. Confira antes de salvar.</div>
      </div>

      {!data ? (
        <div className="py-10 flex items-center justify-center gap-3 text-xs text-ec-dim">
          <RefreshCw size={16} className="animate-spin" /> Carregando…
        </div>
      ) : data.needsSetup ? (
        <div className={cn(CARD, 'p-4 text-xs text-ec-dim')}>Seus ganhos aparecem aqui assim que o painel for ativado.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {periods.map(p => (
              <div key={p.label} className={cn(CARD, 'p-4')}>
                <div className="ec-label">{p.label}</div>
                <div className="text-xl font-black text-ec-text tabular-nums mt-1">{fmtBRL(p.share)}</div>
                <div className="text-xs text-ec-dim mt-0.5">
                  {p.sales} {p.sales === 1 ? 'venda' : 'vendas'} · {fmtBRL(p.gross)}
                  {p.refunds < 0 && <span className="text-red-400"> · estornos {fmtBRL(p.refunds)}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl border border-ec-line bg-ec-card2/50 p-1">
            {([['sales', 'Vendas'], ['payouts', 'Pagamentos recebidos']] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={cn('h-10 rounded-lg text-xs font-bold transition', tab === id ? 'bg-ec-red/15 text-ec-red' : 'text-ec-dim')}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'sales' ? (
            <div className={cn(CARD, 'divide-y divide-ec-line')}>
              {data.entries.length === 0 && <div className="p-4 text-xs text-ec-dim">Nenhuma venda ainda.</div>}
              {data.entries.map((e: any) => {
                const st = entryStatus(e)
                const refund = e.kind === 'reversal'
                return (
                  <div key={e.id} className="p-3.5 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-ec-text truncate flex items-center gap-1.5">
                        {refund && <Undo2 size={13} className="text-red-400 flex-shrink-0" />}
                        <span className="truncate">{refund ? `Estorno · ${e.title || 'venda'}` : e.title || 'Venda'}</span>
                      </div>
                      <div className="text-xs text-ec-dim mt-0.5">{fmtDate(e.occurred_at)} · {fmtBRL(Number(e.gross))}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={cn('text-sm font-bold tabular-nums', Number(e.user_share) < 0 ? 'text-red-400' : 'text-ec-text')}>
                        {fmtBRL(Number(e.user_share))}
                      </div>
                      <div className={cn('text-xs mt-0.5', st.color)}>{st.label}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={cn(CARD, 'divide-y divide-ec-line')}>
              {data.payouts.length === 0 && <div className="p-4 text-xs text-ec-dim">Nenhum pagamento recebido ainda.</div>}
              {data.payouts.map((p: any) => (
                <div key={p.id} className="p-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm text-ec-text flex items-center gap-1.5">
                      <ArrowDownLeft size={13} className="text-emerald-400 flex-shrink-0" /> Repasse recebido
                    </div>
                    <div className="text-xs text-ec-dim mt-0.5">{fmtDate(p.created_at)} · {p.entries_count} lançamentos</div>
                    {p.pix_key && <div className="text-xs text-ec-dim mt-0.5 break-all">Chave: {p.pix_key}</div>}
                  </div>
                  <div className="text-sm font-bold text-emerald-400 tabular-nums flex-shrink-0">{fmtBRL(Number(p.amount))}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
