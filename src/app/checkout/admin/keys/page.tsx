'use client'
import { useEffect, useState } from 'react'
import { useCheckoutUser } from '../../checkout-context'
import { useRouter } from 'next/navigation'

interface Key {
  id: string
  key_value: string
  used: number
  used_by: string | null
  used_at: string | null
  created_at: string
}

export default function AdminKeysPage() {
  const me = useCheckoutUser()
  const router = useRouter()
  const [keys, setKeys] = useState<Key[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState('1')
  const [generating, setGenerating] = useState(false)
  const [newKeys, setNewKeys] = useState<string[]>([])
  const [copiedAll, setCopiedAll] = useState(false)

  useEffect(() => {
    if (me && !me.isAdmin) { router.push('/checkout'); return }
    load()
  }, [me])

  async function load() {
    const res = await fetch('/api/checkout/admin/keys')
    const data = await res.json()
    setKeys(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function generate() {
    setGenerating(true)
    setNewKeys([])
    try {
      const res = await fetch('/api/checkout/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: parseInt(count, 10) }),
      })
      const data = await res.json()
      if (Array.isArray(data)) {
        setNewKeys(data.map((k: any) => k.key_value))
        await load()
      }
    } finally { setGenerating(false) }
  }

  async function del(id: string) {
    await fetch(`/api/checkout/admin/keys/${id}`, { method: 'DELETE' })
    await load()
  }

  function copyAll() {
    navigator.clipboard.writeText(newKeys.join('\n')).then(() => {
      setCopiedAll(true)
      setTimeout(() => setCopiedAll(false), 2000)
    })
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

  const unused = keys.filter(k => !k.used)
  const used = keys.filter(k => k.used)

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
        <h1 className="text-xl font-semibold text-white">Chaves de Ativação</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{unused.length} disponíveis · {used.length} utilizadas</p>
      </div>

      <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4 max-w-sm">
        <h2 className="text-sm font-medium text-white mb-3">Gerar Chaves</h2>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="50"
            value={count}
            onChange={e => setCount(e.target.value)}
            className="w-20 bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white text-center focus:outline-none focus:border-white/20 transition-colors"
          />
          <button
            onClick={generate}
            disabled={generating}
            className="flex-1 bg-white text-black text-sm font-medium rounded-lg py-2 hover:bg-zinc-100 transition-colors disabled:opacity-50"
          >
            {generating ? 'Gerando...' : 'Gerar'}
          </button>
        </div>
      </div>

      {newKeys.length > 0 && (
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white">Chaves Geradas ({newKeys.length})</h2>
            <button
              onClick={copyAll}
              className="text-xs text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg transition-colors"
            >
              {copiedAll ? '✓ Copiado!' : 'Copiar todas'}
            </button>
          </div>
          <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-lg p-3 font-mono text-sm text-emerald-400 space-y-1">
            {newKeys.map(k => <p key={k}>{k}</p>)}
          </div>
        </div>
      )}

      {unused.length > 0 && (
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <h2 className="text-sm font-medium text-white">Chaves Disponíveis ({unused.length})</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {unused.map(k => (
              <div key={k.id} className="flex items-center gap-3 px-4 py-3">
                <span className="font-mono text-sm text-zinc-300 flex-1">{k.key_value}</span>
                <span className="text-xs text-zinc-600">{fmtDate(k.created_at)}</span>
                <button
                  onClick={() => del(k.id)}
                  className="text-xs text-red-400 hover:text-red-300 bg-red-500/[0.06] hover:bg-red-500/[0.12] px-2.5 py-1 rounded-lg transition-colors"
                >
                  Deletar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {used.length > 0 && (
        <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <h2 className="text-sm font-medium text-zinc-500">Chaves Utilizadas ({used.length})</h2>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {used.slice(0, 20).map(k => (
              <div key={k.id} className="flex items-center gap-3 px-4 py-3 opacity-50">
                <span className="font-mono text-sm text-zinc-500 flex-1 line-through">{k.key_value}</span>
                <span className="text-xs text-zinc-600">usada em {fmtDate(k.used_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
