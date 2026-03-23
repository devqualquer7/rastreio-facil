'use client'
import { useState, useEffect } from 'react'
import { Plus, Trash2, Search, Package, Clock, ChevronDown, ChevronUp, X, User, ExternalLink, MapPin, Activity, Calendar } from 'lucide-react'

interface TrackingEvent { id: string; status: string; location: string | null; date: string }
interface Client { id: string; name: string }
interface TrackingCode {
  id: string; code: string; description: string | null; clientId?: string
  client?: { id: string; name: string } | null
  events: TrackingEvent[]; createdAt: string
}

const STATUS_PRESETS = [
  { label: 'Coletado', value: 'Pedido coletado' },
  { label: 'Chegou ao CD', value: 'Chegou ao centro de distribuição' },
  { label: 'Em Trânsito', value: 'Objeto em trânsito entre unidades' },
  { label: 'Em Processamento', value: 'Objeto em processamento na unidade' },
  { label: 'Saiu p/ Entrega', value: 'Objeto saiu para entrega ao destinatário' },
  { label: 'Ag. Retirada', value: 'Aguardando retirada na unidade' },
  { label: 'Não Atendido', value: 'Entregador não foi atendido - nova tentativa prevista' },
  { label: 'Retido', value: 'Objeto retido para fiscalização ou regularização' },
  { label: 'Entregue', value: 'Objeto entregue com sucesso' },
]

function genCode() { return 'LT' + String(Math.floor(100000000 + Math.random() * 900000000)) + 'BR' }

