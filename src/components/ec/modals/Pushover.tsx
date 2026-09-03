'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bell, X, KeyRound, ExternalLink, Send, Eye, EyeOff,
  CheckCircle2, XCircle, Ban, Volume2, RefreshCw,
} from 'lucide-react'
import { ModalBackdrop } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'

const SOUNDS = [
  { value: 'pushover',     label: 'Pushover (padrão)' },
  { value: 'cashregister', label: 'Caixa registradora 💰' },
  { value: 'magic',        label: 'Mágico ✨' },
  { value: 'cosmic',       label: 'Cósmico 🌌' },
  { value: 'bugle',        label: 'Corneta 🎺' },
  { value: 'gamelan',      label: 'Gamelan 🔔' },
  { value: 'incoming',     label: 'Chegando 📲' },
  { value: 'intermission', label: 'Intervalo' },
  { value: 'mechanical',   label: 'Mecânico ⚙️' },
  { value: 'siren',        label: 'Sirene 🚨' },
  { value: 'spacealarm',   label: 'Alarme espacial 🛸' },
  { value: 'updown',       label: 'Sobe-desce' },
  { value: 'none',         label: 'Silencioso 🔕' },
]

type EventKey = 'approved' | 'rejected' | 'cancelled'

const EVENTS: { key: EventKey; icon: any; title: string; desc: string; color: string }[] = [
  { key: 'approved',  icon: CheckCircle2, title: 'Pagamento aprovado', desc: 'Toda vez que um link seu for pago',         color: '#00e396' },
  { key: 'rejected',  icon: XCircle,      title: 'Pagamento recusado', desc: 'Cliente tentou pagar e foi recusado (sem limite, CVV, antifraude…)', color: '#ff2b4a' },
  { key: 'cancelled', icon: Ban,          title: 'Link cancelado',     desc: 'Link cancelado ou estornado',               color: '#ffc83d' },
]

interface Config {
  enabled: boolean
  userKey: string
  apiToken: string
  events: Record<EventKey, boolean>
  sounds: Record<EventKey, string>
}

const EMPTY: Config = {
  enabled: false, userKey: '', apiToken: '',
  events: { approved: true, rejected: true, cancelled: true },
  sounds: { approved: 'cashregister', rejected: 'pushover', cancelled: 'pushover' },
}

function Toggle({ on, onClick, color = '#00e396' }: { on: boolean; onClick: () => void; color?: string }) {
  return (
    <button onClick={onClick} type="button"
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ background: on ? color : '#2a2a42' }}>
      <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
        style={{ transform: on ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  )
}

