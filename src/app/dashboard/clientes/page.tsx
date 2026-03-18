'use client'
import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Search, Mail, Phone, UserCircle } from 'lucide-react'

function fixEnc(str: string): string {
  try {
    const bytes = new Uint8Array(str.split('').map(c => c.charCodeAt(0)))
    return new TextDecoder('utf-8').decode(bytes)
  } catch { return str }
}

interface Client {
  id: string
  name: string
  email: string | null
  phone: string | null
  createdAt: string
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/clients')
      const data = await r.json()
      setClients(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createClient = async () => {
    if (!name.trim()) { setError('Nome obrigatorio'); return }
    setSubmitting(true)
    setError('')
    try {
      const r = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error || 'Erro'); return }
      setName(''); setEmail(''); setPhone(''); setShowForm(false)
      await load()
    } finally { setSubmitting(false) }
  }

  const deleteClient = async (id: string, clientName: string) => {
    if (!confirm('Remover cliente ' + clientName + '?')) return
    await fetch('/api/clients/' + id, { method: 'DELETE' })
    await load()
  }

  const filtered = clients.filter(c =>
    fixEnc(c.name).toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.phone && c.phone.includes(search))
  )

  const S = (x: object) => x as React.CSSProperties

  return (
    <div style={S({ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' })}>
      <div style={S({ maxWidth: 900, margin: '0 auto' })}>
        <div style={S({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 16 })}>
          <div style={S({ display: 'flex', alignItems: 'center', gap: 12 })}>
            <div style={S({ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
              <Users size={22} color="#818cf8" />
            </div>
            <div>
              <h1 style={S({ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' })}>Clientes</h1>
              <p style={S({ margin: 0, fontSize: 13, color: '#64748b' })}>{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setError('') }}
            style={S({ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: showForm ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.9)', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' })}
          >
            <Plus size={16} /> Novo cliente
          </button>
        </div>

        {showForm && (
          <div style={S({ background: 'rgba(30,27,75,0.4)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, padding: 24, marginBottom: 24 })}>
            <h3 style={S({ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#a5b4fc' })}>Novo Cliente</h3>
            {error && <p style={S({ margin: '0 0 12px', color: '#f87171', fontSize: 13 })}>{error}</p>}
            <div style={S({ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 })}>
              <div>
                <label style={S({ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 })}>Nome *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome do cliente"
                  style={S({ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(15,14,36,0.8)', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' })} />
              </div>
              <div>
                <label style={S({ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 })}>E-mail</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com"
                  style={S({ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(15,14,36,0.8)', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' })} />
              </div>
              <div>
                <label style={S({ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 })}>Telefone</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999"
                  style={S({ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(15,14,36,0.8)', border: '1px solid rgba(99,102,241,0.3)', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' })} />
              </div>
            </div>
            <div style={S({ display: 'flex', gap: 10, marginTop: 16 })}>
              <button onClick={createClient} disabled={submitting}
                style={S({ padding: '9px 20px', borderRadius: 8, background: '#6366f1', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.6 : 1 })}>
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => { setShowForm(false); setError(''); setName(''); setEmail(''); setPhone('') }}
                style={S({ padding: '9px 20px', borderRadius: 8, background: 'rgba(100,116,139,0.15)', border: '1px solid rgba(100,116,139,0.2)', color: '#94a3b8', fontSize: 14, cursor: 'pointer' })}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div style={S({ position: 'relative', marginBottom: 20 })}>
          <Search size={15} style={S({ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' })} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone..."
            style={S({ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, background: 'rgba(15,14,36,0.6)', border: '1px solid rgba(100,116,139,0.15)', color: '#e2e8f0', fontSize: 14, boxSizing: 'border-box' })} />
        </div>

        {loading ? (
          <div style={S({ textAlign: 'center', padding: '60px 0', color: '#64748b' })}>Carregando...</div>
        ) : filtered.length === 0 ? (
          <div style={S({ textAlign: 'center', padding: '60px 0', color: '#475569' })}>
            <UserCircle size={40} style={S({ marginBottom: 12, opacity: 0.4 })} />
            <p style={S({ margin: 0, fontSize: 14 })}>{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado ainda'}</p>
          </div>
        ) : (
          <div style={S({ display: 'flex', flexDirection: 'column', gap: 10 })}>
            {filtered.map(c => (
              <div key={c.id} style={S({ background: 'rgba(15,14,36,0.5)', border: '1px solid rgba(100,116,139,0.12)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 })}>
                <div style={S({ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                  <UserCircle size={20} color="#818cf8" />
                </div>
                <div style={S({ flex: 1, minWidth: 0 })}>
                  <p style={S({ margin: '0 0 4px', fontWeight: 600, fontSize: 15, color: '#f1f5f9' })}>{fixEnc(c.name)}</p>
                  <div style={S({ display: 'flex', gap: 16, flexWrap: 'wrap' })}>
                    {c.email && (
                      <span style={S({ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' })}>
                        <Mail size={11} /> {c.email}
                      </span>
                    )}
                    {c.phone && (
                      <span style={S({ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#94a3b8' })}>
                        <Phone size={11} /> {c.phone}
                      </span>
                    )}
                    <span style={S({ fontSize: 12, color: '#475569' })}>
                      desde {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                <button onClick={() => deleteClient(c.id, fixEnc(c.name))}
                  style={S({ padding: '7px 10px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 })}>
                  <Trash2 size={13} /> Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
