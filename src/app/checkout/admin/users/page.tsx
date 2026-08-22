'use client'
import { useEffect, useState } from 'react'
import { useCheckoutUser } from '../../layout'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  username: string
  is_admin: number
  is_banned: number
  created_at: string
}

export default function AdminUsersPage() {
  const me = useCheckoutUser()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (me && !me.isAdmin) { router.push('/checkout'); return }
    load()
  }, [me])

  async function load() {
    const res = await fetch('/api/checkout/admin/users')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function patch(id: string, data: Record<string, number>) {
    setActionLoading(id)
    try {
      await fetch(`/api/checkout/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      await load()
    } finally { setActionLoading(null) }
  }

  async function del(id: string, username: string) {
    if (!confirm(`Deletar usuário "${username}"? Esta ação não pode ser desfeita.`)) return
    setActionLoading(id)
    try {
      await fetch(`/api/checkout/admin/users/${id}`, { method: 'DELETE' })
      setMsg(`Usuário ${username} deletado`)
      await load()
    } finally { setActionLoading(null) }
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Usuários</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
      </div>

      {msg && (
        <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{msg}</p>
      )}

      <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
        {users.length === 0 ? (
          <p className="text-sm text-zinc-600 text-center py-8">Nenhum usuário ainda</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {users.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-sm font-semibold text-white shrink-0">
                  {u.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium truncate">{u.username}</p>
                    {u.is_admin === 1 && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-semibold">ADMIN</span>
                    )}
                    {u.is_banned === 1 && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-semibold">BANIDO</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600">Cadastrado em {fmtDate(u.created_at)}</p>
                </div>
                {u.id !== me?.id && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => patch(u.id, { is_banned: u.is_banned ? 0 : 1 })}
                      disabled={actionLoading === u.id}
                      className="text-xs text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {u.is_banned ? 'Desbanir' : 'Banir'}
                    </button>
                    <button
                      onClick={() => patch(u.id, { is_admin: u.is_admin ? 0 : 1 })}
                      disabled={actionLoading === u.id}
                      className="text-xs text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      {u.is_admin ? 'Remover admin' : 'Tornar admin'}
                    </button>
                    <button
                      onClick={() => del(u.id, u.username)}
                      disabled={actionLoading === u.id}
                      className="text-xs text-red-400 hover:text-red-300 bg-red-500/[0.06] hover:bg-red-500/[0.12] px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                    >
                      Deletar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
