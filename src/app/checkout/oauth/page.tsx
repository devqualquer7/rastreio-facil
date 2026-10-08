'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, CheckCircle2, AlertCircle, ArrowRight, User } from 'lucide-react'

function OAuthPageInner() {
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
        setErr(d.error || 'Erro ao iniciar OAuth')
        setLoading(false)
      }
    } catch {
      setErr('Erro de conexão')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-red-900/20 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-rose-900/15 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative w-full max-w-md">

        <div className="relative bg-gradient-to-b from-[#0d0d18]/98 to-[#09090f]/98 backdrop-blur-2xl border border-red-500/20 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(255,43,74,.15)] p-8">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8 relative">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500 via-red-500/50 to-rose-400 opacity-40 blur-lg" />
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-red-700 to-rose-600 flex items-center justify-center text-white font-black text-lg border border-red-400/20">
                E
              </div>
            </div>
            <div>
              <div className="font-black text-sm text-white tracking-tight">ENCRYPTED</div>
              <div className="text-[11px] font-mono text-zinc-500 tracking-[0.25em] uppercase">Conectar conta MP</div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(34,197,94,.3)]">
                  <CheckCircle2 size={28} className="text-emerald-400" />
                </div>
                <div className="font-black text-xl text-emerald-400 mb-2">Conta conectada!</div>
                {successName && (
                  <div className="text-sm font-mono text-zinc-400 mb-1">
                    <span className="text-zinc-500">Conta: </span>{decodeURIComponent(successName)}
                  </div>
                )}
                <div className="text-xs font-mono text-zinc-500 mt-3">
                  Você já pode fechar esta aba.
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-6 relative">
                  <div className="font-black text-xl text-white mb-2">Conectar Mercado Pago</div>
                  <div className="text-sm font-mono text-zinc-400 leading-relaxed">
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
                  <div className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-2 flex items-center gap-1.5">
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
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 focus:bg-red-500/[0.04] transition-all placeholder-zinc-700"
                  />
                </div>

                <button
                  onClick={connect}
                  disabled={loading || !name.trim()}
                  className="relative w-full py-4 rounded-2xl bg-gradient-to-br from-ec-red-deep via-ec-red-deep to-ec-red text-white font-black tracking-wide text-sm uppercase shadow-[0_0_20px_rgba(255,43,74,.4)] hover:shadow-[0_0_35px_rgba(255,43,74,.6)] active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Redirecionando…</>
                  ) : (
                    <><Zap size={15} fill="white" /> Conectar com Mercado Pago <ArrowRight size={15} /></>
                  )}
                </button>

                <div className="mt-4 text-center text-xs font-mono text-zinc-500">
                  Você será redirecionado para o Mercado Pago para autorizar o acesso.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default function OAuthPage() {
  return (
    <Suspense>
      <OAuthPageInner />
    </Suspense>
  )
}
