'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, User } from 'lucide-react'

const MONO = "'JetBrains Mono', ui-monospace, Consolas, monospace"

export default function ECLoginPage() {
  const router = useRouter()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!u.trim() || !p) { setErr('Preencha todos os campos.'); return }
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
        input:-webkit-autofill,input:-webkit-autofill:hover,input:-webkit-autofill:focus{
          -webkit-box-shadow:0 0 0 1000px #08080f inset !important;-webkit-text-fill-color:#e4e4f4 !important;caret-color:#ff2b4a;
          transition:background-color 9999s ease-in-out 0s;
        }
        .ec2-input{background:#08080f;border:1px solid #1c1c33;border-radius:8px;color:#e4e4f4;font-family:${MONO};transition:border-color .2s,box-shadow .2s}
        .ec2-input::placeholder{color:#52526e}
        .ec2-input:focus{border-color:#ff2b4a;box-shadow:0 0 10px rgba(255,43,74,.15)}
        @keyframes ec2-scan{0%{transform:translateY(-12px)}100%{transform:translateY(152px)}}
        @keyframes ec2-aura{0%,100%{opacity:.5;transform:scale(.95)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes ec2-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      `}</style>

      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060610', color: '#e4e4f4', fontFamily: MONO, overflow: 'hidden', userSelect: 'none' }}>
        {/* grid */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', opacity: 0.3,
          backgroundImage: 'linear-gradient(rgba(28,28,51,.4) 1px,transparent 1px),linear-gradient(90deg,rgba(28,28,51,.4) 1px,transparent 1px)',
          backgroundSize: '40px 40px' }} />
        {/* spotlight vermelho no topo */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,43,74,.08) 0%, transparent 60%)' }} />
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 256, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(255,43,74,.04), transparent)' }} />
        {/* blobs */}
        <div style={{ position: 'absolute', top: '22%', left: '22%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,43,74,.06)', filter: 'blur(90px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '22%', right: '22%', width: 500, height: 500, borderRadius: '50%', background: 'rgba(255,43,74,.06)', filter: 'blur(90px)', pointerEvents: 'none' }} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ position: 'relative', zIndex: 10, width: 420, maxWidth: '92vw' }}>

          {/* Marca */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ position: 'relative', width: 140, height: 140, animation: 'ec2-float 3.5s ease-in-out infinite' }}>
                <div style={{ position: 'absolute', inset: -24, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,43,74,.45) 0%, transparent 65%)', filter: 'blur(24px)', animation: 'ec2-aura 3s ease-in-out infinite' }} />
                <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,43,74,.35) 0%, transparent 70%)', filter: 'blur(10px)' }} />
                <img src="/logo.png" alt="enCrypteD" draggable={false} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  style={{ position: 'relative', width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 0 16px rgba(255,43,74,.55))', zIndex: 10 }} />
                <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: '50%', pointerEvents: 'none', mixBlendMode: 'screen' }}>
                  <div style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, rgba(255,43,74,.9), transparent)', animation: 'ec2-scan 3.5s linear infinite' }} />
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 30, letterSpacing: '0.14em' }}>
              <span style={{ color: '#e4e4f4' }}>ENCRYPTED</span><span style={{ color: '#ff2b4a' }}>SOFTWARE</span>
            </div>
            <div style={{ color: '#52526e', fontSize: 12, marginTop: 8, letterSpacing: '0.35em', textTransform: 'uppercase' }}>
              Checkout Mercado Pago
            </div>
          </div>

          {/* Card glass */}
          <form onSubmit={submit} style={{ position: 'relative', overflow: 'hidden', borderRadius: 16, padding: 32,
            background: 'rgba(11,11,22,.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid #1c1c33' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, #ff2b4a, transparent)' }} />

            <h2 style={{ fontWeight: 700, fontSize: 13, color: '#ff2b4a', letterSpacing: '0.2em', marginBottom: 24, textTransform: 'uppercase' }}>▸ Entrar</h2>

            {/* Usuário */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#52526e', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Usuário</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#52526e' }} />
                <input value={u} onChange={e => setU(e.target.value)} autoFocus autoComplete="username" placeholder="Digite seu usuário"
                  className="ec2-input" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 36px', fontSize: 14, outline: 'none' }} />
              </div>
            </div>

            {/* Senha */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: '#52526e', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#52526e' }} />
                <input type="password" value={p} onChange={e => setP(e.target.value)} autoComplete="current-password" placeholder="••••••••"
                  className="ec2-input" style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px 10px 36px', fontSize: 14, outline: 'none' }} />
              </div>
            </div>

            {err && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 14, fontSize: 12, color: '#ff2b4a', letterSpacing: '0.02em', background: 'rgba(255,43,74,.10)', border: '1px solid rgba(255,43,74,.2)', borderRadius: 8, padding: '8px 12px' }}>
                ⚠ {err}
              </motion.div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', marginTop: 18, padding: '13px', borderRadius: 8, border: 'none', cursor: loading ? 'default' : 'pointer',
                background: loading ? '#cc1b35' : '#cc1b35', color: '#fff', fontWeight: 600, fontSize: 14, letterSpacing: '0.05em', fontFamily: MONO,
                boxShadow: '0 0 10px rgba(255,43,74,.15)', transition: 'background .2s', opacity: loading ? 0.8 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#ff2b4a' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#cc1b35' }}>
              {loading ? <><span className="animate-spin" style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} /> ENTRANDO…</> : 'ENTRAR'}
            </button>
          </form>

          {/* Rodapé */}
          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.35em' }}>
              <span style={{ color: '#ff2b4a', fontWeight: 700 }}>ENCRYPTED</span><span style={{ color: '#52526e' }}> CHECKOUT</span>
            </div>
            <div style={{ color: '#2a2a42', fontSize: 9, letterSpacing: '0.25em', marginTop: 6 }}>v3.53.0 · MERCADO PAGO · 48 SLOTS</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 6 }}>
              <div style={{ height: 1, width: 24, background: 'linear-gradient(to right, transparent, #1c1c33)' }} />
              <div style={{ color: '#52526e', fontSize: 9, letterSpacing: '0.2em' }}>by <span style={{ color: '#ff2b4a', fontWeight: 700 }}>enCrypteD</span></div>
              <div style={{ height: 1, width: 24, background: 'linear-gradient(to left, transparent, #1c1c33)' }} />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}
