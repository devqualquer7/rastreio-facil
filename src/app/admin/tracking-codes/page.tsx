'use client'
import { useState, useEffect } from 'react'
import { Package, Plus, Trash2, Loader2, MapPin, X, ChevronDown, ChevronUp, Clock } from 'lucide-react'
interface TrackingEvent { id: string; status: string; description?: string; location?: string; date: string }
interface TrackingCode { id: string; code: string; description?: string; client?: { id: string; name: string } | null; events: TrackingEvent[]; createdAt: string }
export default function TrackingCodesPage() {
  const [codes, setCodes] = useState<TrackingCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const load = async () => {
    setLoading(true)
    try { const r = await fetch('/api/tracking-codes'); const d = await r.json(); setCodes(Array.isArray(d) ? d : (d.codes || [])) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const create = async () => {
    if (!code.trim()) return; setSaving(true)
    try {
      await fetch('/api/tracking-codes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: code.trim(), description: description.trim() || undefined }) })
      setCode(''); setDescription(''); setShowForm(false); load()
    } finally { setSaving(false) }
  }
  const remove = async (id: string) => { if (!confirm('Remover este rastreio e todos os seus eventos?')) return; await fetch(`/api/tracking-codes/${id}`, { method: 'DELETE' }); load() }
  const inp: React.CSSProperties = { background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.5rem', padding: '0.5625rem 0.75rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={16} color="#818cf8" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Rastreios</h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>{codes.length} código{codes.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.625rem', padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancelar' : 'Novo rastreio'}
        </button>
      </div>
      {showForm && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="Código de rastreamento *" style={inp} />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição (opcional)" style={inp} />
          </div>
          <button onClick={create} disabled={saving || !code.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: saving || !code.trim() ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: saving || !code.trim() ? 'not-allowed' : 'pointer' }}>
            {saving ? <Loader2 size={14} /> : <Plus size={14} />} Salvar
          </button>
        </div>
      )}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: '#64748b' }}><Loader2 size={24} /></div>
      ) : codes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
          <Package size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
          <p style={{ margin: 0 }}>Nenhum rastreio cadastrado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {codes.map(tc => (
            <div key={tc.id} style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={13} color="#818cf8" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9375rem', margin: 0, fontFamily: 'monospace' }}>{tc.code}</p>
                  {tc.description && <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0.125rem 0 0' }}>{tc.description}</p>}
                  {tc.client && <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0.125rem 0 0' }}>Cliente: {tc.client.name}</p>}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#475569', flexShrink: 0 }}>{tc.events.length} evento{tc.events.length !== 1 ? 's' : ''}</span>
                {tc.events.length > 0 && (
                  <button onClick={() => setExpanded(expanded === tc.id ? null : tc.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '0.25rem', display: 'flex' }}>
                    {expanded === tc.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                )}
                <button onClick={() => remove(tc.id)} style={{ width: '1.875rem', height: '1.875rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Trash2 size={13} />
                </button>
              </div>
              {expanded === tc.id && tc.events.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)', padding: '0.75rem 1rem 0.75rem 3.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {tc.events.map(ev => (
                    <div key={ev.id} style={{ fontSize: '0.8125rem', display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: '#94a3b8' }}>{ev.status}</span>
                      {ev.description && <span style={{ color: '#64748b' }}>— {ev.description}</span>}
                      {ev.location && <span style={{ color: '#475569' }}>📍 {ev.location}</span>}
                      <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={10} />{new Date(ev.date).toLocaleString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
