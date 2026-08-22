'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, ArrowRight, User, Zap, ShieldCheck } from 'lucide-react'

// ── Logo component — crystal robot branding ───────────────────────────────────
function EncryptedLogo({ size = 96 }: { size?: number }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-2xl blur-xl"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.6) 0%, rgba(99,102,241,0.3) 50%, transparent 70%)' }} />
      {/* Card */}
      <div className="relative w-full h-full rounded-2xl overflow-hidden border border-purple-500/30"
        style={{ background: 'linear-gradient(135deg, #1a0d2e 0%, #0f0820 50%, #0a0614 100%)' }}>
        <img
          src="/logo.png"
          alt="Encrypted"
          className="absolute inset-0 w-full h-full object-contain p-1 z-10"
          onError={e => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        {/* Fallback "E" if no logo */}
        <div className="absolute inset-0 flex items-center justify-center z-[5]">
          <span className="font-black select-none text-purple-400"
            style={{ fontSize: size * 0.4, textShadow: '0 0 30px rgba(168,85,247,0.9), 0 0 60px rgba(168,85,247,0.5)' }}>
            E
          </span>
        </div>
        {/* Scan line */}
        <motion.div
          className="absolute left-0 right-0 h-[2px] z-20 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.9), rgba(196,181,253,1), rgba(168,85,247,0.9), transparent)',
            boxShadow: '0 0 12px 3px rgba(168,85,247,0.6)',
          }}
          animate={{ top: ['-2px', `${size + 2}px`, '-2px'] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 border border-purple-500/20 rounded-2xl z-30" />
      </div>
    </div>
  )
}

// ── Inner page ────────────────────────────────────────────────────────────────
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #07030f 0%, #0d0820 40%, #090615 100%)' }}>

      {/* Ambient glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px]"
          style={{ background: 'radial-gradient(ellipse at bottom right, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px]"
          style={{ background: 'radial-gradient(ellipse at bottom left, rgba(168,85,247,0.08) 0%, transparent 70%)' }} />
      </div>

      {/* Status pill */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-8 flex items-center gap-2 rounded-full px-4 py-1.5 border"
        style={{ background: 'rgba(88,28,135,0.2)', borderColor: 'rgba(139,92,246,0.3)' }}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-400" />
        </span>
        <span className="text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: 'rgba(196,181,253,0.7)' }}>
          Encrypted · OAuth
        </span>
      </motion.div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 22 }}
        className="relative z-10 mb-4">
        <EncryptedLogo size={100} />
      </motion.div>

      {/* Brand title */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="relative z-10 text-center mb-1">
        <div className="font-black text-2xl tracking-tight text-white">
          en<span style={{ color: '#a855f7' }}>Crypted</span>
        </div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.22 }}
        className="relative z-10 text-[10px] font-mono tracking-[0.35em] mb-8 uppercase"
        style={{ color: 'rgba(161,161,170,0.4)' }}>
        Checkout · Mercado Pago
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, type: 'spring', stiffness: 240, damping: 24 }}
        className="w-full max-w-md relative z-10">
        <div className="relative rounded-3xl overflow-hidden p-8"
          style={{
            background: 'linear-gradient(160deg, rgba(20,12,36,0.96) 0%, rgba(12,8,24,0.98) 100%)',
            border: '1px solid rgba(139,92,246,0.22)',
            boxShadow: '0 0 60px rgba(139,92,246,0.12), 0 24px 48px rgba(0,0,0,0.5)',
          }}>
          {/* Top shimmer line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(168,85,247,0.7), transparent)' }} />
          {/* Corner glow */}
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' }} />

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8 relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', boxShadow: '0 0 30px rgba(34,197,94,0.25)' }}>
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <div className="font-black text-xl text-emerald-400 mb-2">Conta conectada!</div>
                {successName && (
                  <div className="text-sm font-mono mt-2 mb-1" style={{ color: 'rgba(161,161,170,0.7)' }}>
                    <span style={{ color: 'rgba(113,113,122,1)' }}>Conta: </span>
                    {decodeURIComponent(successName)}
                  </div>
                )}
                <div className="mt-6 text-[10px] font-mono" style={{ color: 'rgba(113,113,122,0.8)' }}>
                  Você já pode fechar esta aba.
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                {/* Shield icon header */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}>
                    <ShieldCheck size={18} style={{ color: '#a855f7' }} />
                  </div>
                  <div>
                    <div className="font-black text-base text-white">Conectar Mercado Pago</div>
                    <div className="text-[11px] font-mono mt-0.5" style={{ color: 'rgba(113,113,122,1)' }}>
                      Autorize sua conta para receber pagamentos
                    </div>
                  </div>
                </div>

                {err && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                    <span className="text-xs font-mono text-red-400">{err}</span>
                  </motion.div>
                )}

                {/* Name input */}
                <div className="mb-5">
                  <div className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase mb-2 flex items-center gap-1.5"
                    style={{ color: 'rgba(113,113,122,0.9)' }}>
                    <User size={10} /> Nome da conta
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && connect()}
                    placeholder="Ex: João Silva MEI"
                    maxLength={60}
                    autoFocus
                    className="w-full rounded-xl px-4 py-3.5 text-sm font-mono text-white outline-none transition-all placeholder-zinc-700"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.45)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
                  />
                </div>

                {/* Connect button */}
                <button
                  onClick={connect}
                  disabled={loading || !name.trim()}
                  className="relative w-full py-4 rounded-2xl overflow-hidden font-black tracking-widest text-sm uppercase transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 group text-white"
                  style={{
                    background: 'linear-gradient(135deg, #6d28d9, #9333ea, #6d28d9)',
                    boxShadow: '0 0 28px rgba(139,92,246,0.45)',
                  }}>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7, #7c3aed)' }} />
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Redirecionando…
                      </>
                    ) : (
                      <>
                        <Zap size={15} fill="white" />
                        Conectar com Mercado Pago
                        <ArrowRight size={15} />
                      </>
                    )}
                  </span>
                </button>

                <div className="mt-4 text-center text-[10px] font-mono"
                  style={{ color: 'rgba(113,113,122,0.6)' }}>
                  Você será redirecionado para o Mercado Pago para autorizar.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="relative z-10 text-center mt-6 text-[10px] font-mono tracking-[0.3em] uppercase"
        style={{ color: 'rgba(63,63,70,0.8)' }}>
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
