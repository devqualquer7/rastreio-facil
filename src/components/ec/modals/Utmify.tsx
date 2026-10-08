'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, ExternalLink, Send, Eye, EyeOff, RefreshCw, CheckCircle2, TrendingUp } from 'lucide-react'
import { ModalBackdrop } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'

const UTMIFY_VIOLET = '#7C3AED'

// Wordmark UTMIFY (marca roxa) — badge + texto
function UtmifyLogo({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="rounded-lg flex items-center justify-center font-black text-white"
        style={{ width: size, height: size, background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', fontSize: size * 0.5, boxShadow: '0 0 14px rgba(124,58,237,.5)' }}>
        U
      </div>
      <span className="font-black tracking-tight text-lg" style={{ color: '#a78bfa' }}>
        utmify
      </span>
    </div>
  )
}

interface Config { enabled: boolean; apiToken: string }
const EMPTY: Config = { enabled: false, apiToken: '' }

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} type="button" className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? UTMIFY_VIOLET : '#2a2a42' }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  )
}

export function UtmifyModal() {
  const { closeModal, toast } = useApp()
  const [cfg, setCfg] = useState<Config>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    fetch('/api/ec/utmify').then(r => r.json())
      .then(d => { if (d.ok && d.config) setCfg({ ...EMPTY, ...d.config }) })
      .catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function save(next: Config) {
    setCfg(next); setSaving(true)
    try {
      await fetch('/api/ec/utmify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(next) })
    } catch {} finally { setSaving(false) }
  }

  async function sendTest() {
    if (!cfg.apiToken.trim()) { toast('error', 'Cole seu API Token da UTMIFY'); return }
    setTesting(true)
    try {
      await save(cfg)
      const r = await fetch('/api/ec/utmify/test', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ apiToken: cfg.apiToken }),
      })
      const d = await r.json()
      if (d.ok) toast('success', 'Pedido de teste enviado! Confere no painel da UTMIFY 📊')
      else toast('error', d.error || 'Falha ao enviar')
    } catch { toast('error', 'Erro de rede') }
    finally { setTesting(false) }
  }

  return (
    <ModalBackdrop onClose={closeModal}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative bg-[#0b0b16] border border-[#1c1c33] rounded-2xl overflow-hidden shadow-2xl max-h-[88vh] overflow-y-auto"
        style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", width: 'min(92vw, 460px)' }}>

        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${UTMIFY_VIOLET}, transparent)` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#1c1c33] sticky top-0 bg-[#0b0b16] z-10">
          <div className="flex items-center gap-3">
            <UtmifyLogo />
            <div className="text-xs font-mono text-zinc-500 border-l border-[#1c1c33] pl-3">Integração de vendas</div>
          </div>
          <button onClick={closeModal} className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.06] flex items-center justify-center transition">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center"><RefreshCw size={20} className="animate-spin" style={{ color: UTMIFY_VIOLET }} /></div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Master toggle */}
            <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.28)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.35)', color: '#a78bfa' }}>
                <TrendingUp size={16} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-zinc-100">Enviar vendas pra UTMIFY</div>
                <div className="text-[13px] font-mono text-zinc-400">Só vendas <span className="text-emerald-400">aprovadas</span> são reportadas</div>
              </div>
              <Toggle on={cfg.enabled} onClick={() => save({ ...cfg, enabled: !cfg.enabled })} />
            </div>

            {/* Token */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs font-mono font-bold tracking-[0.2em] uppercase" style={{ color: '#a78bfa' }}>API Token (Credencial)</div>
                <a href="https://app.utmify.com.br" target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs font-mono transition" style={{ color: '#a78bfa' }}>
                  <ExternalLink size={11} /> Abrir UTMIFY
                </a>
              </div>
              <div className="relative mb-1">
                <input type={show ? 'text' : 'password'} value={cfg.apiToken}
                  onChange={e => setCfg({ ...cfg, apiToken: e.target.value })}
                  onBlur={() => save(cfg)}
                  placeholder="cole aqui o token da credencial da UTMIFY"
                  className="w-full bg-[#08080f] border border-[#1c1c33] rounded-xl px-4 py-3 pr-11 text-sm font-mono text-zinc-100 outline-none transition-all focus:border-[#7C3AED]/60" />
                <button onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="text-xs font-mono text-zinc-500">Na UTMIFY → Integrações → Webhook/API → "Nova credencial" → copia o token</div>
            </div>

            {/* Test */}
            <button onClick={sendTest} disabled={testing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-mono font-bold tracking-wider transition disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', boxShadow: '0 0 18px rgba(124,58,237,.35)' }}>
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              {testing ? 'ENVIANDO…' : 'ENVIAR PEDIDO DE TESTE'}
            </button>

            <div className="flex items-start gap-2.5 rounded-xl p-3" style={{ background: 'rgba(124,58,237,.06)', border: '1px solid rgba(124,58,237,.2)' }}>
              <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" style={{ color: '#a78bfa' }} />
              <div className="text-xs font-mono text-zinc-400 leading-relaxed">
                Cada usuário usa o <span className="text-zinc-300">próprio token</span> — você recebe na UTMIFY só as <span className="text-zinc-300">suas</span> vendas. O envio é automático toda vez que um link seu é pago.
              </div>
            </div>

            <div className="text-xs font-mono text-zinc-500 text-center">
              {saving ? 'Salvando…' : 'Alterações salvas automaticamente.'}
            </div>
          </div>
        )}
      </motion.div>
    </ModalBackdrop>
  )
}
