'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, ArrowRight, User, Zap } from 'lucide-react'

// ── Scanner logo component (shared branding) ──────────────────────────────────
function ScanLogo({ size = 120 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="relative w-full h-full overflow-hidden rounded-2xl"
        style={{ boxShadow: `0 0 ${size/2}px rgba(180,0,30,0.5), 0 0 ${size}px rgba(180,0,30,0.2)` }}>
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0008] via-[#12000a] to-[#0a0005]" />
        <img
          src="/logo.png"
          alt=""
          className="absolute inset-0 w-full h-full object-contain z-10"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div className="absolute inset-0 flex items-center justify-center z-[5]">
          <span className="font-black select-none text-red-500"
            style={{ fontSize: size * 0.38, textShadow: '0 0 30px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.5)' }}>
            E
          </span>
        </div>
        {/* Scanner line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] z-20"
          style={{ background: 'linear-gradient(90deg,transparent,#ef4444,#ff6b6b,#ef4444,transparent)', boxShadow: '0 0 10px 3px rgba(239,68,68,0.7),0 0 30px 6px rgba(239,68,68,0.3)' }}
          animate={{ top: ['-2px', `${size + 2}px`, '-2px'] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute left-0 right-0 z-[15] pointer-events-none"
          style={{ height: size * 0.35, background: 'linear-gradient(to bottom,transparent,rgba(239,68,68,0.06),transparent)' }}
          animate={{ top: [`${-size * 0.35}px`, `${size + 2}px`, `${-size * 0.35}px`] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 border border-red-500/25 rounded-2xl z-30" />
      </div>
      <div className="absolute -inset-1 rounded-3xl border border-red-500/10"
        style={{ boxShadow: '0 0 40px rgba(180,0,30,0.3)' }} />
    </div>
  )
}

// ── Inner page (uses searchParams — wrapped in Suspense) ──────────────────────
function KeyPageInner() {
  const params = useSearchParams()
  const success = params.get('success') === '1'
  const error = params.get('error')
  const successName = params.get('name')

  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(error || '')

  useEffect(() => { if (error) setErr(decodeURIComponent(error)) }, [error])

  async function connect() {
    if (!name.trim()) { setErr('Insira o nome da sua conta'); return }
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/ec/oauth/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const d = await r.json()
      if (d.ok && d.url) {
        window.location.href = d.url
      } else {
        setErr(d.error || 'Erro ao iniciar conexão')
        setLoading(false)
      }
    } catch {
      setErr('Erro de conexão')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#06030a] relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-red-900/20 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] rounded-full bg-purple-900/12 blur-[100px]" />
      </div>

      {/* Status bar */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-8 flex items-center gap-2 bg-red-950/30 border border-red-800/30 rounded-full px-4 py-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="text-[10px] font-mono tracking-[0.3em] text-red-400/80 uppercase">SYS::ENCRYPTED · OAUTH FLOW</span>
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="relative z-10 mb-3">
        <ScanLogo size={110} />
        <div className="text-center mt-3">
          <div className="text-[9px] font-mono tracking-[0.4em] text-red-900/70 uppercase">encrypted</div>
        </div>
      </motion.div>

      {/* Brand title */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
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
        transition={{ delay: 0.25 }}
        className="relative z-10 text-[10px] font-mono text-zinc-600 tracking-[0.35em] mb-8 uppercase">
        Checkout Mercado Pago
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 240, damping: 24 }}
        className="w-full max-w-md relative z-10">
        <div className="relative bg-gradient-to-b from-[#0e0008]/95 to-[#08030d]/95 backdrop-blur-xl border border-red-900/25 rounded-3xl overflow-hidden p-8"
          style={{ boxShadow: '0 0 60px rgba(180,0,30,0.12)' }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-red-900/10 blur-3xl pointer-events-none" />

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 relative">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5"
                  style={{ boxShadow: '0 0 30px rgba(34,197,94,0.3)' }}>
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <div className="font-black text-xl text-emerald-400 mb-2">Conta conectada!</div>
                {successName && (
                  <div className="text-sm font-mono text-zinc-400 mb-1">
                    <span className="text-zinc-600">Conta: </span>{decodeURIComponent(successName)}
                  </div>
                )}
                <div className="text-xs font-mono text-zinc-600 mt-4">
                  Você já pode fechar esta aba.
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                <div className="mb-6">
                  <div className="font-black text-xl text-white mb-2">Conectar Mercado Pago</div>
                  <div className="text-sm font-mono text-zinc-500 leading-relaxed">
                    Insira o nome da sua conta e autorize no Mercado Pago para começar a receber.
                  </div>
                </div>

                {err && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-red-400">{err}</span>
                  </motion.div>
                )}

                <div className="mb-5">
                  <div className="text-[10px] font-mono font-bold tracking-[0.25em] text-zinc-600 uppercase mb-2 flex items-center gap-1.5">
                    <User size={11} /> Nome da conta
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && connect()}
                    placeholder="Ex: João Silva MEI"
                    maxLength={60}
                    autoFocus
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3.5 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/40 transition-all placeholder-zinc-700"
                  />
                </div>

                <button
                  onClick={connect}
                  disabled={loading || !name.trim()}
                  className="relative w-full py-4 rounded-2xl overflow-hidden font-black tracking-widest text-sm uppercase transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 group"
                  style={{ background: 'linear-gradient(135deg,#7c0012,#b5001e,#7c0012)', boxShadow: '0 0 25px rgba(180,0,30,0.5)' }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(135deg,#9a0018,#d40024,#9a0018)' }} />
                  <span className="relative z-10 flex items-center gap-2 text-white">
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecionando…</>
                    ) : (
                      <><Zap size={15} fill="white" /> Conectar com Mercado Pago <ArrowRight size={15} /></>
                    )}
                  </span>
                </button>

                <div className="mt-4 text-center text-[10px] font-mono text-zinc-700">
                  Você será redirecionado para o Mercado Pago para autorizar.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="relative z-10 text-center mt-6 text-[10px] font-mono text-zinc-800 tracking-[0.3em] uppercase">
        Encrypted Software · Checkout MP
      </div>
    </div>
  )
}

export default function KeyPage() {
  return (
    <Suspense>
      <KeyPageInner />
    </Suspense>
  )
}