export default function DashboardPage() {
  const [codes, setCodes] = useState<TrackingCode[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [evStatus, setEvStatus] = useState('')
  const [evLocation, setEvLocation] = useState('')
  const [evDate, setEvDate] = useState('')
  const [evSubmitting, setEvSubmitting] = useState(false)

  const load = async () => {
    try {
      const [r, rc] = await Promise.all([
        fetch('/api/user/tracking-codes'),
        fetch('/api/user/clients').catch(() => ({ json: async () => [] }))
      ])
      const d = await r.json()
      const dc = await rc.json()
      if (d.error) setError(d.error)
      else setCodes(d.codes || d || [])
      setClients(Array.isArray(dc) ? dc : (dc.clients || []))
    } catch { setError('Erro ao carregar rastreios.') }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!clientId && !clientName.trim()) { setError('Selecione um cliente ou informe o nome.'); return }
    setSubmitting(true); setError('')
    try {
      const code = genCode()
      const body: any = { code, clientId: clientId || undefined, description: clientName.trim() || undefined }
      if (deliveryDate) body.deliveryDate = deliveryDate
      const r = await fetch('/api/user/tracking-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Erro ao criar rastreio.'); return }
      setClientId(''); setClientName(''); setDeliveryDate(''); setShowForm(false); load()
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este rastreio?')) return
    await fetch(`/api/user/tracking-codes/${id}`, { method: 'DELETE' })
    load()
  }

  const handleExpand = (id: string) => {
    if (expanded === id) { setExpanded(null) } else {
      setExpanded(id); setEvStatus(''); setEvLocation('')
      const now = new Date(); const offset = now.getTimezoneOffset() * 60000
      setEvDate(new Date(now.getTime() - offset).toISOString().slice(0, 16))
    }
  }

  const handleAddEvent = async (tc: TrackingCode) => {
    if (!evStatus.trim()) return
    setEvSubmitting(true)
    try {
      await fetch('/api/user/tracking-events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingCodeId: tc.id, status: evStatus, location: evLocation || null, date: new Date(evDate).toISOString() })
      })
      setEvStatus(''); setEvLocation(''); load()
    } finally { setEvSubmitting(false) }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Apagar este evento?')) return
    await fetch(`/api/user/tracking-events/${eventId}`, { method: 'DELETE' })
    load()
  }

  const filtered = codes.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.client?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const inp: React.CSSProperties = { background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.625rem', padding: '0.6875rem 1rem', color: '#f1f5f9', fontSize: '0.9375rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }
  const smallInp: React.CSSProperties = { background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }

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
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancelar' : 'Novo rastreio'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} color="#818cf8" /> Adicionar rastreio
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={lbl}>Cliente cadastrado</label>
              <select value={clientId} onChange={e => { setClientId(e.target.value); if (e.target.value) setClientName('') }} style={sel}>
                <option value="">— Selecione ou digite abaixo —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ ...lbl, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={11} /> Prazo de entrega
              </label>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} style={inp} />
            </div>
          </div>

          {!clientId && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={lbl}>Ou digite o nome do cliente *</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="Ex: João Silva" style={inp} />
            </div>
          )}

          <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.375rem', marginBottom: '0.75rem' }}>Um código de rastreamento único será gerado automaticamente</p>

          {error && <p style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{error}</p>}

          <button onClick={handleCreate} disabled={submitting || (!clientId && !clientName.trim())}
            style={{ background: submitting || (!clientId && !clientName.trim()) ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.625rem', padding: '0.625rem 1.5rem', fontWeight: 700, fontSize: '0.9375rem', cursor: submitting || (!clientId && !clientName.trim()) ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por código, cliente..." style={{ ...inp, paddingLeft: '2.375rem' }} />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
          <Package size={40} style={{ color: '#334155', margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ fontWeight: 700, color: '#f1f5f9', margin: '0 0 0.375rem' }}>Nenhum rastreio ainda</p>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Clique em &quot;Novo rastreio&quot; para começar</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {filtered.map(tc => {
            const previsaoEvt = tc.events.find(e => e.status.toLowerCase().startsWith('previs'))
            const realEvents = tc.events.filter(e => !e.status.toLowerCase().startsWith('previs'))

            return (
              <div key={tc.id} style={{ background: 'rgba(99,102,241,0.04)', border: `1px solid ${expanded === tc.id ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)'}`, borderRadius: '0.875rem', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                {/* Card row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.125rem' }}>
                  <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package size={15} color="#818cf8" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {(tc.client?.name || tc.description) && <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9375rem', margin: '0 0 0.125rem' }}>{tc.client?.name || tc.description}</p>}
                    <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{tc.code}</p>
                    {previsaoEvt && <p style={{ color: '#475569', fontSize: '0.75rem', margin: '0.125rem 0 0' }}>{previsaoEvt.status}</p>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '999px', background: realEvents.length > 0 ? 'rgba(99,102,241,0.15)' : 'rgba(51,65,85,0.5)', color: realEvents.length > 0 ? '#a5b4fc' : '#475569', fontWeight: 600 }}>
                      {realEvents.length} evento{realEvents.length !== 1 ? 's' : ''}
                    </span>
                    <button onClick={() => handleExpand(tc.id)} title="Gerenciar eventos"
                      style={{ background: expanded === tc.id ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.5rem', color: '#818cf8', cursor: 'pointer', padding: '0.3125rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700 }}>
                      {expanded === tc.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Gerenciar
                    </button>
                    <a href={'/?code=' + tc.code} target="_blank" rel="noopener noreferrer" title="Ver timeline"
                      style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '0.5rem', color: '#818cf8', padding: '0.3125rem', display: 'flex', textDecoration: 'none', alignItems: 'center' }}>
                      <ExternalLink size={14} />
                    </a>
                    <button onClick={() => handleDelete(tc.id)}
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', padding: '0.3125rem', display: 'flex' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {expanded === tc.id && (
                  <div style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                    {/* Event form */}
                    <div style={{ padding: '1.25rem', background: 'rgba(99,102,241,0.04)' }}>
                      <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Activity size={11} /> Registrar Evento
                      </p>
                      {/* Presets */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.875rem' }}>
                        {STATUS_PRESETS.map(p => (
                          <button key={p.label} type="button" onClick={() => setEvStatus(p.value)}
                            style={{ padding: '0.3125rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                              background: evStatus === p.value ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.08)',
                              border: evStatus === p.value ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(99,102,241,0.2)',
                              color: evStatus === p.value ? '#c7d2fe' : '#6366f1' }}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                      {/* Inputs */}
                      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ flex: '1 1 180px' }}>
                          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Status *</label>
                          <input value={evStatus} onChange={e => setEvStatus(e.target.value)} placeholder="Ex: Objeto em trânsito" style={smallInp} />
                        </div>
                        <div style={{ flex: '1 1 140px' }}>
                          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Localização</label>
                          <input value={evLocation} onChange={e => setEvLocation(e.target.value)} placeholder="Ex: São Paulo, SP" style={smallInp} />
                        </div>
                        <div style={{ flex: '1 1 140px' }}>
                          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.375rem' }}>Data e hora *</label>
                          <input type="datetime-local" value={evDate} onChange={e => setEvDate(e.target.value)} style={smallInp} />
                        </div>
                        <button onClick={() => handleAddEvent(tc)} disabled={evSubmitting || !evStatus.trim()}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: evSubmitting || !evStatus.trim() ? 'rgba(79,70,229,0.3)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.875rem', cursor: evSubmitting || !evStatus.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0, height: '2.125rem' }}>
                          <Plus size={14} /> {evSubmitting ? 'Salvando...' : 'Registrar'}
                        </button>
                      </div>
                    </div>
                    {/* Events table */}
                    <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)' }}>
                      {realEvents.length === 0 ? (
                        <div style={{ padding: '1.75rem', textAlign: 'center' }}>
                          <Activity size={22} style={{ color: '#334155', margin: '0 auto 0.5rem', display: 'block' }} />
                          <p style={{ color: '#475569', fontSize: '0.875rem', margin: 0 }}>Nenhum evento registrado ainda</p>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 48px', padding: '0.5rem 1.125rem', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                            {['Data / Hora', 'Status', 'Localização', 'Ação'].map((h, i) => (
                              <span key={h} style={{ fontSize: '0.625rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 3 ? 'right' : 'left' }}>{h}</span>
                            ))}
                          </div>
                          {realEvents.map((ev, i) => (
                            <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr 48px', alignItems: 'center', padding: '0.75rem 1.125rem', borderBottom: i < realEvents.length - 1 ? '1px solid rgba(99,102,241,0.06)' : 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#64748b', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                <Clock size={11} />
                                {new Date(ev.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.625rem', borderRadius: '999px', background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)', width: 'fit-content', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ev.status}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: '#64748b', fontSize: '0.8125rem', overflow: 'hidden' }}>
                                {ev.location && <MapPin size={11} style={{ color: '#475569', flexShrink: 0 }} />}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.location || '—'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleDeleteEvent(ev.id)} style={{ width: '1.75rem', height: '1.75rem', borderRadius: '0.375rem', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
