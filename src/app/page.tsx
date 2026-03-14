'use client'
import { useState } from 'react'
import { MapPin, Search, Package, Clock, AlertCircle, Loader2 } from 'lucide-react'
interface TrackingEvent { id: string; status: string; description?: string; location?: string; date: string }
interface TrackingResult { id: string; code: string; description?: string; events: TrackingEvent[] }
export default function Home() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TrackingResult | null>(null)
  const [error, setError] = useState('')
  const track = async () => {
    const c = code.trim(); if (!c) return
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch(`/api/track/${encodeURIComponent(c)}`)
      const d = await r.json()
      if (r.ok) setResult(d); else setError(d.error || 'Código não encontrado.')
    } catch { setError('Erro de conexão.') } finally { setLoading(false) }
  }
  return (
    <div style={{ minHeight: '100vh', background: '#09090f', color: '#e2e8f0', fontFamily: 'system-ui,sans-serif' }}>
      <header style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div style={{ width: '2rem', height: '2rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MapPin size={14} color="#fff" />
        </div>
        <span style={{ fontWeight: 800, color: '#f1f5f9' }}>Rastreio<span style={{ color: '#818cf8' }}>Fácil</span></span>
      </header>
      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '3rem 1.5rem' }}>
        <h1 style={{ textAlign: 'center', fontSize: '1.875rem', fontWeight: 900, color: '#f1f5f9', marginBottom: '0.5rem' }}>Rastreie sua encomenda</h1>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '2.5rem' }}>Digite o código de rastreamento para acompanhar seu pedido</p>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && track()} placeholder="Ex: BR123456789BR"
            style={{ flex: 1, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.75rem', padding: '0.75rem 1rem', color: '#f1f5f9', fontSize: '0.9375rem', outline: 'none' }} />
          <button onClick={track} disabled={loading || !code.trim()}
            style={{ background: loading || !code.trim() ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.75rem', padding: '0 1.25rem', fontWeight: 600, cursor: loading || !code.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}>
            {loading ? <Loader2 size={16} /> : <Search size={16} />} Rastrear
          </button>
        </div>
        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', padding: '1rem', color: '#fca5a5', marginBottom: '1.5rem' }}>
            <AlertCircle size={16} />{error}
          </div>
        )}
        {result && (
          <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '1rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', paddingBottom: '1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(99,102,241,0.12)' }}>
              <Package size={18} color="#818cf8" />
              <div>
                <p style={{ fontWeight: 700, color: '#f1f5f9', margin: 0 }}>{result.code}</p>
                {result.description && <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: '0.125rem 0 0' }}>{result.description}</p>}
              </div>
            </div>
            {result.events.length === 0
              ? <p style={{ textAlign: 'center', color: '#64748b', padding: '1rem 0', margin: 0 }}>Nenhum evento registrado ainda.</p>
              : <div style={{ display: 'flex', flexDirection: 'column' }}>
                {result.events.map((ev, i) => (
                  <div key={ev.id} style={{ display: 'flex', gap: '0.875rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '0.75rem', flexShrink: 0 }}>
                      <div style={{ width: '0.625rem', height: '0.625rem', borderRadius: '50%', background: i === 0 ? '#818cf8' : '#334155', flexShrink: 0, marginTop: '0.3rem' }} />
                      {i < result.events.length - 1 && <div style={{ width: '1px', flex: 1, minHeight: '1.5rem', background: 'rgba(99,102,241,0.15)' }} />}
                    </div>
                    <div style={{ paddingBottom: '1rem' }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem', color: i === 0 ? '#a5b4fc' : '#94a3b8', margin: 0 }}>{ev.status}</p>
                      {ev.description && <p style={{ color: '#64748b', fontSize: '0.8125rem', marginTop: '0.125rem', marginBottom: 0 }}>{ev.description}</p>}
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        {ev.location && <span style={{ color: '#475569', fontSize: '0.75rem' }}>📍 {ev.location}</span>}
                        <span style={{ color: '#475569', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={10} /> {new Date(ev.date).toLocaleString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            }
          </div>
        )}
      </main>
    </div>
  )
}
