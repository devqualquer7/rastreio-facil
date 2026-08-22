'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, CheckCircle2, XCircle, TestTube2, Zap, Trash2, Copy, Sparkles, Pencil, Check, X, Plus, User, Shield, ChevronDown, AlertTriangle, RefreshCw, Link2, ExternalLink } from 'lucide-react'
import { SectionTitle, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { cn, fmtDate } from '@/lib/ec-utils'

export function Credentials() {
  const { creds, refreshCreds, toast } = useApp()
  const [testing, setTesting] = useState<number | null>(null)
  const [activating, setActivating] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [origin, setOrigin] = useState('')
  const [checkingAll, setCheckingAll] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newToken, setNewToken] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  useEffect(() => { refreshCreds(); setOrigin(window.location.origin) }, [])

  async function test(slot: number) {
    setTesting(slot)
    try {
      const r = await fetch('/api/ec/creds/test', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slot })
      })
      const d = await r.json()
      if (d.ok) toast('success', `Slot #${slot} conectado (${d.nickname || d.mpUserId})`)
      else toast('error', d.error || 'Falha')
    } finally { setTesting(null); refreshCreds() }
  }

  async function checkAllHealth() {
    setCheckingAll(true)
    try {
      const r = await fetch('/api/ec/health/check', { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        toast('success', `${d.checked} contas verificadas · ${d.newlyBanned?.length || 0} banidas`)
        refreshCreds()
      }
    } catch { toast('error', 'Falha na verificação') }
    finally { setCheckingAll(false) }
  }

  async function setActive(slot: number) {
    setActivating(slot)
    try {
      const r = await fetch('/api/ec/creds/setactive', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slot })
      })
      const d = await r.json()
      if (d.ok) { toast('success', `Slot #${slot} ativado`); refreshCreds() }
      else toast('error', d.error || 'Falha')
    } finally { setActivating(null) }
  }

  async function remove(slot: number) {
    if (!confirm(`Remover slot #${slot}?`)) return
    const r = await fetch('/api/ec/creds/delete', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot })
    })
    const d = await r.json()
    if (d.ok) { toast('success', 'Slot removido'); refreshCreds() }
  }

  function startEdit(slot: number, currentName: string) {
    setEditing(slot); setEditName(currentName)
  }
  function cancelEdit() { setEditing(null); setEditName('') }

  async function saveEdit(slot: number) {
    if (!editName.trim()) { toast('error', 'Nome vazio'); return }
    const r = await fetch('/api/ec/creds/rename', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot, name: editName.trim() })
    })
    const d = await r.json()
    if (d.ok) { toast('success', 'Nome atualizado'); refreshCreds(); cancelEdit() }
    else toast('error', d.error || 'Falha')
  }

  async function addManual() {
    if (!newToken.trim()) { toast('error', 'Access Token obrigatório'); return }
    setAddLoading(true)
    try {
      const r = await fetch('/api/ec/creds/save', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accessToken: newToken.trim(), name: newName.trim() })
      })
      const d = await r.json()
      if (d.ok) {
        toast('success', `Slot #${d.slot} criado e ativado`)
        setNewName(''); setNewToken(''); setAddOpen(false)
        refreshCreds()
      } else {
        toast('error', d.error || 'Falha')
      }
    } finally { setAddLoading(false) }
  }

  const bannedCount = creds.filter(c => c.health_status === 'banned').length

  return (
    <div>
      <SectionTitle
        icon={<Key size={18} />}
        title="Credenciais MP"
        subtitle={`${creds.length} contas · slots ilimitados${bannedCount > 0 ? ` · ${bannedCount} banidas` : ''}`}
        action={<>
          <Button variant="outline" size="md" icon={<RefreshCw size={13} />} onClick={checkAllHealth} loading={checkingAll}>
            VERIFICAR TUDO
          </Button>
          <Button variant="outline" size="md" icon={<Copy size={13} />}
            onClick={() => { navigator.clipboard.writeText(`${origin}/key`); toast('success', 'URL copiada') }}>
            URL DA /KEY
          </Button>
        </>}
      />

      {bannedCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-gradient-to-br from-red-500/15 via-red-500/8 to-transparent border-2 border-red-500/40 rounded-2xl p-4 mb-6">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-red-500/20 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/50 text-red-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(239,68,68,.3)]">
              <AlertTriangle size={16} />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-red-400 tracking-wide mb-1">
                {bannedCount === 1 ? '1 conta banida detectada' : `${bannedCount} contas banidas detectadas`}
              </div>
              <div className="text-xs font-mono text-zinc-500 leading-relaxed">
                O Mercado Pago revogou o(s) token(s). <span className="text-red-400 font-semibold">Remova o slot</span> ou substitua por um token novo.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Form manual */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/12 via-cyan-400/6 to-transparent border border-purple-500/30 rounded-2xl mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />

        <button onClick={() => setAddOpen(v => !v)}
          className="relative w-full p-5 flex items-center gap-3 text-left hover:bg-purple-500/5 transition">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/30 to-cyan-400/20 border border-purple-500/40 text-purple-300 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(168,85,247,.25)]">
            <Plus size={18} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-purple-300 tracking-wide">Adicionar conta manualmente</div>
            <div className="text-xs font-mono text-zinc-500 leading-relaxed mt-0.5">
              Cole o Access Token direto aqui — cria um slot novo instantaneamente.
            </div>
          </div>
          <ChevronDown size={18} className={cn('text-purple-400 transition-transform flex-shrink-0', addOpen && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {addOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="relative overflow-hidden">
              <div className="p-5 pt-0 space-y-4 border-t border-purple-500/15">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-start gap-2.5 mt-4">
                  <Shield size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-[11px] font-mono text-zinc-500 leading-relaxed">
                    O token é <span className="text-emerald-400">criptografado</span> antes de salvar. Se o mesmo <span className="text-zinc-400">mp_user_id</span> já existir, o slot é atualizado.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] font-mono font-semibold tracking-[0.25em] text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                      <User size={11} /> Nome da conta (opcional)
                    </div>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="Ex: MEI Antonio" maxLength={60}
                      onKeyDown={e => e.key === 'Enter' && addManual()}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 focus:bg-purple-500/[0.04] transition-all" />
                  </div>
                  <div>
                    <div className="text-[10px] font-mono font-semibold tracking-[0.25em] text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                      <Key size={11} /> Access Token
                    </div>
                    <input type="password" value={newToken} onChange={e => setNewToken(e.target.value)}
                      placeholder="APP_USR-xxx-xxx-xxx-xxx"
                      onKeyDown={e => e.key === 'Enter' && addManual()}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 focus:bg-purple-500/[0.04] transition-all" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={() => { setAddOpen(false); setNewName(''); setNewToken('') }}
                    className="px-4 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 text-xs font-mono tracking-widest transition uppercase">
                    Cancelar
                  </button>
                  <button onClick={addManual} disabled={addLoading || !newToken.trim()}
                    className="relative px-6 py-3 rounded-xl bg-gradient-to-br from-violet-700 via-purple-500 to-cyan-300 text-white font-black tracking-wide text-sm shadow-[0_0_20px_rgba(168,85,247,.4)] hover:shadow-[0_0_35px_rgba(168,85,247,.6)] active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2 uppercase">
                    <Sparkles size={14} />
                    {addLoading ? 'Validando…' : 'Criar Slot'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* OAuth Link Section */}
      {origin && (
        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent border border-cyan-500/25 rounded-2xl mb-6 p-5">
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(34,211,238,.2)]">
              <Link2 size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-cyan-300 tracking-wide mb-0.5">Link OAuth para trabalhadores</div>
              <div className="text-[10px] font-mono text-zinc-500 leading-relaxed mb-3">
                Compartilhe este link com os trabalhadores. Eles clicam, inserem o nome da conta e autorizam o Mercado Pago — sem precisar colar tokens.
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-400 truncate">
                  {origin}/checkout/oauth
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${origin}/checkout/oauth`); toast('success', 'Link copiado!') }}
                  className="p-2.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 transition flex-shrink-0"
                  title="Copiar link">
                  <Copy size={13} />
                </button>
                <a href={`${origin}/checkout/oauth`} target="_blank" rel="noreferrer"
                  className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.08] transition flex-shrink-0"
                  title="Abrir página OAuth">
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {creds.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <Key size={32} className="text-zinc-600 mx-auto mb-3" />
          <div className="font-bold text-sm text-zinc-500 mb-1">Nenhuma conta cadastrada</div>
          <div className="text-xs font-mono text-zinc-600">Use o form acima ou a URL /key.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {creds.map((c, i) => {
            const active = c.is_active
            const banned = c.health_status === 'banned'
            const tokenRevoked = banned && c.health_message?.toLowerCase().includes('token')
            const isEditing = editing === c.slot

            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 22 }}>
                <div className={cn('relative rounded-2xl transition-all',
                  banned ? 'p-[1.5px] bg-gradient-to-br from-red-500 via-red-500/50 to-red-500'
                  : active ? 'p-[1.5px] bg-gradient-to-br from-purple-500 via-cyan-400 to-purple-500' : '')}>
                  <div className={cn('relative rounded-[calc(1rem-2px)] overflow-hidden transition-all',
                    banned ? 'bg-gradient-to-br from-[#0d0d14] via-red-500/8 to-red-500/12 shadow-[0_0_40px_rgba(239,68,68,.35)]'
                    : active ? 'bg-gradient-to-br from-[#0d0d14] via-purple-500/5 to-cyan-400/5 shadow-[0_0_30px_rgba(168,85,247,.25)]'
                    : c.connected ? 'bg-[#0d0d14] border border-emerald-500/25 hover:border-emerald-500/50'
                    : 'bg-[#0a0a0f] border border-[#1a1a28] hover:border-[#252538]')}>

                    {banned && (
                      <div className="relative bg-gradient-to-r from-red-500/40 via-red-500/30 to-red-500/40 border-b border-red-500/50 px-5 py-3 flex items-center justify-center gap-2">
                        <AlertTriangle size={14} className="text-red-400" />
                        <div className="font-black text-xs tracking-[0.3em] text-red-400 uppercase">
                          {tokenRevoked ? '⚠ Token Revogado · Reconecte via OAuth ⚠' : '⚠ Conta Banida pelo Mercado Pago ⚠'}
                        </div>
                        <AlertTriangle size={14} className="text-red-400" />
                      </div>
                    )}

                    {!banned && active && (
                      <div className="relative bg-gradient-to-r from-purple-500/30 via-cyan-400/25 to-purple-500/30 border-b border-purple-500/40 px-5 py-3 flex items-center justify-center gap-2">
                        <Zap size={14} className="text-purple-300" fill="currentColor" />
                        <div className="font-black text-xs tracking-[0.3em] text-purple-300 uppercase">ATIVO · Cobrando por este slot</div>
                        <Zap size={14} className="text-purple-300" fill="currentColor" />
                      </div>
                    )}

                    <div className="relative p-5">
                      {banned ? (
                        <>
                          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-red-500/25 blur-3xl pointer-events-none" />
                          <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-red-500/15 blur-3xl pointer-events-none" />
                        </>
                      ) : active ? (
                        <>
                          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
                          <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
                        </>
                      ) : null}

                      <div className="relative flex items-center gap-3 mb-4">
                        <div className={cn('relative w-12 h-12 rounded-xl border-2 flex items-center justify-center font-black text-lg tabular flex-shrink-0',
                          banned ? 'bg-red-500/20 border-red-500/60 text-red-400 shadow-[0_0_20px_rgba(239,68,68,.4)]'
                          : active ? 'bg-gradient-to-br from-violet-700 to-purple-500 border-purple-400/60 text-white shadow-[0_0_20px_rgba(168,85,247,.5)]'
                          : c.connected ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-white/[0.04] border-white/[0.08] text-zinc-500')}>
                          {c.slot}
                        </div>

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' ? saveEdit(c.slot) : e.key === 'Escape' ? cancelEdit() : null}
                                maxLength={60} autoFocus
                                className="flex-1 min-w-0 bg-white/[0.04] border border-purple-500/40 rounded-lg px-2.5 py-1.5 text-sm font-bold text-zinc-100 outline-none focus:shadow-[0_0_0_3px_rgba(168,85,247,.15)]" />
                              <button onClick={() => saveEdit(c.slot)}
                                className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition"
                                title="Salvar"><Check size={13} /></button>
                              <button onClick={cancelEdit}
                                className="w-7 h-7 rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-500 hover:text-zinc-300 flex items-center justify-center transition"
                                title="Cancelar"><X size={13} /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={cn('font-bold text-sm truncate flex-1',
                                banned ? 'text-red-400' : active ? 'text-white' : 'text-zinc-200')}>
                                {c.name}
                              </div>
                              <button onClick={() => startEdit(c.slot, c.name)}
                                className="w-6 h-6 rounded-md text-zinc-600 hover:text-purple-400 hover:bg-purple-500/10 flex items-center justify-center transition flex-shrink-0"
                                title="Editar nome"><Pencil size={11} /></button>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            {banned ? (
                              <><AlertTriangle size={11} className="text-red-400" />
                                <span className="text-[10px] font-mono text-red-400 tracking-wider font-bold">
                                  {tokenRevoked ? 'TOKEN REVOGADO · Reconecte' : 'BANIDA pelo Mercado Pago'}
                                </span></>
                            ) : c.connected ? (
                              <><CheckCircle2 size={11} className="text-emerald-400" />
                                <span className="text-[10px] font-mono text-emerald-500 tracking-wider">Conectado</span></>
                            ) : (
                              <><XCircle size={11} className="text-amber-500" />
                                <span className="text-[10px] font-mono text-amber-500 tracking-wider">Desconectado</span></>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="relative space-y-1 mb-4">
                        {c.mp_user_id && (
                          <div className="text-[10px] font-mono text-zinc-600 tracking-wider">
                            <span className="text-zinc-700">MP User ID:</span> <span className="text-zinc-500 tabular">{c.mp_user_id}</span>
                          </div>
                        )}
                        {c.last_test_at && (
                          <div className="text-[10px] font-mono text-zinc-700 tracking-wider">
                            Último teste: <span className="text-zinc-600 tabular">{fmtDate(c.last_test_at)}</span>
                          </div>
                        )}
                        {banned && c.health_message && (
                          <div className="text-[10px] font-mono text-red-400/80 tracking-wider mt-1 pt-1 border-t border-red-500/20">
                            <span className="text-red-400/60">MP:</span> {c.health_message}
                          </div>
                        )}
                      </div>

                      <div className="relative">
                        {banned ? (
                          <div className="space-y-2">
                            <button onClick={() => remove(c.slot)}
                              className="relative w-full py-3.5 rounded-xl bg-gradient-to-br from-red-700 via-red-500 to-red-700 text-white font-black tracking-widest text-sm shadow-[0_0_25px_rgba(239,68,68,.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase">
                              <Trash2 size={14} /> Remover Slot Banido
                            </button>
                            <Button variant="ghost" size="sm" icon={<TestTube2 size={11} />}
                              onClick={() => test(c.slot)} loading={testing === c.slot} className="w-full">
                              Retestar
                            </Button>
                          </div>
                        ) : active ? (
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" icon={<TestTube2 size={11} />}
                              onClick={() => test(c.slot)} loading={testing === c.slot} className="flex-1">
                              TESTAR CONEXÃO
                            </Button>
                            <button onClick={() => remove(c.slot)}
                              className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 flex items-center justify-center transition"
                              title="Remover"><Trash2 size={13} /></button>
                          </div>
                        ) : c.connected ? (
                          <div className="space-y-2">
                            <button onClick={() => setActive(c.slot)} disabled={activating === c.slot}
                              className="relative w-full py-3.5 rounded-xl bg-gradient-to-br from-violet-700 via-purple-500 to-cyan-300 text-white font-black tracking-widest text-sm shadow-[0_0_25px_rgba(168,85,247,.4)] hover:shadow-[0_0_40px_rgba(168,85,247,.6)] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 uppercase">
                              <Sparkles size={15} />
                              {activating === c.slot ? 'ATIVANDO…' : 'ATIVAR ESTE SLOT'}
                              <Zap size={15} fill="white" />
                            </button>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" icon={<TestTube2 size={11} />}
                                onClick={() => test(c.slot)} loading={testing === c.slot} className="flex-1">
                                Testar
                              </Button>
                              <button onClick={() => remove(c.slot)}
                                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-red-500/10 border border-white/[0.08] hover:border-red-500/30 text-zinc-600 hover:text-red-400 flex items-center justify-center transition"
                                title="Remover"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Button variant="outline" size="lg" icon={<TestTube2 size={13} />}
                              onClick={() => test(c.slot)} loading={testing === c.slot} className="w-full">
                              RECONECTAR
                            </Button>
                            <button onClick={() => remove(c.slot)}
                              className="w-full text-[10px] font-mono text-zinc-600 hover:text-red-400 tracking-widest py-1 transition uppercase">
                              Remover slot
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