export function PushoverModal() {
  const { closeModal, toast } = useApp()
  const [cfg, setCfg] = useState<Config>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [showToken, setShowToken] = useState(false)

  useEffect(() => {
    fetch('/api/ec/pushover')
      .then(r => r.json())
      .then(d => { if (d.ok && d.config) setCfg({ ...EMPTY, ...d.config, events: { ...EMPTY.events, ...d.config.events }, sounds: { ...EMPTY.sounds, ...d.config.sounds } }) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function save(next: Config) {
    setCfg(next)
    setSaving(true)
    try {
      await fetch('/api/ec/pushover', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(next),
      })
    } catch {} finally { setSaving(false) }
  }

  async function sendTest() {
    if (!cfg.userKey.trim() || !cfg.apiToken.trim()) { toast('error', 'Preencha User Key e API Token'); return }
    setTesting(true)
    try {
      // salva antes pra garantir persistência
      await save(cfg)
      const r = await fetch('/api/ec/pushover/test', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userKey: cfg.userKey, apiToken: cfg.apiToken, sound: cfg.sounds.approved }),
      })
      const d = await r.json()
      if (d.ok) toast('success', 'Notificação de teste enviada! Olha o celular 📲')
      else toast('error', d.error || 'Falha ao enviar')
    } catch { toast('error', 'Erro de rede') }
    finally { setTesting(false) }
  }

  const inputCls = 'w-full bg-[#08080f] border border-[#1c1c33] rounded-xl px-4 py-3 pr-11 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 transition-all'

  return (
    <ModalBackdrop onClose={closeModal}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative bg-[#0b0b16] border border-[#1c1c33] rounded-2xl overflow-hidden shadow-2xl max-h-[88vh] overflow-y-auto"
        style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>

        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, #ff2b4a, transparent)' }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#1c1c33] sticky top-0 bg-[#0b0b16] z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 flex items-center justify-center">
              <Bell size={16} />
            </div>
            <div>
              <div className="font-bold text-sm text-zinc-100 tracking-wide uppercase">Notificações no Celular</div>
              <div className="text-[10px] font-mono text-zinc-600 mt-0.5">Pushover · receba alertas onde estiver</div>
            </div>
          </div>
          <button onClick={closeModal} className="w-8 h-8 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] flex items-center justify-center transition">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-red-400" /></div>
        ) : (
          <div className="p-6 space-y-6" style={{ width: 'min(92vw, 460px)' }}>
            {/* Master toggle */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/25">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Bell size={16} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm text-zinc-100">Notificações Ativadas</div>
                <div className="text-[11px] font-mono text-zinc-500">Alertas enviados pro seu celular</div>
              </div>
              <Toggle on={cfg.enabled} onClick={() => save({ ...cfg, enabled: !cfg.enabled })} />
            </div>

            {/* Credentials */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-[0.2em] text-red-400 uppercase">
                  <KeyRound size={12} /> Credenciais Pushover
                </div>
                <a href="https://pushover.net" target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono text-red-400 hover:text-red-300 transition">
                  <ExternalLink size={11} /> Abrir pushover.net
                </a>
              </div>

              <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 tracking-wider">@ USER KEY</label>
              <div className="relative mb-1">
                <input type={showKey ? 'text' : 'password'} value={cfg.userKey}
                  onChange={e => setCfg({ ...cfg, userKey: e.target.value })}
                  onBlur={() => save(cfg)}
                  placeholder="u2mde8b7moz1xfk9acfeo…" className={inputCls} />
                <button onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="text-[10px] font-mono text-zinc-600 mb-4">Achado na home do pushover.net após login</div>

              <label className="block text-[10px] font-mono text-zinc-500 mb-1.5 tracking-wider">⚿ API TOKEN</label>
              <div className="relative mb-1">
                <input type={showToken ? 'text' : 'password'} value={cfg.apiToken}
                  onChange={e => setCfg({ ...cfg, apiToken: e.target.value })}
                  onBlur={() => save(cfg)}
                  placeholder="aj5d8muwo1qtx154ifse7…" className={inputCls} />
                <button onClick={() => setShowToken(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300">
                  {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div className="text-[10px] font-mono text-zinc-600">Em "Your Applications" → cria uma com nome "EncryptedSoftware" → pega o token</div>
            </div>

            {/* Test button */}
            <button onClick={sendTest} disabled={testing}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-[#1c1c33] bg-white/[0.03] hover:bg-white/[0.06] text-zinc-200 text-sm font-mono font-bold tracking-wider transition disabled:opacity-50">
              {testing ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              {testing ? 'ENVIANDO…' : 'ENVIAR NOTIFICAÇÃO DE TESTE'}
            </button>

            {/* Per-event */}
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-[0.2em] text-red-400 uppercase mb-3">
                <Volume2 size={12} /> Quais notificações receber
              </div>
              <div className="space-y-3">
                {EVENTS.map(ev => {
                  const Icon = ev.icon
                  const on = cfg.events[ev.key]
                  return (
                    <div key={ev.key} className="rounded-2xl border border-[#1c1c33] bg-white/[0.02] p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: ev.color + '22', border: `1px solid ${ev.color}44`, color: ev.color }}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-zinc-100">{ev.title}</div>
                          <div className="text-[10px] font-mono text-zinc-500 leading-relaxed">{ev.desc}</div>
                        </div>
                        <Toggle on={on} color={ev.color} onClick={() => save({ ...cfg, events: { ...cfg.events, [ev.key]: !on } })} />
                      </div>
                      {on && (
                        <div className="mt-3 pl-11">
                          <label className="block text-[9px] font-mono text-zinc-600 tracking-[0.2em] uppercase mb-1.5">Som da notificação</label>
                          <select value={cfg.sounds[ev.key]}
                            onChange={e => save({ ...cfg, sounds: { ...cfg.sounds, [ev.key]: e.target.value } })}
                            className="w-full bg-[#08080f] border border-[#1c1c33] rounded-xl px-3 py-2.5 text-sm font-mono text-zinc-200 outline-none focus:border-red-500/50 cursor-pointer">
                            {SOUNDS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="text-[10px] font-mono text-zinc-600 leading-relaxed text-center pt-1">
              {saving ? 'Salvando…' : 'Alterações salvas automaticamente. Você só recebe alertas das SUAS vendas.'}
            </div>
          </div>
        )}
      </motion.div>
    </ModalBackdrop>
  )
}
