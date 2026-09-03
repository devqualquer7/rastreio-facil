'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, User, ArrowRight } from 'lucide-react'

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
    <>
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 1000px #0c000f inset !important;
          -webkit-text-fill-color: #d4d4d8 !important;
          caret-color: #d4d4d8;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>

      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#06030a] relative overflow-hidden select-none">
        {/* Ambient glows */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[320px] rounded-full bg-red-900/12 blur-[150px]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full bg-purple-900/8 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(180,0,30,0.07),transparent)]" />
        </div>

        {/* Status badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 mb-10 flex items-center gap-2 bg-red-950/25 border border-red-900/20 rounded-full px-4 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-50" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="text-[10px] font-mono tracking-[0.28em] text-red-500/70 uppercase">SYS::ENCRYPTED · PANEL ACCESS</span>
        </motion.div>

        {/* Logo — clean, no box, scanner only */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative z-10 mb-7 flex flex-col items-center">
          {/* Soft glow behind logo */}
          <div className="absolute inset-0 rounded-full bg-red-600/10 blur-3xl scale-150 pointer-events-none" />

          {/* Logo — suspensa, sem caixa, respirando; scanner é só a linha */}
          <motion.div
            className="relative w-[92px] h-[92px]"
            animate={{ y: [0, -5, 0], scale: [1, 1.03, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <img
              src="/logo.png"
              alt="Encrypted"
              className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_18px_rgba(239,68,68,0.45)]"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {/* Scanner — só a linha */}
            <motion.div
              className="absolute left-0 right-0 h-px z-20 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.3) 15%, #ef4444 40%, #ff7070 50%, #ef4444 60%, rgba(239,68,68,0.3) 85%, transparent 100%)',
                boxShadow: '0 0 6px 1px rgba(239,68,68,0.9), 0 0 16px 3px rgba(239,68,68,0.35)',
              }}
              animate={{ top: ['2px', '86px', '2px'] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>

          <div className="mt-3 text-[9px] font-mono tracking-[0.42em] text-red-900/55 uppercase">encrypted</div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="relative z-10 text-center mb-1">
          <div className="font-black text-[22px] tracking-tight">
            <span className="text-zinc-100">ENCRYPTED</span><span className="text-red-500">SOFTWARE</span>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.24 }}
          className="relative z-10 text-[10px] font-mono text-zinc-700 tracking-[0.35em] mb-10 uppercase">
          Checkout Mercado Pago
        </motion.div>

        {/* Form card */}
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          className="w-full max-w-[340px] relative z-10">
          <div
            className="relative rounded-2xl overflow-hidden p-6"
            style={{
              background: 'linear-gradient(160deg, rgba(20,0,28,0.97) 0%, rgba(12,0,15,0.97) 100%)',
              border: '1px solid rgba(180,0,30,0.15)',
              boxShadow: '0 0 50px rgba(140,0,20,0.07), 0 1px 0 rgba(239,68,68,0.06) inset, 0 -1px 0 rgba(0,0,0,0.5) inset',
            }}>
            {/* Top shimmer */}
            <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-red-600/25 to-transparent" />

            <div className="space-y-4">
              {/* Username */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-mono tracking-[0.22em] text-zinc-600 uppercase mb-2">
                  <User size={9} /> Usuário
                </label>
                <input
                  value={u}
                  onChange={e => setU(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  spellCheck={false}
                  style={{ colorScheme: 'dark', backgroundColor: '#0c000f', color: '#d4d4d8' }}
                  className="w-full border border-white/[0.05] rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-red-600/30 transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-mono tracking-[0.22em] text-zinc-600 uppercase mb-2">
                  <Lock size={9} /> Senha
                </label>
                <input
                  type="password"
                  value={p}
                  onChange={e => setP(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={e => e.key === 'Enter' && submit(e as any)}
                  spellCheck={false}
                  style={{ colorScheme: 'dark', backgroundColor: '#0c000f', color: '#d4d4d8' }}
                  className="w-full border border-white/[0.05] rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-red-600/30 transition-colors"
                />
                {err && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] font-mono text-red-400/80 mt-2.5 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />{err}
                  </motion.p>
                )}
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                className="relative w-full py-3.5 rounded-xl font-black tracking-[0.14em] text-sm text-white uppercase overflow-hidden disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                style={{
                  background: 'linear-gradient(135deg, #6b0011 0%, #a8001a 45%, #c50020 60%, #8c0018 100%)',
                  boxShadow: '0 0 18px rgba(180,0,30,0.4), 0 1px 0 rgba(255,100,100,0.12) inset',
                }}>
                {loading ? (
                  <><span className="w-4 h-4 border-[1.5px] border-white/25 border-t-white rounded-full animate-spin" /> Entrando…</>
                ) : (
                  <>Acessar Painel <ArrowRight size={14} /></>
                )}
              </motion.button>
            </div>
          </div>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative z-10 mt-8 text-[9px] font-mono text-zinc-800/70 tracking-[0.35em] uppercase">
          Anti-Detect · IP Cloud · v2
        </motion.div>
      </div>
    </>
  )
}
