'use client'
import { useState, useEffect } from 'react'
import { Users, Plus, Trash2, Loader2, User, Phone, Mail, X } from 'lucide-react'
interface Client { id: string; name: string; email?: string; phone?: string; createdAt: string }
export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const load = async () => {
    setLoading(true)
    try { const r = await fetch('/api/clients'); const d = await r.json(); setClients(Array.isArray(d) ? d : (d.clients || [])) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const create = async () => {
    if (!name.trim()) return; setSaving(true)
    try {
      await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined }) })
      setName(''); setEmail(''); setPhone(''); setShowForm(false); load()
    } finally { setSaving(false) }
  }
  const remove = async (id: string) => { if (!confirm('Remover este cliente?')) return; await fetch(`/api/clients/${id}`, { method: 'DELETE' }); load() }
  const inp: React.CSSProperties = { background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.5rem', padding: '0.5625rem 0.75rem', color: '#f1f5f9', fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.625rem', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={16} color="#818cf8" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Clientes</h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>{clients.length} cliente{clients.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.625rem', padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
          {showForm ? <X size={14} /> : <Plus size={14} />} {showForm ? 'Cancelar' : 'Novo cliente'}
        </button>
      </div>
      {showForm && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome *" style={inp} />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={inp} />
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefone" style={inp} />
          </div>
          <button onClick={create} disabled={saving || !name.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: saving || !name.trim() ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.875rem', cursor: saving || !name.trim() ? 'not-allowed' : 'pointer' }}>
            {saving ? <Loader2 size={14} /> : <Plus size={14} />} Salvar
          </button>
        </div>
      )}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: '#64748b' }}><Loader2 size={24} /></div>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
          <Users size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
          <p style={{ margin: 0 }}>Nenhum cliente cadastrado</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {clients.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', borderRadius: '0.75rem', padding: '0.875rem 1rem' }}>
              <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={14} color="#818cf8" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9375rem', margin: 0 }}>{c.name}</p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.125rem', flexWrap: 'wrap' }}>
                  {c.email && <span style={{ color: '#64748b', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={11} />{c.email}</span>}
                  {c.phone && <span style={{ color: '#64748b', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={11} />{c.phone}</span>}
                </div>
              </div>
              <button onClick={() => remove(c.id)} style={{ width: '1.875rem', height: '1.875rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
