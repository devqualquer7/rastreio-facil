'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react'

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
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus,input:-webkit-autofill:active{
          -webkit-box-shadow:0 0 0 1000px #14030b inset !important;-webkit-text-fill-color:#f4dede !important;caret-color:#ef4444;
          transition:background-color 9999s ease-in-out 0s;
        }
        @keyframes ec-aura{0%,100%{transform:scale(1);opacity:.55}50%{transform:scale(1.12);opacity:.8}}
        @keyframes ec-scan{0%{top:6%}100%{top:94%}}
        @keyframes ec-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes ec-sheen{0%{transform:translateX(-120%) skewX(-18deg)}60%,100%{transform:translateX(220%) skewX(-18deg)}}
        @keyframes ec-gridpan{0%{background-position:0 0}100%{background-position:44px 44px}}
        .ec-field{transition:border-color .2s,box-shadow .2s,background .2s}
        .ec-field:focus{border-color:rgba(239,68,68,.55)!important;background:rgba(197,0,32,.06)!important;box-shadow:0 0 0 3px rgba(197,0,32,.14),0 0 22px rgba(197,0,32,.12)}
        .ec-cta{position:relative;overflow:hidden}
        .ec-cta::after{content:'';position:absolute;top:0;bottom:0;width:45%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);transform:translateX(-120%) skewX(-18deg)}
        .ec-cta:hover::after{animation:ec-sheen 1.1s ease}
        .ec-corner{position:fixed;width:34px;height:34px;border-color:rgba(197,0,32,.35);pointer-events:none;z-index:10}
      `}</style>

      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden select-none"
        style={{ background: '#07020a' }}>

        {/* Atmosfera */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          {/* grid sutil */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(197,0,32,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(197,0,32,.05) 1px,transparent 1px)',
            backgroundSize: '44px 44px', animation: 'ec-gridpan 14s linear infinite',
            maskImage: 'radial-gradient(ellipse 62% 55% at 50% 32%,#000,transparent 82%)',
            WebkitMaskImage: 'radial-gradient(ellipse 62% 55% at 50% 32%,#000,transparent 82%)',
          }} />
          {/* aura carmim de topo */}
          <div className="absolute top-[-14%] left-1/2 -translate-x-1/2 w-[900px] h-[420px] rounded-full"
            style={{ background: 'radial-gradient(ellipse,rgba(197,0,32,.16),transparent 68%)', filter: 'blur(30px)' }} />
          {/* vinheta base */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 120%,rgba(0,0,0,.7),transparent 60%)' }} />
        </div>

        {/* Molduras de canto */}
        <div className="ec-corner top-6 left-6 border-t border-l" />
        <div className="ec-corner top-6 right-6 border-t border-r" />
        <div className="ec-corner bottom-6 left-6 border-b border-l" />
        <div className="ec-corner bottom-6 right-6 border-b border-r" />

        {/* Status */}
        <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative z-10 mb-9 flex items-center gap-2 rounded-full px-4 py-1.5"
          style={{ background: 'rgba(120,0,20,.18)', border: '1px solid rgba(239,68,68,.2)' }}>
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
          <span className="text-[10px] font-mono tracking-[0.32em] text-red-500/75 uppercase">SYS::ENCRYPTED · Panel Access</span>
        </motion.div>

        {/* Logo grande, flutuando, com aura */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.06, type: 'spring', stiffness: 200, damping: 20 }}
          className="relative z-10 mb-5">
          <div className="relative" style={{ width: 150, height: 150, animation: 'ec-float 5s ease-in-out infinite' }}>
            {/* aura pulsante */}
            <div className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle,rgba(239,68,68,.30),rgba(197,0,32,.10) 45%,transparent 70%)', filter: 'blur(14px)', animation: 'ec-aura 4s ease-in-out infinite' }} />
            {/* logo */}
            <img src="/logo.png" alt="Encrypted" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              className="relative z-10 w-full h-full object-contain"
              style={{ filter: 'drop-shadow(0 0 26px rgba(239,68,68,.5)) drop-shadow(0 8px 24px rgba(0,0,0,.6))' }} />
            {/* scanner — só a linha */}
            <div className="absolute left-[10%] right-[10%] z-20 pointer-events-none" style={{
              height: 1, top: '6%',
              background: 'linear-gradient(90deg,transparent,rgba(239,68,68,.35) 20%,#ff5a5a 50%,rgba(239,68,68,.35) 80%,transparent)',
              boxShadow: '0 0 8px 1px rgba(239,68,68,.9),0 0 18px 4px rgba(239,68,68,.35)',
              animation: 'ec-scan 2.8s linear infinite alternate',
            }} />
          </div>
        </motion.div>

        {/* Marca */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="relative z-10 text-center">
          <div className="font-black tracking-tight leading-none" style={{ fontSize: 30 }}>
            <span className="text-zinc-100">ENCRYPTED</span><span className="text-red-500" style={{ textShadow: '0 0 22px rgba(197,0,32,.55)' }}>SOFTWARE</span>
          </div>
          <div className="text-[10px] font-mono text-zinc-600 tracking-[0.4em] mt-2 uppercase">Checkout · Mercado Pago</div>
        </motion.div>

        {/* Card */}
        <motion.form onSubmit={submit}
          initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 24 }}
          className="w-full max-w-[380px] relative z-10 mt-9">
          <div className="relative rounded-3xl p-7"
            style={{
              background: 'linear-gradient(158deg,rgba(28,4,20,.94),rgba(12,2,10,.97))',
              border: '1px solid rgba(197,0,32,.20)',
              boxShadow: '0 0 70px rgba(140,0,20,.14),0 30px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,120,120,.08)',
            }}>
            {/* barra de luz no topo */}
            <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(239,68,68,.7),transparent)' }} />
            {/* ticks de canto internos */}
            <div className="absolute top-3 left-3 w-3 h-3 border-t border-l rounded-tl" style={{ borderColor: 'rgba(239,68,68,.35)' }} />
            <div className="absolute top-3 right-3 w-3 h-3 border-t border-r rounded-tr" style={{ borderColor: 'rgba(239,68,68,.35)' }} />
            <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l rounded-bl" style={{ borderColor: 'rgba(239,68,68,.35)' }} />
            <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r rounded-br" style={{ borderColor: 'rgba(239,68,68,.35)' }} />

            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(197,0,32,.14)', border: '1px solid rgba(239,68,68,.25)' }}>
                <ShieldCheck size={16} className="text-red-400" />
              </div>
              <div>
                <div className="text-[13px] font-black text-zinc-100 tracking-wide">Acesso ao Painel</div>
                <div className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase">Autenticação segura</div>
              </div>
            </div>

            {/* Usuário */}
            <div className="mb-4">
              <label className="flex items-center gap-1.5 text-[10px] font-mono tracking-[0.24em] text-zinc-500 uppercase mb-2">
                <User size={10} /> Usuário
              </label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500/50 pointer-events-none" />
                <input value={u} onChange={e => setU(e.target.value)} autoComplete="username" autoFocus spellCheck={false}
                  placeholder="seu usuário"
                  className="ec-field w-full rounded-xl pl-10 pr-4 py-3.5 text-sm font-mono outline-none placeholder-zinc-700"
                  style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', color: '#f4dede' }} />
              </div>
            </div>

            {/* Senha */}
            <div className="mb-5">
              <label className="flex items-center gap-1.5 text-[10px] font-mono tracking-[0.24em] text-zinc-500 uppercase mb-2">
                <Lock size={10} /> Senha
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500/50 pointer-events-none" />
                <input type="password" value={p} onChange={e => setP(e.target.value)} autoComplete="current-password" spellCheck={false}
                  onKeyDown={e => e.key === 'Enter' && submit(e as any)}
                  placeholder="••••••••"
                  className="ec-field w-full rounded-xl pl-10 pr-4 py-3.5 text-sm font-mono outline-none placeholder-zinc-700"
                  style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', color: '#f4dede' }} />
              </div>
              {err && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-[11px] font-mono text-red-400/90 mt-2.5 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />{err}
                </motion.p>
              )}
            </div>

            {/* Botão */}
            <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
              className="ec-cta w-full py-4 rounded-2xl font-black tracking-[0.16em] text-sm text-white uppercase disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg,#6b0011 0%,#a8001a 42%,#d10022 60%,#8c0018 100%)',
                boxShadow: '0 0 26px rgba(197,0,32,.5),inset 0 1px 0 rgba(255,120,120,.18)',
              }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" /> Entrando…</>
                : <>Acessar Painel <ArrowRight size={15} /></>}
            </motion.button>
          </div>
        </motion.form>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="relative z-10 mt-8 text-[9px] font-mono text-zinc-700/80 tracking-[0.35em] uppercase">
          Anti-Detect · IP Cloud · v2
        </motion.div>
      </div>
    </>
  )
}
