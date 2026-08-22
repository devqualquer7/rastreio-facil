'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CheckoutRegister() {
  const router = useRouter()
  const [key, setKey] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Senhas não coincidem'); return }
    if (password.length < 6) { setError('Senha deve ter no mínimo 6 caracteres'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim().toUpperCase(), username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Erro ao cadastrar'); return }
      router.push('/checkout')
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Criar Conta</h1>
          <p className="text-sm text-zinc-500 mt-1">Use sua chave de ativação para se cadastrar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Chave de Ativação</label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value.toUpperCase())}
              required
              className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-colors"
              placeholder="CO-XXXX-XXXX-XXXX"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Usuário</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-colors"
              placeholder="min. 3 caracteres"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-colors"
              placeholder="min. 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Confirmar Senha</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-[#141414] border border-white/[0.08] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-medium text-sm rounded-lg py-2.5 hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Já tem conta?{' '}
          <Link href="/checkout/login" className="text-zinc-400 hover:text-white transition-colors">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
