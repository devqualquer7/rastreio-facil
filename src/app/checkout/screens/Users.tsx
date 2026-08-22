'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users as UsersIcon, Key, Plus, Trash2, RefreshCw, Copy, Link2,
  UserPlus, ExternalLink, Shield, Check, X, ChevronDown, Eye, EyeOff,
  Ticket, AlertTriangle, CheckCircle2, Clock
} from 'lucide-react'
import { SectionTitle, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { fmtDate, cn } from '@/lib/ec-utils'

type Tab = 'usuarios' | 'chaves'

export function Users() {
  const { toast, username: me } = useApp()
  const [tab, setTab] = useState<Tab>('usuarios')

  // ── Users state ─────────────────────────────────────────────────────────────
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [newUser, setNewUser] = useState('')
  const [newPass, setNewPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // ── Keys state ───────────────────────────────────────────────────────────────
  const [keys, setKeys] = useState<any[]>([])
  const [loadingKeys, setLoadingKeys] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    setOrigin(window.location.origin)
    loadUsers()
    loadKeys()
  }, [])

  // ── Users API ────────────────────────────────────────────────────────────────
  async function loadUsers() {
    setLoadingUsers(true)
    try {
      const r = await fetch('/api/ec/users')
      const d = await r.json()
      if (d.ok) setUsers(d.users)
    } catch { toast('error', 'Falha ao carregar usuários') }
    finally { setLoadingUsers(false) }
  }

  async function createUser() {
    if (!newUser.trim()) { toast('error', 'Username obrigatório'); return }
    if (!newPass.trim()) { toast('error', 'Senha obrigatória'); return }
    setCreating(true)
    try {
      const r = await fetch('/api/ec/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: newUser.trim(), password: newPass.trim() }),
      })
      const d = await r.json()
      if (d.ok) {
        toast('success', `Usuário "${newUser.trim()}" criado`)
        setNewUser(''); setNewPass(''); setAddOpen(false)
        loadUsers()
      } else {
        toast('error', d.error || 'Falha')
      }
    } finally { setCreating(false) }
  }

  async function deleteUser(username: string) {
    if (!confirm(`Remover usuário "${username}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(username)
    try {
      const r = await fetch('/api/ec/users', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const d = await r.json()
      if (d.ok) { toast('success', `Usuário removido`); loadUsers() }
      else toast('error', d.error || 'Falha')
    } finally { setDeleting(null) }
  }

  // ── Keys API ─────────────────────────────────────────────────────────────────
  async function loadKeys() {
    setLoadingKeys(true)
    try {
      const r = await fetch('/api/ec/regkeys')
      const d = await r.json()
      if (d.ok) setKeys(d.keys)
    } catch { toast('error', 'Falha ao carregar chaves') }
    finally { setLoadingKeys(false) }
  }

  async function generateKey() {
    setGenerating(true)
    try {
      const r = await fetch('/api/ec/regkeys', { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        toast('success', 'Nova chave gerada')
        loadKeys()
      } else toast('error', d.error || 'Falha')
    } catch { toast('error', 'Erro ao gerar chave') }
    finally { setGenerating(false) }
  }

  async function revokeKey(token: string) {
    if (!confirm('Revogar esta chave?')) return
    try {
      const r = await fetch('/api/ec/regkeys', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const d = await r.json()
      if (d.ok) { toast('success', 'Chave revogada'); loadKeys() }
      else toast('error', d.error || 'Falha')
    } catch { toast('error', 'Falha') }
  }

  function copyRegLink(token: string) {
    navigator.clipboard.writeText(`${origin}/checkout/register?key=${token}`)
    toast('success', 'Link copiado!')
  }

  const activeKeys = keys.filter(k => !k.used && !k.revoked)
  const usedKeys   = keys.filter(k => k.used || k.revoked)

  return (
    <div>
      <SectionTitle
        icon={<UsersIcon size={18} />}
        title="Usuários"
        subtitle="Gerencie acessos ao painel"
        action={
          <Button variant="outline" size="md" icon={<RefreshCw size={13} />}
            onClick={() => { loadUsers(); loadKeys() }} loading={loadingUsers || loadingKeys}>
            ATUALIZAR
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-1.5">
        {([
          { id: 'usuarios' as Tab, label: 'Usuários',       icon: UsersIcon },
          { id: 'chaves'   as Tab, label: 'Chaves de Acesso', icon: Ticket },
        ] as const).map(t => {
          const Icon = t.icon; const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-mono font-bold tracking-widest uppercase transition-all flex-1 justify-center',
                active
                  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.03]'
              )}>
              <Icon size={12} className={active ? 'text-purple-400' : ''} />
              {t.label}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'usuarios' ? (
          <motion.div key="users" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

            {/* Create user accordion */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/12 via-cyan-400/6 to-transparent border border-purple-500/30 rounded-2xl mb-5">
              <button onClick={() => setAddOpen(v => !v)}
                className="relative w-full p-5 flex items-center gap-3 text-left hover:bg-purple-500/5 transition">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-cyan-400/20 border border-purple-500/40 text-purple-300 flex items-center justify-center flex-shrink-0">
                  <UserPlus size={16} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm text-purple-300">Criar usuário diretamente</div>
                  <div className="text-[10px] font-mono text-zinc-500 mt-0.5">Admin define username e senha — sem chave de convite</div>
                </div>
                <ChevronDown size={16} className={cn('text-purple-400 transition-transform flex-shrink-0', addOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {addOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="p-5 pt-0 border-t border-purple-500/15 space-y-4">
                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-start gap-2 mt-4">
                        <Shield size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div className="text-[10px] font-mono text-zinc-500">A senha é <span className="text-emerald-400">criptografada</span> com bcrypt antes de salvar.</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2">Username</div>
                          <input type="text" value={newUser} onChange={e => setNewUser(e.target.value)}
                            placeholder="ex: joao_silva" maxLength={40}
                            onKeyDown={e => e.key === 'Enter' && createUser()}
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 transition-all" />
                        </div>
                        <div>
                          <div className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2">Senha</div>
                          <div className="relative">
                            <input type={showPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)}
                              placeholder="Mín. 6 caracteres" minLength={6}
                              onKeyDown={e => e.key === 'Enter' && createUser()}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-12 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 transition-all" />
                            <button onClick={() => setShowPass(v => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition">
                              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button onClick={() => { setAddOpen(false); setNewUser(''); setNewPass('') }}
                          className="px-4 py-2 rounded-lg text-zinc-500 hover:text-zinc-300 text-xs font-mono tracking-widest uppercase transition">
                          Cancelar
                        </button>
                        <Button variant="accent" size="md" icon={<UserPlus size={13} />}
                          onClick={createUser} loading={creating}>
                          CRIAR USUÁRIO
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Users list */}
            <div className="bg-gradient-to-br from-[#0d0d14] to-[#0a0a0f] border border-purple-500/10 rounded-2xl overflow-hidden">
              {loadingUsers ? (
                <div className="py-14 flex items-center justify-center gap-3">
                  <RefreshCw size={18} className="animate-spin text-purple-400" />
                  <span className="text-xs font-mono text-zinc-500">Carregando…</span>
                </div>
              ) : users.length === 0 ? (
                <div className="py-14 text-center">
                  <UsersIcon size={28} className="text-zinc-700 mx-auto mb-3" />
                  <div className="text-xs font-mono text-zinc-600">Nenhum usuário encontrado</div>
                </div>
              ) : (
                <div className="divide-y divide-purple-500/[0.05]">
                  <div className="hidden md:grid grid-cols-[2fr_1fr_auto] px-5 py-3 text-[10px] font-mono font-bold tracking-widest text-zinc-600 uppercase border-b border-purple-500/10">
                    <div>Usuário</div>
                    <div>Criado em</div>
                    <div>Ações</div>
                  </div>
                  {users.map((u, i) => (
                    <motion.div key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      className="px-5 py-4 grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-2 md:gap-0 items-center hover:bg-purple-500/[0.02] transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/30 to-cyan-400/20 border border-purple-500/25 flex items-center justify-center font-black text-xs text-purple-300">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-zinc-200">{u.username}</div>
                          {u.username === me && (
                            <div className="text-[9px] font-mono text-purple-400 tracking-widest uppercase">você</div>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-600 tabular">{fmtDate(u.created_at)}</div>
                      <div>
                        {u.username !== me ? (
                          <button onClick={() => deleteUser(u.username)} disabled={deleting === u.username}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 hover:bg-red-500/20 transition text-[10px] font-mono font-bold tracking-widest uppercase disabled:opacity-40">
                            {deleting === u.username ? <RefreshCw size={10} className="animate-spin" /> : <Trash2 size={10} />}
                            Remover
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-700">—</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

        ) : (
          <motion.div key="keys" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

            {/* Info + generate */}
            <div className="relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-transparent border border-cyan-500/20 rounded-2xl mb-5 p-5">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <div className="font-bold text-sm text-cyan-300 mb-1 flex items-center gap-2">
                    <Ticket size={14} /> Como funcionam as chaves
                  </div>
                  <div className="text-[10px] font-mono text-zinc-500 leading-relaxed">
                    Gere uma chave e compartilhe o link com o trabalhador. Ele acessa o link, escolhe username e senha, e a chave vira inválida automaticamente. Uma chave = um cadastro.
                  </div>
                  <div className="mt-2 text-[10px] font-mono text-zinc-600">
                    Página de cadastro: <span className="text-zinc-400">{origin}/checkout/register</span>
                  </div>
                </div>
                <Button variant="accent" size="md" icon={<Plus size={13} />} onClick={generateKey} loading={generating} className="flex-shrink-0">
                  GERAR CHAVE
                </Button>
              </div>
            </div>

            {/* Active keys */}
            {activeKeys.length > 0 && (
              <div className="mb-6">
                <div className="text-[10px] font-mono font-bold tracking-[0.3em] text-zinc-600 uppercase mb-3 flex items-center gap-2">
                  <CheckCircle2 size={11} className="text-emerald-500" /> Chaves disponíveis ({activeKeys.length})
                </div>
                <div className="space-y-2">
                  {activeKeys.map(k => (
                    <motion.div key={k.token} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-emerald-500/[0.05] border border-emerald-500/20 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Key size={11} className="text-emerald-400 flex-shrink-0" />
                          <div className="text-[11px] font-mono text-zinc-400 tabular truncate">{k.token}</div>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-700">
                          Gerada por <span className="text-zinc-500">{k.created_by ?? '—'}</span>
                          {k.created_at ? ` · ${fmtDate(k.created_at)}` : ''}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-600 mt-0.5 truncate">
                          {origin}/checkout/register?key={k.token}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => copyRegLink(k.token)}
                          className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/25 transition"
                          title="Copiar link">
                          <Copy size={12} />
                        </button>
                        <a href={`${origin}/checkout/register?key=${k.token}`} target="_blank" rel="noreferrer"
                          className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-500 hover:text-zinc-300 transition"
                          title="Abrir link">
                          <ExternalLink size={12} />
                        </a>
                        <button onClick={() => revokeKey(k.token)}
                          className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition"
                          title="Revogar">
                          <X size={12} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Used / revoked keys */}
            {usedKeys.length > 0 && (
              <div>
                <div className="text-[10px] font-mono font-bold tracking-[0.3em] text-zinc-700 uppercase mb-3 flex items-center gap-2">
                  <Clock size={11} /> Histórico ({usedKeys.length})
                </div>
                <div className="space-y-2">
                  {usedKeys.map(k => (
                    <div key={k.token}
                      className="flex items-center gap-3 p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
                        k.revoked ? 'bg-red-500/10 text-red-400' : 'bg-zinc-500/10 text-zinc-500')}>
                        {k.revoked ? <X size={10} /> : <Check size={10} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-zinc-600 tabular truncate">{k.token}</div>
                        <div className="text-[10px] font-mono text-zinc-700">
                          {k.revoked
                            ? `Revogada por ${k.revoked_by ?? '—'}`
                            : `Usada por ${k.used_by ?? '—'} · ${k.used_at ? fmtDate(k.used_at) : ''}`}
                        </div>
                      </div>
                      <div className={cn('text-[9px] font-mono font-bold tracking-widest uppercase px-2 py-1 rounded border',
                        k.revoked
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-zinc-500/10 border-zinc-500/15 text-zinc-500')}>
                        {k.revoked ? 'REVOGADA' : 'USADA'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingKeys ? (
              <div className="py-12 flex items-center justify-center gap-3">
                <RefreshCw size={16} className="animate-spin text-purple-400" />
                <span className="text-xs font-mono text-zinc-500">Carregando…</span>
              </div>
            ) : keys.length === 0 ? (
              <div className="py-12 text-center">
                <Ticket size={28} className="text-zinc-700 mx-auto mb-3" />
                <div className="text-xs font-mono text-zinc-600 mb-1">Nenhuma chave gerada ainda</div>
                <div className="text-[10px] font-mono text-zinc-700">Clique em "Gerar Chave" para criar a primeira</div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
