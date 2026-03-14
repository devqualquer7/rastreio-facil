'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Search, Package, MapPin, Clock, ChevronDown, ChevronUp, X, User } from 'lucide-react'

interface TrackingEvent { id: string; status: string; location: string | null; date: string }
interface TrackingCode {
  id: string; code: string; description: string | null
  events: TrackingEvent[]; createdAt: string
}

function genCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let r = 'RF'
  for (let i = 0; i < 8; i++) r += chars[Math.floor(Math.random() * chars.length)]
  return r
}

export default function DashboardPage() {
  const [codes, setCodes] = useState<TrackingCode[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [clientName, setClientName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const r = await fetch('/api/user/tracking-codes')
      const d = await r.json()
      if (d.error) setError(d.error)
      else setCodes(d.codes || d || [])
    } catch { setError('Erro ao carregar rastreios.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!clientName.trim()) return
    setSubmitting(true); setError('')
    try {
      const code = genCode()
      const r = await fetch('/api/user/tracking-codes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, description: clientName.trim() })
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Erro ao criar rastreio.'); return }
      setClientName(''); setShowForm(false); load()
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este rastreio?')) return
    await fetch(`/api/user/tracking-codes/${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = codes.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const inp: React.CSSProperties = {
    background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '0.625rem', padding: '0.6875rem 1rem', color: '#f1f5f9',
    fontSize: '0.9375rem', outline: 'none', width: '100%', boxSizing: 'border-box'
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f1f5f9', margin: '0 0 0.25rem' }}>Meus Rastreios</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>{codes.length} rastreio{codes.length !== 1 ? 's' : ''} cadastrado{codes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setShowForm(v => !v); setError('') }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.75rem', padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer', flexShrink: 0 }}>
          {showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? 'Cancelar' : 'Novo rastreio'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} color="#818cf8" /> Adicionar rastreio
          </h2>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Nome do cliente *
            </label>
            <input value={clientName} onChange={e => setClientName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Ex: João Silva" autoFocus style={inp} />
            <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.375rem', marginBottom: 0 }}>
              Um código de rastreamento único será gerado automaticamente
            </p>
          </div>
          {error && <p style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{error}</p>}
          <button onClick={handleCreate} disabled={submitting || !clientName.trim()}
            style={{ background: submitting || !clientName.trim() ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.625rem', padding: '0.625rem 1.5rem', fontWeight: 700, fontSize: '0.9375rem', cursor: submitting || !clientName.trim() ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código ou cliente..."
          style={{ ...inp, paddingLeft: '2.375rem' }} />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
          <Package size={40} style={{ color: '#334155', margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ fontWeight: 700, color: '#f1f5f9', margin: '0 0 0.375rem' }}>Nenhum rastreio ainda</p>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Clique em "Novo rastreio" para começar</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtered.map(tc => (
            <div key={tc.id} style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '0.875rem', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.125rem' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={15} color="#818cf8" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {tc.description && <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9375rem', margin: '0 0 0.125rem' }}>{tc.description}</p>}
                  <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{tc.code}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '999px', background: tc.events.length > 0 ? 'rgba(99,102,241,0.15)' : 'rgba(51,65,85,0.5)', color: tc.events.length > 0 ? '#a5b4fc' : '#475569', fontWeight: 600 }}>
                    {tc.events.length} evento{tc.events.length !== 1 ? 's' : ''}
                  </span>
                  {tc.events.length > 0 && (
                    <button onClick={() => setExpanded(expanded === tc.id ? null : tc.id)} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.5rem', color: '#818cf8', cursor: 'pointer', padding: '0.3125rem', display: 'flex' }}>
                      {expanded === tc.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                  <button onClick={() => handleDelete(tc.id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', padding: '0.3125rem', display: 'flex' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {expanded === tc.id && tc.events.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)', padding: '0.875rem 1.125rem 0.875rem 4.375rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {tc.events.map((ev, i) => (
                      <div key={ev.id} style={{ display: 'flex', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '0.625rem', flexShrink: 0 }}>
                          <div style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: i === 0 ? '#818cf8' : '#334155', flexShrink: 0, marginTop: '0.25rem' }} />
                          {i < tc.events.length - 1 && <div style={{ width: '1px', flex: 1, minHeight: '1rem', background: 'rgba(99,102,241,0.15)' }} />}
                        </div>
                        <div style={{ paddingBottom: i < tc.events.length - 1 ? '0.625rem' : 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: i === 0 ? '#a5b4fc' : '#94a3b8', margin: 0 }}>{ev.status}</p>
                          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                            {ev.location && <span style={{ color: '#475569', fontSize: '0.75rem' }}>📍 {ev.location}</span>}
                            <span style={{ color: '#475569', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={10} />{new Date(ev.date).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
