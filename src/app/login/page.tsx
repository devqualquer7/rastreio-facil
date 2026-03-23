'use client'
import { useState } from 'react'
import { MapPin, User, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao fazer login'); return }
      router.push('/dashboard')
      router.refresh()
    } catch { setError('Erro de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06060f', fontFamily: 'system-ui, sans-serif', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <MapPin color="#fff" size={28} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f1f5f9', margin: '0 0 0.25rem' }}>
            Rastreio<span style={{ color: '#818cf8' }}>Fácil</span>
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Entre na sua conta</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: 'rgba(15,14,36,0.6)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '1rem', padding: '1.75rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Usuário
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Seu nome de usuário"
                required
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.625rem', padding: '0.6875rem 1rem 0.6875rem 2.5rem', color: '#f1f5f9', fontSize: '0.9375rem', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(15,15,30,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '0.625rem', padding: '0.6875rem 1rem 0.6875rem 2.5rem', color: '#f1f5f9', fontSize: '0.9375rem', outline: 'none' }}
              />
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.625rem', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
              <p style={{ color: '#f87171', fontSize: '0.875rem', margin: 0 }}>{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%', background: loading ? 'rgba(79,70,229,0.4)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '0.625rem', padding: '0.75rem', fontWeight: 700, fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 0.75rem' }}>
              Não tem conta?{' '}
              <Link href="/register" style={{ color: '#818cf8', fontWeight: 600, textDecoration: 'none' }}>
                Registre-se
              </Link>
            </p>
            <a href="https://discord.gg/Th8X5CJ3td" target="_blank" rel="noopener noreferrer" style={{ color: '#6366f1', fontSize: '0.8125rem', textDecoration: 'none', fontWeight: 600 }}>
              Adquira no Discord
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
