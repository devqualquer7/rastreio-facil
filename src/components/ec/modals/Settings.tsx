'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Settings2, Save, RefreshCw, Link2, Copy, Eye, EyeOff } from 'lucide-react'
import { ModalBackdrop, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'

interface SettingsData {
  default_title: string
  auto_cancel_enabled: boolean
  max_rejections_per_link: number
  cancel_after_minutes: number
  mp_oauth_client_id: string
  mp_oauth_client_secret: string
  mp_oauth_redirect_url: string
}

type Tab = 'geral' | 'oauth'

export function SettingsModal() {
  const { closeModal, toast } = useApp()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<Tab>('geral')
  const [showSecret, setShowSecret] = useState(false)
  const [origin, setOrigin] = useState('')
  const [data, setData] = useState<SettingsData>({
    default_title: 'Pagamento',
    auto_cancel_enabled: false,
    max_rejections_per_link: 3,
    cancel_after_minutes: 60,
    mp_oauth_client_id: '',
    mp_oauth_client_secret: '',
    mp_oauth_redirect_url: '',
  })

  useEffect(() => {
    setOrigin(window.location.origin)
    fetch('/api/ec/settings')
      .then(r => r.json())
      .then(d => { if (d.ok) setData(d.settings) })
      .catch(() => toast('error', 'Falha ao carregar configurações'))
      .finally(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true)
    try {
      const r = await fetch('/api/ec/settings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data)
      })
      const d = await r.json()
      if (d.ok) { toast('success', 'Configurações salvas'); closeModal() }
      else toast('error', d.error || 'Falha')
    } catch { toast('error', 'Erro de rede') }
    finally { setSaving(false) }
  }

  const oauthPageUrl = `${origin}/key`
  const callbackUrl = `${origin}/api/ec/oauth/callback`

  return (
    <ModalBackdrop onClose={closeModal}>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative bg-gradient-to-b from-[#0d0d18]/98 to-[#09090f]/98 backdrop-blur-2xl border border-red-500/20 rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(255,43,74,.15)] w-full max-w-lg">

        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/60 to-transparent" />
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-center justify-between px-6 pt-6 pb-5 border-b border-red-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
              <Settings2 size={16} className="text-red-400" />
            </div>
            <div>
              <div className="font-black text-sm text-zinc-100 tracking-wide uppercase">Configurações</div>
              <div className="text-xs font-mono text-zinc-500 mt-0.5">Padrões do sistema</div>
            </div>
          </div>
          <button onClick={closeModal} className="w-8 h-8 rounded-xl text-zinc-400 hover:text-zinc-300 hover:bg-white/[0.06] flex items-center justify-center transition">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-red-500/10 px-6 pt-4 gap-4">
          {(['geral', 'oauth'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 text-[13px] font-mono font-bold tracking-widest uppercase transition-all border-b-2 ${
                tab === t
                  ? 'border-red-500 text-red-300'
                  : 'border-transparent text-zinc-500 hover:text-zinc-400'
              }`}>
              {t === 'geral' ? 'Geral' : 'OAuth MP'}
            </button>
          ))}
        </div>

        <div className="relative p-6">
          {loading ? (
            <div className="py-8 flex items-center justify-center">
              <RefreshCw size={18} className="animate-spin text-red-400" />
            </div>
          ) : tab === 'geral' ? (
            <div className="space-y-5">
              {/* Título padrão */}
              <div>
                <div className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-2">
                  Título padrão dos links
                </div>
                <input
                  type="text" value={data.default_title}
                  onChange={e => setData(d => ({ ...d, default_title: e.target.value }))}
                  maxLength={100}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 transition-all"
                />
              </div>

              {/* Max rejeições */}
              <div>
                <div className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-2">
                  Max rejeições por link
                </div>
                <input
                  type="number" min={1} max={20} value={data.max_rejections_per_link}
                  onChange={e => setData(d => ({ ...d, max_rejections_per_link: parseInt(e.target.value) || 3 }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 transition-all"
                />
                <div className="text-xs font-mono text-zinc-500 mt-1">Link cancelado automaticamente após este número de recusas</div>
              </div>

              {/* Auto-cancelar */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <div>
                  <div className="text-xs font-bold text-zinc-300 tracking-wide">Auto-cancelar por tempo</div>
                  <div className="text-xs font-mono text-zinc-500 mt-0.5">Cancela links pendentes depois de X minutos</div>
                </div>
                <button
                  onClick={() => setData(d => ({ ...d, auto_cancel_enabled: !d.auto_cancel_enabled }))}
                  className={`relative w-11 h-6 rounded-full transition-all ${data.auto_cancel_enabled ? 'bg-red-500' : 'bg-zinc-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${data.auto_cancel_enabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {data.auto_cancel_enabled && (
                <div>
                  <div className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-2">
                    Cancelar após (minutos)
                  </div>
                  <input
                    type="number" min={5} max={1440} value={data.cancel_after_minutes}
                    onChange={e => setData(d => ({ ...d, cancel_after_minutes: parseInt(e.target.value) || 60 }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 transition-all"
                  />
                </div>
              )}

              <Button variant="accent" size="lg" icon={<Save size={13} />} onClick={save} loading={saving} className="w-full justify-center">
                Salvar Configurações
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-xs font-mono text-zinc-500 leading-relaxed bg-white/[0.02] border border-white/[0.06] rounded-xl p-3">
                Configure seu App do Mercado Pago (Dashboard MP → Aplicações) para permitir que usuários conectem suas contas via OAuth.
              </div>

              {/* Client ID */}
              <div>
                <div className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-2">Client ID</div>
                <input
                  type="text" value={data.mp_oauth_client_id}
                  onChange={e => setData(d => ({ ...d, mp_oauth_client_id: e.target.value }))}
                  placeholder="123456789"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 transition-all"
                />
              </div>

              {/* Client Secret */}
              <div>
                <div className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-2">Client Secret</div>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={data.mp_oauth_client_secret}
                    onChange={e => setData(d => ({ ...d, mp_oauth_client_secret: e.target.value }))}
                    placeholder="••••••••••••••••"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 pr-12 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 transition-all"
                  />
                  <button onClick={() => setShowSecret(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-400 transition">
                    {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Redirect URL */}
              <div>
                <div className="text-xs font-mono font-bold tracking-[0.25em] text-zinc-400 uppercase mb-2">
                  URL de Redirecionamento (opcional)
                </div>
                <input
                  type="text" value={data.mp_oauth_redirect_url}
                  onChange={e => setData(d => ({ ...d, mp_oauth_redirect_url: e.target.value }))}
                  placeholder={callbackUrl}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-red-500/50 transition-all"
                />
                <div className="text-xs font-mono text-zinc-500 mt-1">Deixe vazio para usar: {callbackUrl}</div>
              </div>

              {/* OAuth page URL to share */}
              <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-4">
                <div className="text-xs font-mono font-bold tracking-[0.25em] text-red-500 uppercase mb-2 flex items-center gap-1.5">
                  <Link2 size={11} /> Link para trabalhadores conectarem
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-[13px] font-mono text-zinc-400 bg-white/[0.04] rounded-lg px-3 py-2 truncate">{oauthPageUrl}</div>
                  <button
                    onClick={() => { navigator.clipboard.writeText(oauthPageUrl); toast('success', 'Link copiado!') }}
                    className="p-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition flex-shrink-0">
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              <Button variant="accent" size="lg" icon={<Save size={13} />} onClick={save} loading={saving} className="w-full justify-center">
                Salvar OAuth
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    </ModalBackdrop>
  )
}
