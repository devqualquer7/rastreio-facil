'use client'
import { useEffect, useState } from 'react'

interface GatewayInfo {
  id: string
  label: string
  configured: boolean
  fields: { key: string; label: string; placeholder: string }[]
  redacted: Record<string, string>
}

export default function GatewaysPage() {
  const [gateways, setGateways] = useState<GatewayInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadGateways() {
    const res = await fetch('/api/checkout/gateways')
    const data = await res.json()
    setGateways(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { loadGateways() }, [])

  function startEdit(gw: GatewayInfo) {
    setEditing(gw.id)
    setFormValues({})
    setError('')
    setSuccess('')
  }

  async function save(gwId: string) {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/checkout/gateways/${gwId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Erro ao salvar'); return }
      setSuccess('Credenciais salvas!')
      setEditing(null)
      await loadGateways()
    } catch { setError('Erro de conexão') }
    finally { setSaving(false) }
  }

  async function remove(gwId: string) {
    if (!confirm(`Remover credenciais de ${gwId}?`)) return
    await fetch(`/api/checkout/gateways/${gwId}`, { method: 'DELETE' })
    await loadGateways()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-white">Gateways de Pagamento</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Configure suas credenciais para cada gateway</p>
      </div>

      {success && (
        <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">{success}</p>
      )}

      <div className="space-y-3">
        {gateways.map(gw => (
          <div key={gw.id} className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{gw.label}</p>
                  <p className="text-xs text-zinc-500">{gw.configured ? 'Configurada' : 'Não configurada'}</p>
                </div>
                {gw.configured && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">ATIVA</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(gw)}
                  className="text-xs text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 rounded-lg transition-colors"
                >
                  {gw.configured ? 'Editar' : 'Configurar'}
                </button>
                {gw.configured && (
                  <button
                    onClick={() => remove(gw.id)}
                    className="text-xs text-red-400 hover:text-red-300 bg-red-500/[0.06] hover:bg-red-500/[0.12] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>

            {gw.configured && editing !== gw.id && (
              <div className="px-4 pb-3 space-y-1">
                {gw.fields.map(f => (
                  <div key={f.key} className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-24">{f.label}:</span>
                    <span className="text-xs font-mono text-zinc-400">{gw.redacted[f.key] ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}

            {editing === gw.id && (
              <div className="border-t border-white/[0.06] px-4 py-4 space-y-3">
                {error && (
                  <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
                )}
                {gw.fields.map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">{f.label}</label>
                    <input
                      type="text"
                      value={formValues[f.key] ?? ''}
                      onChange={e => setFormValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder || gw.redacted[f.key] || `Insira ${f.label}`}
                      className="w-full bg-[#0f0f0f] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => save(gw.id)}
                    disabled={saving}
                    className="flex-1 bg-white text-black text-sm font-medium rounded-lg py-2 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-4 text-sm text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
