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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#06030a] relative overflow-hidden">
      {/* Ambient red/purple glows */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-red-900/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full bg-purple-900/15 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full bg-red-800/10 blur-[80px]" />
      </div>

      {/* Status bar */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 mb-8 flex items-center gap-2 bg-red-950/30 border border-red-800/30 rounded-full px-4 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-[10px] font-mono tracking-[0.3em] text-red-400/80 uppercase">SYS::ENCRYPTED · PANEL ACCESS</span>
      </motion.div>

      {/* Logo with scanner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative z-10 mb-6">
        <div className="relative w-28 h-28 overflow-hidden rounded-2xl"
          style={{ boxShadow: '0 0 60px rgba(180,0,30,0.5), 0 0 120px rgba(180,0,30,0.2)' }}>
          {/* Logo bg */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0008] via-[#12000a] to-[#0a0005]" />
          {/* Logo image — falls back to styled E if missing */}
          <img
            src="/logo.png"
            alt=""
            className="absolute inset-0 w-full h-full object-contain z-10"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {/* Fallback text logo */}
          <div className="absolute inset-0 flex items-center justify-center z-[5]">
            <span className="font-black text-5xl text-red-500 select-none"
              style={{ textShadow: '0 0 30px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.5)' }}>
              E
            </span>
          </div>
          {/* Scanner line */}
          <motion.div
            className="absolute left-0 right-0 h-[2px] z-20"
            style={{ background: 'linear-gradient(90deg, transparent, #ef4444, #ff6b6b, #ef4444, transparent)', boxShadow: '0 0 10px 3px rgba(239,68,68,0.7), 0 0 30px 6px rgba(239,68,68,0.3)' }}
            animate={{ top: ['-2px', '112px', '-2px'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          />
          {/* Scanner glow sweep */}
          <motion.div
            className="absolute left-0 right-0 h-12 z-[15] pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, rgba(239,68,68,0.06), transparent)' }}
            animate={{ top: ['-48px', '120px', '-48px'] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          />
          {/* Border */}
          <div className="absolute inset-0 border border-red-500/25 rounded-2xl z-30" />
        </div>
        {/* Outer glow ring */}
        <div className="absolute -inset-1 rounded-3xl border border-red-500/10" style={{ boxShadow: '0 0 40px rgba(180,0,30,0.3)' }} />
        {/* encrypted text below logo */}
        <div className="text-center mt-3">
          <div className="text-[9px] font-mono tracking-[0.4em] text-red-900/70 uppercase">encrypted</div>
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 text-center mb-1">
        <div className="font-black text-2xl tracking-tight">
          <span className="text-white">ENCRYPTED</span>
          <span className="text-red-500">SOFTWARE</span>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 text-[10px] font-mono text-zinc-600 tracking-[0.35em] mb-8 uppercase">
        Checkout Mercado Pago
      </motion.div>

      {/* Form card */}
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="w-full max-w-sm relative z-10">
        <div className="relative bg-gradient-to-b from-[#0e0008]/95 to-[#08030d]/95 backdrop-blur-xl border border-red-900/25 rounded-3xl p-7 overflow-hidden"
          style={{ boxShadow: '0 0 60px rgba(180,0,30,0.12)' }}>
          {/* Top shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
          {/* Corner glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-red-900/15 blur-3xl pointer-events-none" />

          <div className="relative space-y-5">
            <div>
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                <User size={10} /> Usuário
              </div>
              <input
                value={u}
                onChange={e => setU(e.target.value)}
                autoComplete="username"
                autoFocus
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/40 focus:bg-red-500/[0.03] transition-all"
              />
            </div>
            <div>
              <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-[0.25em] mb-2 flex items-center gap-1.5">
                <Lock size={10} /> Senha
              </div>
              <input
                type="password"
                value={p}
                onChange={e => setP(e.target.value)}
                autoComplete="current-password"
                onKeyDown={e => e.key === 'Enter' && submit(e as any)}
                className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/40 focus:bg-red-500/[0.03] transition-all"
              />
              {err && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] font-mono text-red-400 mt-2 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                  {err}
                </motion.div>
              )}
            </div>

            <button
              disabled={loading}
              type="submit"
              className="relative w-full py-3.5 rounded-xl overflow-hidden font-black tracking-widest text-sm uppercase transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 group"
              style={{ background: 'linear-gradient(135deg, #7c0012, #b5001e, #7c0012)', boxShadow: '0 0 25px rgba(180,0,30,0.5)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #9a0018, #d40024, #9a0018)' }} />
              <span className="relative z-10 flex items-center gap-2 text-white">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Entrando…</>
                ) : (
                  <>Acessar Painel <ArrowRight size={14} /></>
                )}
              </span>
            </button>
          </div>
        </div>
      </motion.form>

      <div className="relative z-10 text-center mt-6 text-[10px] font-mono text-zinc-800 tracking-[0.35em] uppercase">
        Anti-Detect · IP Cloud · v2
      </div>
    </div>
  )
}
