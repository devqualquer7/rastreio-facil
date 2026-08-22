'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Lock, User } from 'lucide-react'

export default function ECLoginPage() {
  const router = useRouter()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/ec/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
      })
      const d = await r.json()
      if (!d.ok) { setErr(d.error || 'Credenciais inválidas'); return }
      router.push('/checkout'); router.refresh()
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#09090f] relative">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-900/25 blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-cyan-900/15 blur-[100px]" />
      </div>

      <form onSubmit={submit} className="w-full max-w-sm relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-20 h-20 mb-5">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-700 via-purple-500/50 to-cyan-400 opacity-50 blur-2xl animate-pulse" />
            <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-violet-800 to-purple-600 flex items-center justify-center text-white font-black text-3xl border border-purple-400/20 shadow-[0_0_40px_rgba(168,85,247,.4)]">
              E
            </div>
          </div>
          <div className="font-black text-2xl tracking-tight ec-shimmer-text">ENCRYPTED</div>
          <div className="text-[10px] font-mono text-zinc-600 tracking-[0.35em] mt-1 uppercase">
            Checkout · Web · v2
          </div>
        </div>

        {/* Card */}
        <div className="relative bg-gradient-to-b from-[#0d0d18]/90 to-[#09090f]/90 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-7 overflow-hidden shadow-[0_0_60px_rgba(168,85,247,.15)]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

          <div className="relative space-y-5">
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                <User size={10} /> Usuário
              </div>
              <input value={u} onChange={e => setU(e.target.value)} autoComplete="username"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 focus:bg-purple-500/[0.04] focus:shadow-[0_0_0_4px_rgba(168,85,247,.12)] transition-all"
              />
            </div>
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                <Lock size={10} /> Senha
              </div>
              <input type="password" value={p} onChange={e => setP(e.target.value)} autoComplete="current-password"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 focus:bg-purple-500/[0.04] focus:shadow-[0_0_0_4px_rgba(168,85,247,.12)] transition-all"
              />
              {err && <div className="text-[11px] font-mono text-red-400 mt-2">{err}</div>}
            </div>
            <button disabled={loading} type="submit"
              className="relative w-full py-3.5 rounded-xl bg-gradient-to-br from-violet-700 via-purple-500 to-cyan-300 text-white font-black tracking-wide text-sm shadow-[0_0_25px_rgba(168,85,247,.45)] hover:shadow-[0_0_40px_rgba(168,85,247,.6)] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 uppercase">
              <Sparkles size={14} />
              {loading ? 'Entrando…' : 'Entrar'}
            </button>
          </div>
        </div>

        <div className="text-center mt-6 text-[10px] font-mono text-zinc-800 tracking-[0.35em] uppercase">
          Anti-Detect · IP Cloud · v2
        </div>
      </form>
    </div>
  )
}
