'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Zap, Clock, ChevronDown, ChevronUp, MapPin } from 'lucide-react'

interface Step {
  id: string
  dayOffset: number
  time: string
  status: string
  location: string | null
  sortOrder: number
}

interface Template {
  id: string
  name: string
  steps: Step[]
  createdAt: string
}

const STATUS_PRESETS = [
  { label: 'Coletado', value: 'Pedido coletado' },
  { label: 'Em Trânsito', value: 'Objeto em trânsito entre unidades' },
  { label: 'Chegou ao CD', value: 'Chegou ao centro de distribuição' },
  { label: 'Em Processamento', value: 'Objeto em processamento na unidade' },
  { label: 'Saiu p/ Entrega', value: 'Objeto saiu para entrega ao destinatário' },
  { label: 'Ag. Retirada', value: 'Aguardando retirada na unidade' },
  { label: 'Não Atendido', value: 'Entregador não foi atendido - nova tentativa prevista' },
  { label: 'Retido', value: 'Objeto retido para fiscalização ou regularização' },
  { label: 'Entregue', value: 'Objeto entregue com sucesso' },
]

export default function AutomacaoPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Step form state
  const [stepDay, setStepDay] = useState(0)
  const [stepTime, setStepTime] = useState('08:00')
  const [stepStatus, setStepStatus] = useState('')
  const [stepLocation, setStepLocation] = useState('')
  const [addingStep, setAddingStep] = useState(false)

  const load = async () => {
    try {
      const r = await fetch('/api/auto-templates')
      const data = await r.json()
      if (Array.isArray(data)) setTemplates(data)
    } catch {
      setError('Erro ao carregar modelos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true); setError('')
    try {
      const r = await fetch('/api/auto-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error || 'Erro'); return }
      setNewName(''); setShowCreate(false); load()
    } finally { setCreating(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este modelo e todas suas etapas?')) return
    await fetch(`/api/auto-templates/${id}`, { method: 'DELETE' })
    load()
  }

  const handleAddStep = async (templateId: string) => {
    if (!stepStatus.trim()) { setError('Status é obrigatório'); return }
    setAddingStep(true); setError('')
    try {
      const r = await fetch(`/api/auto-templates/${templateId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOffset: stepDay,
          time: stepTime,
          status: stepStatus.trim(),
          location: stepLocation.trim() || null,
        }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error || 'Erro'); return }
      setStepStatus(''); setStepLocation(''); setStepDay(0); setStepTime('08:00')
      load()
    } finally { setAddingStep(false) }
  }

  const handleDeleteStep = async (templateId: string, stepId: string) => {
    await fetch(`/api/auto-templates/${templateId}/steps/${stepId}`, { method: 'DELETE' })
    load()
  }

  const inp: React.CSSProperties = {
    background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '0.5rem', padding: '0.5rem 0.75rem', color: '#f1f5f9',
    fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8',
    letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.375rem',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f1f5f9', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Zap size={20} color="#818cf8" /> Automação
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Crie modelos de atualização automática para seus rastreios
          </p>
        </div>
        <button onClick={() => { setShowCreate(v => !v); setError('') }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.75rem', padding: '0.625rem 1.25rem', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer' }}>
          <Plus size={16} /> Novo modelo
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 1rem' }}>Criar modelo</h2>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Nome do modelo *</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder="Ex: Envio Nacional, Envio Expresso..." style={inp} />
            </div>
            <button onClick={handleCreate} disabled={creating || !newName.trim()}
              style={{ background: creating || !newName.trim() ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', fontWeight: 700, fontSize: '0.875rem', cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', height: '2.25rem' }}>
              {creating ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>}

      {/* Templates list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Carregando...</div>
      ) : templates.length === 0 ? (
        <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '1rem', padding: '3rem', textAlign: 'center' }}>
          <Zap size={40} style={{ color: '#334155', margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ fontWeight: 700, color: '#f1f5f9', margin: '0 0 0.375rem' }}>Nenhum modelo criado</p>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Crie um modelo para automatizar as atualizações dos seus rastreios</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {templates.map(t => (
            <div key={t.id} style={{ background: 'rgba(99,102,241,0.04)', border: `1px solid ${expanded === t.id ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.1)'}`, borderRadius: '0.875rem', overflow: 'hidden', transition: 'border-color 0.2s' }}>
              {/* Template header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.125rem' }}>
                <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={15} color="#818cf8" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '0.9375rem', margin: '0 0 0.125rem' }}>{t.name}</p>
                  <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>{t.steps.length} etapa{t.steps.length !== 1 ? 's' : ''} configurada{t.steps.length !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button onClick={() => { setExpanded(expanded === t.id ? null : t.id); setStepStatus(''); setStepLocation(''); setStepDay(0); setStepTime('08:00') }}
                    style={{ background: expanded === t.id ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '0.5rem', color: '#818cf8', cursor: 'pointer', padding: '0.3125rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700 }}>
                    {expanded === t.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    Configurar
                  </button>
                  <button onClick={() => handleDelete(t.id)}
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: '0.5rem', color: '#f87171', cursor: 'pointer', padding: '0.3125rem', display: 'flex' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded - steps */}
              {expanded === t.id && (
                <div style={{ borderTop: '1px solid rgba(99,102,241,0.15)' }}>
                  {/* Add step form */}
                  <div style={{ padding: '1.25rem', background: 'rgba(99,102,241,0.04)' }}>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>
                      Adicionar etapa
                    </p>
                    {/* Status presets */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.875rem' }}>
                      {STATUS_PRESETS.map(p => (
                        <button key={p.label} type="button" onClick={() => setStepStatus(p.value)}
                          style={{ padding: '0.25rem 0.625rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', background: stepStatus === p.value ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.08)', border: stepStatus === p.value ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(99,102,241,0.2)', color: stepStatus === p.value ? '#c7d2fe' : '#6366f1' }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: '0 0 70px' }}>
                        <label style={lbl}>Dia</label>
                        <input type="number" min="0" value={stepDay} onChange={e => setStepDay(parseInt(e.target.value) || 0)} style={inp} />
                      </div>
                      <div style={{ flex: '0 0 100px' }}>
                        <label style={lbl}>Horário</label>
                        <input type="time" value={stepTime} onChange={e => setStepTime(e.target.value)} style={inp} />
                      </div>
                      <div style={{ flex: '1 1 160px' }}>
                        <label style={lbl}>Status *</label>
                        <input value={stepStatus} onChange={e => setStepStatus(e.target.value)} placeholder="Ex: Objeto em trânsito" style={inp} />
                      </div>
                      <div style={{ flex: '1 1 120px' }}>
                        <label style={lbl}>Localização</label>
                        <input value={stepLocation} onChange={e => setStepLocation(e.target.value)} placeholder="Ex: São Paulo, SP" style={inp} />
                      </div>
                      <button onClick={() => handleAddStep(t.id)} disabled={addingStep || !stepStatus.trim()}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: addingStep || !stepStatus.trim() ? 'rgba(79,70,229,0.3)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontWeight: 700, fontSize: '0.875rem', cursor: addingStep || !stepStatus.trim() ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', height: '2.125rem' }}>
                        <Plus size={14} /> Adicionar
                      </button>
                    </div>
                    <p style={{ fontSize: '0.6875rem', color: '#475569', marginTop: '0.5rem' }}>
                      Dia 0 = dia da ativação. Dia 1 = dia seguinte, etc.
                    </p>
                  </div>

                  {/* Steps list */}
                  <div style={{ borderTop: '1px solid rgba(99,102,241,0.1)' }}>
                    {t.steps.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                        <Clock size={20} style={{ color: '#334155', margin: '0 auto 0.5rem', display: 'block' }} />
                        <p style={{ color: '#475569', fontSize: '0.8125rem', margin: 0 }}>Nenhuma etapa configurada</p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 70px 1fr 1fr 40px', padding: '0.5rem 1.125rem', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                          {['Dia', 'Horário', 'Status', 'Local', ''].map((h) => (
                            <span key={h} style={{ fontSize: '0.625rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
                          ))}
                        </div>
                        {[...t.steps].sort((a, b) => a.sortOrder - b.sortOrder).map((s, i) => (
                          <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '80px 70px 1fr 1fr 40px', alignItems: 'center', padding: '0.625rem 1.125rem', borderBottom: i < t.steps.length - 1 ? '1px solid rgba(99,102,241,0.06)' : 'none' }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#a5b4fc' }}>Dia {s.dayOffset}</span>
                            <span style={{ fontSize: '0.8125rem', color: '#64748b', fontFamily: 'monospace' }}>{s.time}</span>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.status}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.8125rem' }}>
                              {s.location && <MapPin size={10} style={{ flexShrink: 0 }} />}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.location || '—'}</span>
                            </div>
                            <button onClick={() => handleDeleteStep(t.id, s.id)}
                              style={{ width: '1.5rem', height: '1.5rem', borderRadius: '0.375rem', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
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
