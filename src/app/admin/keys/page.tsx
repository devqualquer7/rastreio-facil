'use client'
import { useState, useEffect } from 'react'
import { Key, Plus, Trash2, Copy, CheckCircle2, Users } from 'lucide-react'

interface RegKey { id: string; key: string; used: number; usedById: string | null; usedAt: string | null; createdAt: string }

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<RegKey[]>([])
  const [loading, setLoading] = useState(true)
  const [genCount, setGenCount] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/keys').then(r => r.json()).then(d => { setKeys(d); setLoading(false) })
  }

  useEffect(load, [])

  const generate = async () => {
    setGenerating(true)
    await fetch('/api/admin/keys', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: genCount }),
    })
    setGenerating(false); load()
  }

  const deleteKey = async (id: string) => {
    if (!confirm('Excluir esta key?')) return
    await fetch('/api/admin/keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const copy = (key: string) => {
    navigator.clipboard.writeText(key)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const available = keys.filter(k => !k.used)
  const used = keys.filter(k => k.used)

  const cardStyle = { background: '#0d0d18', border: '1px solid rgba(99,102,241,0.15)' }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2"><Key className="w-6 h-6" style={{ color: '#818cf8' }} /> Keys de Acesso</h1>
          <div className="flex gap-4 mt-1 text-sm" style={{ color: '#64748b' }}>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />{available.length} disponíveis</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500" />{used.length} utilizadas</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="number" min={1} max={50} value={genCount} onChange={e => setGenCount(Number(e.target.value))}
            className="w-16 px-3 py-2 rounded-xl text-sm text-center focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', color: '#f1f5f9' }} />
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
            <Plus className="w-4 h-4" /> {generating ? 'Gerando...' : 'Gerar'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: '#475569' }}>
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map(k => (
            <div key={k.id} className="flex items-center gap-3 p-4 rounded-2xl" style={cardStyle}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${k.used ? 'bg-slate-500' : 'bg-emerald-400'}`} />
              <code className={`flex-1 font-mono text-sm tracking-widest ${k.used ? 'line-through' : ''}`} style={{ color: k.used ? '#475569' : '#f1f5f9' }}>
                {k.key}
              </code>
              {k.used && (
                <span className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: '#64748b' }}>
                  <Users className="w-3 h-3" /> Usada {k.usedAt ? new Date(k.usedAt).toLocaleDateString('pt-BR') : ''}
                </span>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!k.used && (
                  <button onClick={() => copy(k.key)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ background: copied === k.key ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.1)', color: copied === k.key ? '#34d399' : '#a5b4fc' }}>
                    {copied === k.key ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
                  </button>
                )}
                {!k.used && (
                  <button onClick={() => deleteKey(k.id)} style={{ color: '#64748b' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {keys.length === 0 && (
            <div className="text-center py-12 rounded-2xl" style={cardStyle}>
              <Key className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-white font-semibold">Nenhuma key gerada ainda</p>
              <p className="text-sm mt-1" style={{ color: '#475569' }}>Clique em "Gerar" para criar keys de acesso</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
