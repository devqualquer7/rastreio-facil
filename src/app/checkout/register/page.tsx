'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { UserPlus, Key, Lock, User, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

function RegisterForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [key, setKey] = useState(searchParams.get('key') ?? '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem'); return }
    setLoading(true)
    try {
      const r = await fetch('/api/ec/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: key.trim(), username: username.trim(), password: password.trim() }),
      })
      const d = await r.json()
      if (d.ok) {
        setDone(true)
        setTimeout(() => router.push('/checkout/login'), 2500)
      } else {
        setError(d.error || 'Falha ao criar conta')
      }
    } catch {
      setError('Erro de rede — tente novamente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-cyan-900/15 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="relative bg-gradient-to-b from-[#0d0d18]/98 to-[#09090f]/98 backdrop-blur-2xl border border-purple-500/20 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(168,85,247,.15)]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />

          <div className="p-8">
            {done ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,197,94,.3)]">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <div className="font-black text-lg text-zinc-100 mb-1">Conta criada!</div>
                <div className="text-sm font-mono text-zinc-500">Redirecionando para o login…</div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-700 to-cyan-600 flex items-center justify-center border border-purple-400/20">
                    <UserPlus size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="font-black text-sm tracking-tight text-zinc-100 uppercase">Criar Conta</div>
                    <div className="text-[10px] font-mono text-zinc-600 tracking-[0.2em]">ENCRYPTED · Checkout</div>
                  </div>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  {/* Key */}
                  <div>
                    <label className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                      <Key size={10} /> Chave de acesso
                    </label>
                    <input
                      type="text" value={key} onChange={e => setKey(e.target.value)}
                      placeholder="Chave fornecida pelo administrador"
                      required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>

                  {/* Username */}
                  <div>
                    <label className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                      <User size={10} /> Usuário
                    </label>
                    <input
                      type="text" value={username} onChange={e => setUsername(e.target.value)}
                      placeholder="Escolha um username"
                      required minLength={3} maxLength={40}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-700"
                    />
                    <div className="text-[10px] font-mono text-zinc-700 mt-1">Letras, números, _ e - apenas</div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                      <Lock size={10} /> Senha
                    </label>
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Mín. 6 caracteres"
                      required minLength={6}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>

                  {/* Confirm */}
                  <div>
                    <label className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                      <Lock size={10} /> Confirmar senha
                    </label>
                    <input
                      type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                      placeholder="Repita a senha"
                      required
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-700"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                      <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                      <div className="text-xs font-mono text-red-400">{error}</div>
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-br from-violet-700 via-purple-500 to-cyan-300 text-white font-black tracking-wide text-sm uppercase shadow-[0_0_20px_rgba(168,85,247,.4)] hover:shadow-[0_0_35px_rgba(168,85,247,.6)] active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2">
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Criando…</> : <><UserPlus size={15} /> Criar minha conta</>}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  <a href="/checkout/login" className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 transition tracking-wider">
                    Já tem uma conta? Entrar
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090f] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-purple-400" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
