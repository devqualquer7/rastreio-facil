'use client'
import { useState, useEffect } from 'react'
import { Users, ToggleLeft, ToggleRight, Plus, Minus, Package, RefreshCw, AlertTriangle } from 'lucide-react'

interface UserRow {
  id: string; username: string; email?: string
  expiresAt?: string; trackingLimit: number; trackingUsed: number
  active: number; createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [daysInput, setDaysInput] = useState('')
  const [trackingsInput, setTrackingsInput] = useState('')
  const [removeDaysInput, setRemoveDaysInput] = useState('')
  const [removeTrackingsInput, setRemoveTrackingsInput] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/users').then(r => r.json()).then(d => { setUsers(d); setLoading(false) })
  }

  useEffect(load, [])

  const action = async (id: string, body: object) => {
    setActionLoading(id)
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setActionLoading(null); load()
  }

  const now = new Date()

  const getDaysLeft = (expiresAt?: string) => {
    if (!expiresAt) return null
    const diff = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Users className="w-6 h-6" style={{ color: '#818cf8' }} /> Usuários
        </h1>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: '#475569' }}>
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#0d0d18', border: '1px solid rgba(99,102,241,0.15)' }}>
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-white font-semibold">Nenhum usuário ainda</p>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>Gere keys e compartilhe para novos clientes se cadastrarem</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(u => {
            const daysLeft = getDaysLeft(u.expiresAt)
            const isExpired = daysLeft !== null && daysLeft <= 0
            const isWarning = daysLeft !== null && daysLeft > 0 && daysLeft <= 7
            const isExpanded = expandedId === u.id

            return (
              <div key={u.id} className="rounded-2xl overflow-hidden" style={{ background: '#0d0d18', border: `1px solid ${isExpired ? 'rgba(239,68,68,0.25)' : isWarning ? 'rgba(249,115,22,0.25)' : 'rgba(99,102,241,0.15)'}` }}>
                <div className="flex items-center gap-3 p-4">
                  {/* Status indicator */}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!u.active ? 'bg-red-500' : isExpired ? 'bg-red-400' : isWarning ? 'bg-orange-400' : 'bg-emerald-400'}`} />

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-white">{u.username}</p>
                      {!u.active && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>Inativo</span>}
                      {isExpired && u.active ? <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>Expirado</span> : null}
                      {isWarning && <span className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1" style={{ background: 'rgba(249,115,22,0.15)', color: '#fdba74', border: '1px solid rgba(249,115,22,0.25)' }}><AlertTriangle className="w-3 h-3" />{daysLeft}d restantes</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-0.5 text-xs" style={{ color: '#64748b' }}>
                      {u.email && <span>{u.email}</span>}
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" />{u.trackingUsed}/{u.trackingLimit}</span>
                      {u.expiresAt && (
                        <span style={{ color: isExpired ? '#f87171' : isWarning ? '#fb923c' : '#64748b' }}>
                          {isExpired ? 'Expirou ' : 'Expira '}{new Date(u.expiresAt).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setExpandedId(p => p === u.id ? null : u.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
                      Gerenciar
                    </button>
                    <button onClick={() => action(u.id, { action: 'toggle_active' })} disabled={actionLoading === u.id}
                      title={u.active ? 'Desativar' : 'Ativar'}
                      style={{ color: u.active ? '#34d399' : '#64748b' }}>
                      {u.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded actions — 2×2 grid */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 grid grid-cols-2 gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>

                    {/* ── Adicionar dias ── */}
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: '#818cf8' }}>
                        <RefreshCw className="w-3 h-3" /> Adicionar dias
                      </p>
                      <div className="flex gap-2">
                        <input type="number" min={1} placeholder="30" value={daysInput}
                          onChange={e => setDaysInput(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', color: '#f1f5f9' }} />
                        <button onClick={() => { action(u.id, { action: 'add_days', days: Number(daysInput) || 30 }); setDaysInput('') }}
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
                          style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {[30, 60, 90].map(d => (
                          <button key={d} onClick={() => action(u.id, { action: 'add_days', days: d })}
                            className="flex-1 py-1 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
                            +{d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Adicionar rastreios ── */}
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: '#a78bfa' }}>
                        <Package className="w-3 h-3" /> Adicionar rastreios
                      </p>
                      <div className="flex gap-2">
                        <input type="number" min={1} placeholder="200" value={trackingsInput}
                          onChange={e => setTrackingsInput(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,58,237,0.2)', color: '#f1f5f9' }} />
                        <button onClick={() => { action(u.id, { action: 'add_trackings', trackings: Number(trackingsInput) || 200 }); setTrackingsInput('') }}
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {[100, 200, 500].map(n => (
                          <button key={n} onClick={() => action(u.id, { action: 'add_trackings', trackings: n })}
                            className="flex-1 py-1 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: 'rgba(124,58,237,0.1)', color: '#c4b5fd' }}>
                            +{n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Remover dias ── */}
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: '#f87171' }}>
                        <Minus className="w-3 h-3" /> Remover dias
                      </p>
                      <div className="flex gap-2">
                        <input type="number" min={1} placeholder="30" value={removeDaysInput}
                          onChange={e => setRemoveDaysInput(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.3)', color: '#f1f5f9' }} />
                        <button onClick={() => { action(u.id, { action: 'remove_days', days: Number(removeDaysInput) || 30 }); setRemoveDaysInput('') }}
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
                          style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {[7, 30, 90].map(d => (
                          <button key={d} onClick={() => action(u.id, { action: 'remove_days', days: d })}
                            className="flex-1 py-1 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                            -{d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ── Remover rastreios ── */}
                    <div className="p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <p className="text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1" style={{ color: '#f87171' }}>
                        <Minus className="w-3 h-3" /> Remover rastreios
                      </p>
                      <div className="flex gap-2">
                        <input type="number" min={1} placeholder="200" value={removeTrackingsInput}
                          onChange={e => setRemoveTrackingsInput(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(239,68,68,0.3)', color: '#f1f5f9' }} />
                        <button onClick={() => { action(u.id, { action: 'remove_trackings', trackings: Number(removeTrackingsInput) || 200 }); setRemoveTrackingsInput('') }}
                          className="px-3 py-2 rounded-lg text-xs font-semibold text-white"
                          style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
                          <Minus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {[100, 200, 500].map(n => (
                          <button key={n} onClick={() => action(u.id, { action: 'remove_trackings', trackings: n })}
                            className="flex-1 py-1 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
                            -{n}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
