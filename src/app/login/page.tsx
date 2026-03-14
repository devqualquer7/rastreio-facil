'use client'
import { useState } from 'react'
import { MapPin, Eye, EyeOff } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/user/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao fazer login'); return }
      router.push('/dashboard'); router.refresh()
    } catch { setError('Erro de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#06060f' }}>
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(79,70,229,0.4)' }}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold text-white">Rastreio<span style={{ color: '#818cf8' }}>Fácil</span></span>
        </a>
        <div className="rounded-2xl p-8" style={{ background: '#0d0d18', border: '1px solid rgba(99,102,241,0.2)' }}>
          <h1 className="text-2xl font-black text-white mb-1">Entrar</h1>
          <p className="text-sm mb-6" style={{ color: '#64748b' }}>Acesse o painel da sua conta</p>
          {error && <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#94a3b8' }}>Username</label>
              <input type="text" autoComplete="username" required value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', color: '#f1f5f9' }} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: '#94a3b8' }}>Senha</label>
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} autoComplete="current-password" required value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="w-full px-4 py-3 pr-11 rounded-xl text-sm font-medium focus:outline-none transition-all" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.2)', color: '#f1f5f9' }} />
                <button type="button" onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }}>{showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50 mt-2" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(79,70,229,0.3)' }}>{loading ? 'Entrando...' : 'Entrar'}</button>
          </form>
          <p className="mt-6 text-center text-sm" style={{ color: '#64748b' }}>Não tem conta?{' '}<a href="/register" className="font-semibold hover:underline" style={{ color: '#818cf8' }}>Criar com sua key</a></p>
        </div>
      </div>
    </div>
  )
}
