'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, User, Link2 } from 'lucide-react'

// ── Logo — suspensa, respirando, só a linha do scanner ────────────────────────
function EncryptedLogo({ size = 92 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full bg-red-600/12 blur-2xl scale-150 pointer-events-none" />
      <motion.div
        className="relative"
        style={{ width: size, height: size }}
        animate={{ y: [0, -5, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
        <img
          src="/logo.png"
          alt="Encrypted"
          className="w-full h-full object-contain relative z-10 drop-shadow-[0_0_18px_rgba(239,68,68,0.5)]"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <motion.div
          className="absolute left-0 right-0 h-px z-20 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.3) 15%, #ef4444 40%, #ff7070 50%, #ef4444 60%, rgba(239,68,68,0.3) 85%, transparent)',
            boxShadow: '0 0 6px 1px rgba(239,68,68,0.9), 0 0 16px 3px rgba(239,68,68,0.35)',
          }}
          animate={{ top: ['2px', `${size - 6}px`, '2px'] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>
    </div>
  )
}

// Cantoneiras (molduras dos cantos da tela)
function Corner({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = 'fixed w-10 h-10 pointer-events-none z-10 border-red-600/30'
  const map: Record<string, string> = {
    tl: 'top-6 left-6 border-t border-l',
    tr: 'top-6 right-6 border-t border-r',
    bl: 'bottom-6 left-6 border-b border-l',
    br: 'bottom-6 right-6 border-b border-r',
  }
  return <div className={`${base} ${map[pos]}`} />
}

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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#06030a] select-none">
      {/* Grid + glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.5]" style={{
          backgroundImage: 'linear-gradient(rgba(180,0,30,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(180,0,30,0.05) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
          maskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 30%, #000, transparent 80%)',
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[340px] rounded-full bg-red-900/12 blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(180,0,30,0.07),transparent)]" />
      </div>

      <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />

      {/* Status topo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 mb-8 flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
        </span>
        <span className="text-[10px] font-mono tracking-[0.35em] uppercase text-red-500/70">SYS::ENCRYPTED · OAuth Flow</span>
      </motion.div>

      {/* Logo */}
      <motion.div initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 260, damping: 22 }}
        className="relative z-10 mb-4">
        <EncryptedLogo size={92} />
      </motion.div>

      {/* Marca */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="relative z-10 text-center mb-1">
        <div className="font-black text-[26px] tracking-tight">
          <span className="text-zinc-100">ENCRYPTED</span><span className="text-red-500">SOFTWARE</span>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}
        className="relative z-10 text-[10px] font-mono tracking-[0.35em] mb-8 uppercase text-zinc-700">
        Checkout · Mercado Pago
      </motion.div>

      {/* Card */}
      <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, type: 'spring', stiffness: 240, damping: 24 }}
        className="w-full max-w-md relative z-10">
        <div className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, rgba(20,0,28,0.96) 0%, rgba(12,0,15,0.98) 100%)',
            border: '1px solid rgba(180,0,30,0.18)',
            boxShadow: '0 0 60px rgba(140,0,20,0.10), 0 24px 48px rgba(0,0,0,0.5)',
          }}>
          {/* Tab header */}
          <div className="flex border-b border-red-900/20">
            <div className="flex-1 py-3.5 text-center text-[11px] font-mono font-bold tracking-[0.25em] uppercase text-red-500 border-b-2 border-red-600 relative">
              OAuth
              <span className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
            </div>
          </div>

          <div className="p-7">
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6 relative">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                    style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', boxShadow: '0 0 30px rgba(34,197,94,0.25)' }}>
                    <CheckCircle2 size={28} className="text-emerald-400" />
                  </div>
                  <div className="font-black text-xl text-emerald-400 mb-2">Conta conectada!</div>
                  {successName && (
                    <div className="text-sm font-mono mt-2 mb-1 text-zinc-400">
                      <span className="text-zinc-600">Conta: </span>{decodeURIComponent(successName)}
                    </div>
                  )}
                  <div className="mt-6 text-[10px] font-mono text-zinc-600">Você já pode fechar esta aba.</div>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* Section heading */}
                  <div className="text-[11px] font-mono font-bold tracking-[0.28em] uppercase text-red-500 mb-4">
                    ▸ Conectar sua conta
                  </div>

                  {/* Info box */}
                  <div className="flex gap-3 rounded-xl px-4 py-3.5 mb-6"
                    style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.14)' }}>
                    <Info size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-[12px] leading-relaxed text-zinc-400">
                      Digite seu <span className="text-red-300 font-semibold">nome</span> e clique em <span className="text-red-300 font-semibold">CONECTAR</span>. Você vai fazer login no Mercado Pago e autorizar o acesso — depois volta aqui automaticamente.
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

                  {/* Nome */}
                  <div className="mb-6">
                    <div className="text-[10px] font-mono font-bold tracking-[0.25em] uppercase mb-2 flex items-center gap-1.5 text-zinc-500">
                      <User size={11} /> Seu nome
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && connect()}
                      placeholder="Ex: FULANO"
                      maxLength={60}
                      autoFocus
                      className="w-full rounded-xl px-4 py-3.5 text-sm font-mono text-white outline-none transition-all placeholder-zinc-700"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.45)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
                    />
                    <div className="text-[10px] font-mono text-zinc-700 mt-1.5">Apenas seu nome — sem prefixo</div>
                  </div>

                  {/* Botão */}
                  <button
                    onClick={connect}
                    disabled={loading || !name.trim()}
                    className="relative w-full py-4 rounded-xl overflow-hidden font-black tracking-[0.14em] text-sm uppercase transition-all active:scale-95 disabled:opacity-40 flex items-center justify-center gap-2 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #6b0011, #a8001a 45%, #c50020 60%, #8c0018)',
                      boxShadow: '0 0 28px rgba(180,0,30,0.45)',
                    }}>
                    {loading ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecionando…</>
                    ) : (
                      <><Link2 size={15} /> Conectar Mercado Pago</>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 text-center mt-6 text-[10px] font-mono tracking-[0.3em] uppercase text-zinc-800">
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
