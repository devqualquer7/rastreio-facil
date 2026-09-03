'use client'
import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
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

  const inputCls = 'w-full rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-600/40 transition-all placeholder:text-zinc-700'
  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#06030a] relative overflow-hidden select-none">
      {/* Ambient glows — crimson */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[320px] rounded-full bg-red-900/12 blur-[150px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[220px] rounded-full bg-red-950/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(180,0,30,0.07),transparent)]" />
      </div>

      <div className="relative w-full max-w-[380px] z-10">
        {/* Logo — crystal + red scanner, igual ao login */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-7">
          <div className="absolute inset-0 rounded-full bg-red-600/10 blur-3xl scale-150 pointer-events-none" />
          <motion.div className="relative w-[80px] h-[80px]"
            animate={{ y: [0, -5, 0], scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <img src="/logo.png" alt="Encrypted"
              className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_18px_rgba(239,68,68,0.45)]"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            <motion.div className="absolute left-0 right-0 h-px z-20 pointer-events-none"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.3) 15%, #ef4444 40%, #ff7070 50%, #ef4444 60%, rgba(239,68,68,0.3) 85%, transparent)', boxShadow: '0 0 6px 1px rgba(239,68,68,0.9)' }}
              animate={{ top: ['2px', '74px', '2px'] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }} />
          </motion.div>
          <div className="mt-3 font-black text-[20px] tracking-tight">
            <span className="text-zinc-100">ENCRYPTED</span><span className="text-red-500">SOFTWARE</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-700 tracking-[0.35em] mt-1 uppercase">Criar conta · Checkout</div>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="relative rounded-2xl overflow-hidden p-6"
          style={{
            background: 'linear-gradient(160deg, rgba(20,0,28,0.97) 0%, rgba(12,0,15,0.97) 100%)',
            border: '1px solid rgba(180,0,30,0.15)',
            boxShadow: '0 0 50px rgba(140,0,20,0.07), 0 1px 0 rgba(239,68,68,0.06) inset',
          }}>
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-red-600/25 to-transparent" />

          {done ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,197,94,.25)]">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <div className="font-black text-lg text-zinc-100 mb-1">Conta criada!</div>
              <div className="text-sm font-mono text-zinc-500">Redirecionando para o login…</div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {/* Key */}
              <div>
                <label className="text-[10px] font-mono font-bold tracking-[0.22em] text-zinc-600 uppercase mb-2 flex items-center gap-1.5">
                  <Key size={10} /> Chave de acesso
                </label>
                <input type="text" value={key} onChange={e => setKey(e.target.value)}
                  placeholder="Chave fornecida pelo administrador" required
                  className={inputCls} style={inputStyle} />
              </div>

              {/* Username */}
              <div>
                <label className="text-[10px] font-mono font-bold tracking-[0.22em] text-zinc-600 uppercase mb-2 flex items-center gap-1.5">
                  <User size={10} /> Usuário
                </label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Escolha um username" required minLength={3} maxLength={40}
                  className={inputCls} style={inputStyle} />
                <div className="text-[10px] font-mono text-zinc-700 mt-1">Letras, números, _ e - apenas</div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[10px] font-mono font-bold tracking-[0.22em] text-zinc-600 uppercase mb-2 flex items-center gap-1.5">
                  <Lock size={10} /> Senha
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mín. 6 caracteres" required minLength={6}
                  className={inputCls} style={inputStyle} />
              </div>

              {/* Confirm */}
              <div>
                <label className="text-[10px] font-mono font-bold tracking-[0.22em] text-zinc-600 uppercase mb-2 flex items-center gap-1.5">
                  <Lock size={10} /> Confirmar senha
                </label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repita a senha" required
                  className={inputCls} style={inputStyle} />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                  <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                  <div className="text-xs font-mono text-red-400">{error}</div>
                </div>
              )}

              <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-xl text-white font-black tracking-[0.14em] text-sm uppercase disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                style={{
                  background: 'linear-gradient(135deg, #6b0011 0%, #a8001a 45%, #c50020 60%, #8c0018 100%)',
                  boxShadow: '0 0 18px rgba(180,0,30,0.4), 0 1px 0 rgba(255,100,100,0.12) inset',
                }}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Criando…</> : <><UserPlus size={15} /> Criar minha conta</>}
              </motion.button>

              <div className="text-center pt-1">
                <a href="/checkout/login" className="text-[10px] font-mono text-zinc-600 hover:text-red-400 transition tracking-wider">
                  Já tem uma conta? Entrar
                </a>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#06030a] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-red-500" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
