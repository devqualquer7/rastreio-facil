'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, CheckCircle2, XCircle, TestTube2, Zap, Trash2, Copy, Sparkles, Pencil, Check, X, Plus, User, Shield, ChevronDown, AlertTriangle, RefreshCw, Link2, ExternalLink, Lock, LockOpen } from 'lucide-react'
import { SectionTitle, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { cn, fmtDate } from '@/lib/ec-utils'

export function Credentials() {
  const { creds, refreshCreds, toast, isAdmin } = useApp()
  const [locking, setLocking] = useState<number | null>(null)
  const [lockNew, setLockNew] = useState(false)
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

  // Admin: lê se as contas novas estão configuradas para chegar bloqueadas
  useEffect(() => {
    if (!isAdmin) return
    fetch('/api/ec/creds/list').then(r => r.json()).then(d => { if (d.ok) setLockNew(!!d.lockNew) }).catch(() => {})
  }, [isAdmin])

  async function toggleLock(slot: number, locked: boolean) {
    setLocking(slot)
    try {
      const r = await fetch('/api/ec/creds/lock', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slot, locked })
      })
      const d = await r.json()
      if (d.ok) { toast('success', locked ? `Slot #${slot} bloqueado — só você usa` : `Slot #${slot} liberado para os usuários`); refreshCreds() }
      else toast('error', d.error || 'Falha')
    } catch { toast('error', 'Erro de rede') }
    finally { setLocking(null) }
  }

  async function toggleLockNew() {
    const next = !lockNew
    try {
      const r = await fetch('/api/ec/creds/lock', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lockNew: next })
      })
      const d = await r.json()
      if (d.ok) { setLockNew(next); toast('success', next ? 'Contas novas vão chegar bloqueadas' : 'Contas novas vão chegar liberadas') }
      else toast('error', d.error || 'Falha')
    } catch { toast('error', 'Erro de rede') }
  }

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
        subtitle={`${creds.length} contas · slots ilimitados${bannedCount > 0 ? ` · ${bannedCount} banidas` : ''}${isAdmin && creds.some(c => c.locked) ? ` · ${creds.filter(c => c.locked).length} bloqueadas` : ''}`}
        action={<>
          {isAdmin && (
            <Button variant={lockNew ? 'danger' : 'outline'} size="md" icon={lockNew ? <Lock size={13} /> : <LockOpen size={13} />} onClick={toggleLockNew}>
              {lockNew ? 'NOVAS: BLOQUEADAS' : 'NOVAS: LIBERADAS'}
            </Button>
          )}
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
              <div className="text-xs font-mono text-zinc-400 leading-relaxed">
                O Mercado Pago revogou o(s) token(s). <span className="text-red-400 font-semibold">Remova o slot</span> ou substitua por um token novo.
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Form manual */}
      <div className="relative overflow-hidden bg-ec-card border border-ec-line rounded-xl mb-4">

        <button onClick={() => setAddOpen(v => !v)}
          className="relative w-full p-4 flex items-center gap-3 text-left hover:bg-ec-card2 transition">
          <div className="w-10 h-10 rounded-lg bg-ec-red/10 border border-ec-red/30 text-ec-red flex items-center justify-center flex-shrink-0">
            <Plus size={18} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm text-ec-text tracking-wide">Adicionar conta manualmente</div>
            <div className="text-xs font-mono text-zinc-400 leading-relaxed mt-0.5">
              Cole o Access Token direto aqui — cria um slot novo instantaneamente.
            </div>
          </div>
          <ChevronDown size={18} className={cn('text-ec-dim transition-transform flex-shrink-0', addOpen && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {addOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="relative overflow-hidden">
              <div className="p-5 pt-0 space-y-4 border-t border-red-500/15">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-start gap-2.5 mt-4">
                  <Shield size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-[13px] font-mono text-zinc-400 leading-relaxed">
                    O token é <span className="text-emerald-400">criptografado</span> antes de salvar. Se o mesmo <span className="text-zinc-400">mp_user_id</span> já existir, o slot é atualizado.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-mono font-semibold tracking-[0.25em] text-zinc-400 uppercase mb-2 flex items-center gap-1.5">
                      <User size={11} /> Nome da conta (opcional)
                    </div>
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                      placeholder="Ex: MEI Antonio" maxLength={60}
                      onKeyDown={e => e.key === 'Enter' && addManual()}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 focus:bg-red-500/[0.04] transition-all" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-semibold tracking-[0.25em] text-zinc-400 uppercase mb-2 flex items-center gap-1.5">
                      <Key size={11} /> Access Token
                    </div>
                    <input type="password" value={newToken} onChange={e => setNewToken(e.target.value)}
                      placeholder="APP_USR-xxx-xxx-xxx-xxx"
                      onKeyDown={e => e.key === 'Enter' && addManual()}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 focus:bg-red-500/[0.04] transition-all" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={() => { setAddOpen(false); setNewName(''); setNewToken('') }}
                    className="px-4 py-2 rounded-lg text-zinc-400 hover:text-zinc-300 text-xs font-mono tracking-widest transition uppercase">
                    Cancelar
                  </button>
                  <button onClick={addManual} disabled={addLoading || !newToken.trim()}
                    className="px-5 py-2.5 rounded-lg bg-ec-red-deep hover:bg-ec-red hover:shadow-ec-glow-sm text-white font-bold tracking-widest text-xs active:scale-95 disabled:opacity-40 transition-all flex items-center gap-2 uppercase">
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
        <div className="relative overflow-hidden bg-ec-card border border-ec-line rounded-xl mb-6 p-4">
          <div className="relative flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-ec-blue/10 border border-ec-blue/30 text-ec-blue flex items-center justify-center flex-shrink-0">
              <Link2 size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-ec-text tracking-wide mb-0.5">Link OAuth para trabalhadores</div>
              <div className="text-xs font-mono text-zinc-400 leading-relaxed mb-3">
                Compartilhe este link com os trabalhadores. Eles clicam, inserem o nome da conta e autorizam o Mercado Pago — sem precisar colar tokens.
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] font-mono text-zinc-400 truncate">
                  {origin}/checkout/oauth
                </div>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${origin}/checkout/oauth`); toast('success', 'Link copiado!') }}
                  className="p-2.5 rounded-xl bg-ec-card2 border border-ec-line text-ec-dim hover:text-ec-text hover:border-ec-line-glow transition flex-shrink-0"
                  title="Copiar link">
                  <Copy size={13} />
                </button>
                <a href={`${origin}/checkout/oauth`} target="_blank" rel="noreferrer"
                  className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.08] transition flex-shrink-0"
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
          <Key size={32} className="text-zinc-500 mx-auto mb-3" />
          <div className="font-bold text-sm text-zinc-400 mb-1">Nenhuma conta cadastrada</div>
          <div className="text-xs font-mono text-zinc-500">Use o form acima ou a URL /key.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
          {[...creds].sort((a, b) => Number(!!b.is_active) - Number(!!a.is_active)).map((c, i) => {
            const active = c.is_active
            const banned = c.health_status === 'banned'
            const tokenRevoked = banned && c.health_message?.toLowerCase().includes('token')
            const isEditing = editing === c.slot

            // Mesma leitura do app desktop: amarelo = ativa, verde = conectada, vermelho = banida
            const tone = banned ? 'banned' : active ? 'active' : c.connected ? 'ok' : 'off'
            // Visual do cartão: conta bloqueada (e não ativa/banida) ganha o tema roxo "vidro".
            // `tone` continua decidindo os botões; `look` só a aparência.
            const look = (tone === 'ok' || tone === 'off') && c.locked ? 'locked' : tone

            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.2 }}
                className={cn('relative rounded-xl border overflow-hidden transition-all flex flex-col',
                  look === 'banned' && 'bg-gradient-to-br from-ec-red/[0.12] to-ec-card border-ec-red/60 shadow-[0_0_30px_rgba(255,43,74,.25)]',
                  look === 'active' && 'ec-slot-live bg-gradient-to-br from-ec-yellow/[0.16] via-ec-card to-ec-card border-ec-yellow/70',
                  look === 'ok'     && 'bg-gradient-to-br from-ec-green/[0.06] to-ec-card border-ec-green/30 hover:border-ec-green/60 hover:shadow-[0_0_24px_rgba(0,227,150,.18)] hover:-translate-y-0.5',
                  look === 'off'    && 'bg-ec-card border-ec-line hover:border-ec-line-glow',
                  look === 'locked' && 'ec-slot-locked bg-gradient-to-br from-ec-purple/[0.16] via-ec-card to-ec-card border-ec-purple/55 backdrop-blur-md')}>

                {look === 'locked' && (
                  <>
                    {/* brilho diagonal de "vidro" por cima do cartão */}
                    <div className="pointer-events-none absolute inset-0"
                      style={{ background: 'linear-gradient(135deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,0) 38%, rgba(162,155,254,.06) 100%)' }} />
                    <div className="ec-shine relative flex items-center justify-center gap-2 px-4 py-2 border-b border-ec-purple/35 backdrop-blur-md"
                      style={{ background: 'linear-gradient(90deg, rgba(162,155,254,.08), rgba(162,155,254,.26), rgba(162,155,254,.08))' }}>
                      <Lock size={13} className="text-ec-purple" />
                      <span className="text-xs font-black tracking-[0.3em] text-ec-purple uppercase">Bloqueado</span>
                      <span className="text-[11px] font-mono text-ec-purple/70">· só você usa</span>
                    </div>
                  </>
                )}

                {tone === 'active' && (
                  <div className="ec-shine flex items-center justify-center gap-2 px-4 py-2 bg-ec-yellow/15 border-b border-ec-yellow/40">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full rounded-full bg-ec-yellow opacity-75 animate-ping" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-ec-yellow" />
                    </span>
                    <span className="text-xs font-black tracking-[0.25em] text-ec-yellow uppercase">Em uso · cobrando agora</span>
                    <Zap size={12} className="text-ec-yellow" fill="currentColor" />
                  </div>
                )}

                <div className="p-4 flex items-start gap-3">
                  <div className={cn('w-11 h-11 rounded-lg border flex items-center justify-center font-black text-base tabular flex-shrink-0',
                    look === 'banned' && 'bg-ec-red/15 border-ec-red/50 text-ec-red',
                    look === 'active' && 'bg-ec-yellow/20 border-ec-yellow text-ec-yellow shadow-[0_0_18px_rgba(255,200,61,.55)]',
                    look === 'ok'     && 'bg-ec-green/10 border-ec-green/40 text-ec-green',
                    look === 'off'    && 'bg-ec-card2 border-ec-line text-ec-dim',
                    look === 'locked' && 'bg-ec-purple/15 border-ec-purple/60 text-ec-purple shadow-[0_0_16px_rgba(162,155,254,.45)]')}>
                    {c.slot}
                  </div>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' ? saveEdit(c.slot) : e.key === 'Escape' ? cancelEdit() : null}
                          maxLength={60} autoFocus
                          className="flex-1 min-w-0 bg-ec-input border border-ec-red/50 rounded-lg px-2.5 py-1.5 text-sm font-bold text-ec-text outline-none" />
                        <button onClick={() => saveEdit(c.slot)}
                          className="w-8 h-8 rounded-md bg-ec-green/15 border border-ec-green/40 text-ec-green hover:bg-ec-green/25 flex items-center justify-center transition"
                          title="Salvar"><Check size={14} /></button>
                        <button onClick={cancelEdit}
                          className="w-8 h-8 rounded-md bg-ec-card2 border border-ec-line text-ec-dim hover:text-ec-text flex items-center justify-center transition"
                          title="Cancelar"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={cn('font-bold text-[15px] leading-tight truncate', banned ? 'text-ec-red' : 'text-ec-text')}
                          title={c.name}>
                          {c.name}
                        </div>
                        <button onClick={() => startEdit(c.slot, c.name)}
                          className="w-6 h-6 rounded-md text-ec-muted hover:text-ec-text hover:bg-ec-card2 flex items-center justify-center transition flex-shrink-0"
                          title="Editar nome"><Pencil size={12} /></button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {tone === 'banned' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-ec-red/50 bg-ec-red/15 text-ec-red text-[11px] font-bold tracking-wider uppercase">
                          <AlertTriangle size={11} /> {tokenRevoked ? 'Token revogado' : 'Banida'}
                        </span>
                      )}
                      {tone === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-ec-yellow/50 bg-ec-yellow/15 text-ec-yellow text-[11px] font-bold tracking-wider uppercase">
                          <Zap size={11} fill="currentColor" /> Ativa
                        </span>
                      )}
                      {c.locked && look !== 'locked' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-ec-purple/50 bg-ec-purple/15 text-ec-purple text-[11px] font-bold tracking-wider uppercase"
                          title="Os outros usuários não veem nem usam esta conta">
                          <Lock size={11} /> Só você
                        </span>
                      )}
                      {!banned && (c.connected ? (
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-ec-green">
                          <CheckCircle2 size={12} /> Conectada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-mono text-ec-orange">
                          <XCircle size={12} /> Desconectada
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-3 space-y-1 text-xs font-mono text-ec-dim flex-1">
                  {c.mp_user_id && (
                    <div className="flex justify-between gap-3">
                      <span className="text-ec-muted">MP User ID</span>
                      <span className="tabular truncate">{c.mp_user_id}</span>
                    </div>
                  )}
                  {c.last_test_at && (
                    <div className="flex justify-between gap-3">
                      <span className="text-ec-muted">Último teste</span>
                      <span className="tabular">{fmtDate(c.last_test_at)}</span>
                    </div>
                  )}
                  {banned && c.health_message && (
                    <div className="text-ec-red-soft pt-2 mt-2 border-t border-ec-red/20 leading-relaxed">
                      {tokenRevoked ? 'Reconecte a conta via OAuth. ' : ''}{c.health_message}
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 border-t border-white/[0.06] bg-black/20 flex items-center gap-2">
                  {tone === 'banned' && (
                    <button onClick={() => remove(c.slot)}
                      className="flex-1 h-9 rounded-lg bg-ec-red-deep hover:bg-ec-red text-white text-xs font-bold tracking-widest uppercase transition active:scale-95 flex items-center justify-center gap-1.5">
                      <Trash2 size={13} /> Remover slot
                    </button>
                  )}
                  {tone === 'active' && (
                    <div className="flex-1 text-xs font-mono text-ec-yellow/90 truncate">Os links gerados caem nesta conta</div>
                  )}
                  {tone === 'ok' && (
                    <button onClick={() => setActive(c.slot)} disabled={activating === c.slot}
                      className="flex-1 h-9 rounded-lg border border-ec-red/40 bg-ec-red/10 hover:bg-ec-red-deep hover:border-ec-red text-ec-red hover:text-white text-xs font-bold tracking-widest uppercase transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <Zap size={13} fill="currentColor" /> {activating === c.slot ? 'Ativando…' : 'Ativar'}
                    </button>
                  )}
                  {tone === 'off' && (
                    <button onClick={() => test(c.slot)} disabled={testing === c.slot}
                      className="flex-1 h-9 rounded-lg border border-ec-line bg-ec-card2 hover:border-ec-line-glow text-ec-text text-xs font-bold tracking-widest uppercase transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <RefreshCw size={13} className={testing === c.slot ? 'animate-spin' : ''} /> Reconectar
                    </button>
                  )}

                  {tone !== 'off' && (
                    <button onClick={() => test(c.slot)} disabled={testing === c.slot}
                      className="h-9 px-3 rounded-lg border border-ec-line bg-ec-card2 hover:border-ec-line-glow text-ec-dim hover:text-ec-text text-xs font-bold tracking-wider uppercase transition disabled:opacity-50 flex items-center gap-1.5"
                      title="Testar conexão">
                      <TestTube2 size={13} className={testing === c.slot ? 'animate-pulse' : ''} />
                      {testing === c.slot ? 'Testando…' : 'Testar'}
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => toggleLock(c.slot, !c.locked)} disabled={locking === c.slot}
                      className={cn('w-9 h-9 rounded-lg border flex items-center justify-center transition flex-shrink-0 disabled:opacity-50',
                        c.locked
                          ? 'border-ec-purple/50 bg-ec-purple/15 text-ec-purple hover:bg-ec-purple/25'
                          : 'border-ec-line bg-ec-card2 text-ec-muted hover:text-ec-purple hover:border-ec-purple/40')}
                      title={c.locked ? 'Bloqueada — clique para liberar aos usuários' : 'Liberada — clique para bloquear (só você usa)'}>
                      {c.locked ? <Lock size={13} /> : <LockOpen size={13} />}
                    </button>
                  )}
                  {tone !== 'banned' && (
                    <button onClick={() => remove(c.slot)}
                      className="w-9 h-9 rounded-lg border border-ec-line bg-ec-card2 hover:bg-ec-red/10 hover:border-ec-red/40 text-ec-muted hover:text-ec-red flex items-center justify-center transition flex-shrink-0"
                      title="Remover slot"><Trash2 size={13} /></button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
