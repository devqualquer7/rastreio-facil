'use client'
import { useState } from 'react'
import { MapPin, KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/keyauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao fazer login'); return }
      router.push('/dashboard')
      router.refresh()
    } catch { setError('Erro de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#06060f' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <a href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(79,70,229,0.4)' }}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold text-white">Rastreio<span style={{ color: '#818cf8' }}>Fácil</span></span>
        </a>

        <div className="rounded-2xl p-8" style={{ background: '#0d0d18', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h1 className="text-2xl font-black text-white mb-1">Acessar</h1>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>Insira sua licença para acessar o painel</p>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#94a3b8' }}>Licença KeyAuth</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#6366f1' }} />
                <input
                  type="text" required placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm font-mono font-medium focus:outline-none tracking-wider"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#f1f5f9' }}
                />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 mt-2"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(79,70,229,0.3)' }}>
              {loading ? 'Verificando...' : 'Acessar painel'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: '#64748b' }}>
            Ainda não tem licença?{' '}
            <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: '#818cf8' }}>Adquira no Discord</a>
          </p>
        </div>
      </div>
    </div>
  )
}
