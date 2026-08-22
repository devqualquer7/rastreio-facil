'use client'
import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wallet, RefreshCw, Check, ChevronDown, Trash2,
  Eye, EyeOff, Save, Zap, QrCode, Copy, AlertCircle, Download
} from 'lucide-react'
import { SectionTitle, Button } from '@/components/ec/ui/Base'
import { useApp } from '@/lib/ec-store'
import { cn } from '@/lib/ec-utils'

interface GatewayField {
  key: string
  label: string
  placeholder: string
  secret?: boolean
}

interface Gateway {
  id: string
  label: string
  configured: boolean
  isActive: boolean
  fields: GatewayField[]
  redacted: Record<string, string>
}

// Minimal static PIX QR payload builder (BR Code standard)
function buildPixPayload(key: string, name: string, city: string, amount?: number): string {
  const safe = (s: string) => s.slice(0, 25).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim()
  const safeKey = key.replace(/\s/g, '').slice(0, 77)
  const safeName = safe(name) || 'BENEFICIARIO'
  const safeCity = safe(city) || 'SAO PAULO'

  const merchantName = safeName.toUpperCase()
  const merchantCity = safeCity.toUpperCase()
  const txid = '***'

  function tlv(tag: string, value: string): string {
    return `${tag}${String(value.length).padStart(2,'0')}${value}`
  }

  const merchantAccountInfo = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', safeKey)
  const body =
    tlv('00', '01') +
    tlv('26', merchantAccountInfo) +
    tlv('52', '0000') +
    tlv('53', '986') +
    (amount ? tlv('54', amount.toFixed(2)) : '') +
    tlv('58', 'BR') +
    tlv('59', merchantName.slice(0, 25)) +
    tlv('60', merchantCity.slice(0, 15)) +
    tlv('62', tlv('05', txid))

  // CRC16-CCITT
  const full = body + '6304'
  let crc = 0xFFFF
  for (const c of full) {
    crc ^= c.charCodeAt(0) << 8
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xFFFF
    }
  }
  return full + crc.toString(16).toUpperCase().padStart(4, '0')
}

// QR image panel — shows large scannable QR + copy/download buttons
function QRImagePanel({ payload, name, onCopy }: {
  payload: string
  name: string
  onCopy: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dataUrl, setDataUrl] = useState('')
  const [generating, setGenerating] = useState(true)

  useEffect(() => {
    if (!payload) return
    setGenerating(true)
    // Dynamic import to avoid SSR issues
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(payload, {
        width: 340,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'M',
      }).then(url => {
        setDataUrl(url)
        setGenerating(false)
      }).catch(() => setGenerating(false))
    }).catch(() => setGenerating(false))
  }, [payload])

  function downloadQR() {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-pix-${name.replace(/\s+/g, '-').toLowerCase()}.png`
    a.click()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="mt-3 rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0c0c14]">

      {/* QR image area */}
      <div className="flex flex-col items-center py-6 px-4 gap-4">
        {generating ? (
          <div className="w-56 h-56 flex items-center justify-center">
            <RefreshCw size={24} className="animate-spin text-purple-400" />
          </div>
        ) : dataUrl ? (
          <div className="relative">
            {/* White card behind QR for scanning clarity */}
            <div className="bg-white rounded-2xl p-3 shadow-[0_0_40px_rgba(255,255,255,0.12)]">
              <img
                src={dataUrl}
                alt="QR Code PIX"
                className="w-52 h-52 sm:w-60 sm:h-60 block"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
            {/* Subtle glow behind QR */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ boxShadow: '0 0 60px rgba(168,85,247,0.2)' }} />
          </div>
        ) : (
          <div className="w-56 h-56 flex items-center justify-center">
            <div className="text-[10px] font-mono text-red-400">Erro ao gerar QR</div>
          </div>
        )}

        <div className="text-center">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-[0.3em]">PIX ESTÁTICO</div>
          <div className="text-xs font-bold text-zinc-300 mt-0.5">{name || 'Beneficiário'}</div>
          <div className="text-[9px] font-mono text-zinc-700 mt-0.5">Escaneie com qualquer app de pagamento</div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onCopy}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/15 border border-purple-500/25 text-purple-300 hover:bg-purple-500/25 text-[11px] font-mono font-bold tracking-wider uppercase transition-all">
          <Copy size={12} /> Copiar código
        </button>
        {dataUrl && (
          <button
            onClick={downloadQR}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.10] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] text-[11px] font-mono font-bold tracking-wider uppercase transition-all">
            <Download size={12} />
          </button>
        )}
      </div>

      {/* Copia e cola text */}
      <div className="border-t border-white/[0.06] px-4 py-3">
        <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1.5">Copia e cola PIX</div>
        <div className="text-[10px] font-mono text-zinc-500 break-all leading-relaxed max-h-20 overflow-y-auto custom-scrollbar">
          {payload}
        </div>
      </div>
    </motion.div>
  )
}

export function Gateways() {
  const { creds, toast } = useApp()
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [gateways, setGateways] = useState<Gateway[]>([])
  const [activeGw, setActiveGw] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
  const [pixPayload, setPixPayload] = useState('')
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    if (creds.length > 0 && selectedSlot === null) {
      const active = creds.find(c => c.is_active)
      setSelectedSlot(active?.slot ?? creds[0].slot)
    }
  }, [creds])

  useEffect(() => {
    if (selectedSlot !== null) loadGateways(selectedSlot)
  }, [selectedSlot])

  async function loadGateways(slot: number) {
    setLoading(true)
    try {
      const r = await fetch(`/api/ec/gateways?slot=${slot}`)
      const d = await r.json()
      if (d.ok) { setGateways(d.gateways); setActiveGw(d.activeGw || '') }
    } catch { toast('error', 'Falha ao carregar gateways') }
    finally { setLoading(false) }
  }

  function startEdit(gw: Gateway) {
    setEditing(gw.id)
    const vals: Record<string, string> = {}
    for (const f of gw.fields) {
      vals[f.key] = f.secret ? '' : (gw.redacted[f.key] ?? '')
    }
    setFormValues(vals)
    setPixPayload('')
    setShowQR(false)
  }

  function cancelEdit() { setEditing(null); setFormValues({}); setPixPayload(''); setShowQR(false) }

  async function save(gw: Gateway, setActive: boolean) {
    if (selectedSlot === null) return
    setSaving(true)
    try {
      const r = await fetch('/api/ec/gateways', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slot: selectedSlot, gatewayId: gw.id, fields: formValues, setActive })
      })
      const d = await r.json()
      if (d.ok) {
        toast('success', setActive ? `${gw.label} configurado e ativado` : `${gw.label} salvo`)
        cancelEdit()
        loadGateways(selectedSlot)
      } else {
        toast('error', d.error || 'Falha')
      }
    } catch { toast('error', 'Erro de rede') }
    finally { setSaving(false) }
  }

  async function remove(gw: Gateway) {
    if (!confirm(`Remover configuração de ${gw.label}?`) || selectedSlot === null) return
    const r = await fetch('/api/ec/gateways', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ slot: selectedSlot, gatewayId: gw.id })
    })
    const d = await r.json()
    if (d.ok) { toast('success', 'Removido'); loadGateways(selectedSlot) }
  }

  function generatePixQR() {
    const key = formValues['pix_key'] || ''
    const name = formValues['beneficiary'] || ''
    const city = formValues['city'] || ''
    if (!key) { toast('error', 'Chave PIX obrigatória'); return }
    const payload = buildPixPayload(key, name, city)
    setPixPayload(payload)
    setShowQR(true)
  }

  const selectedCred = creds.find(c => c.slot === selectedSlot)

  return (
    <div>
      <SectionTitle
        icon={<Wallet size={18} />}
        title="Gateways de Pagamento"
        subtitle="Configure a gateway PIX por conta"
        action={
          selectedSlot !== null && (
            <Button variant="outline" size="md" icon={<RefreshCw size={13} />}
              onClick={() => loadGateways(selectedSlot!)} loading={loading}>
              ATUALIZAR
            </Button>
          )
        }
      />

      {/* Slot selector */}
      {creds.length > 1 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <div className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Conta:</div>
          {creds.map(c => (
            <button key={c.slot} onClick={() => setSelectedSlot(c.slot)}
              className={cn('px-3 py-1.5 rounded-lg text-[11px] font-mono font-bold transition-all',
                selectedSlot === c.slot
                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                  : 'bg-white/[0.03] border border-white/[0.06] text-zinc-500 hover:text-zinc-300')}>
              #{c.slot} {c.name}
            </button>
          ))}
        </div>
      )}

      {selectedCred && (
        <div className="flex items-center gap-2 mb-6 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3">
          <Zap size={12} className="text-purple-400" />
          <div className="text-[11px] font-mono text-zinc-400">
            Configurando para: <span className="text-zinc-200 font-bold">#{selectedCred.slot} {selectedCred.name}</span>
          </div>
          {activeGw && (
            <div className="ml-auto text-[10px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-0.5">
              ATIVO: {gateways.find(g => g.id === activeGw)?.label || activeGw}
            </div>
          )}
        </div>
      )}

      {creds.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
          <Wallet size={32} className="text-zinc-600 mx-auto mb-3" />
          <div className="font-bold text-sm text-zinc-500 mb-1">Nenhuma conta cadastrada</div>
          <div className="text-xs font-mono text-zinc-600">Adicione credenciais MP primeiro.</div>
        </div>
      ) : loading ? (
        <div className="py-16 flex items-center justify-center gap-3">
          <RefreshCw size={18} className="animate-spin text-purple-400" />
          <span className="text-xs font-mono text-zinc-500">Carregando…</span>
        </div>
      ) : (
        <div className="space-y-4">
          {gateways.map((gw, i) => (
            <motion.div key={gw.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn('rounded-2xl border overflow-hidden transition-all',
                gw.isActive
                  ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-500/8 to-transparent'
                  : 'border-white/[0.08] bg-white/[0.02]')}>

              {/* Gateway header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0',
                    gw.isActive
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-white/[0.04] border-white/[0.06] text-zinc-500')}>
                    <QrCode size={15} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-zinc-200">{gw.label}</div>
                    <div className={cn('text-[10px] font-mono',
                      gw.isActive ? 'text-emerald-500' : gw.configured ? 'text-zinc-500' : 'text-zinc-700')}>
                      {gw.isActive ? '✓ Ativo — em uso' : gw.configured ? 'Configurado' : 'Não configurado'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {gw.configured && (
                    <button onClick={() => remove(gw)}
                      className="w-8 h-8 rounded-lg bg-red-500/8 border border-red-500/20 text-red-500 hover:bg-red-500/15 flex items-center justify-center transition"
                      title="Remover"><Trash2 size={12} /></button>
                  )}
                  <button onClick={() => editing === gw.id ? cancelEdit() : startEdit(gw)}
                    className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-mono font-bold tracking-wider uppercase transition-all',
                      editing === gw.id
                        ? 'bg-white/[0.06] text-zinc-300'
                        : 'bg-purple-500/15 border border-purple-500/25 text-purple-300 hover:bg-purple-500/25')}>
                    {editing === gw.id ? 'Cancelar' : gw.configured ? 'Editar' : 'Configurar'}
                    <ChevronDown size={11} className={cn('transition-transform', editing === gw.id && 'rotate-180')} />
                  </button>
                </div>
              </div>

              {/* Redacted preview */}
              {gw.configured && editing !== gw.id && (
                <div className="px-5 pb-4 flex flex-wrap gap-x-6 gap-y-1">
                  {gw.fields.map(f => gw.redacted[f.key] && (
                    <div key={f.key} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-600">{f.label}:</span>
                      <span className="text-[10px] font-mono text-zinc-400">{gw.redacted[f.key]}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Edit form */}
              <AnimatePresence>
                {editing === gw.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="border-t border-white/[0.06] overflow-hidden">
                    <div className="p-5 space-y-4">
                      {gw.fields.map(f => (
                        <div key={f.key}>
                          <div className="text-[10px] font-mono font-bold tracking-[0.2em] text-zinc-500 uppercase mb-2">
                            {f.label}
                          </div>
                          <div className="relative">
                            <input
                              type={f.secret && !showSecrets[f.key] ? 'password' : 'text'}
                              value={formValues[f.key] ?? ''}
                              onChange={e => setFormValues(v => ({ ...v, [f.key]: e.target.value }))}
                              placeholder={f.placeholder}
                              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 transition-all"
                            />
                            {f.secret && (
                              <button onClick={() => setShowSecrets(v => ({ ...v, [f.key]: !v[f.key] }))}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition">
                                {showSecrets[f.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* PIX QR section — image + copia e cola */}
                      {gw.id === 'pix_estatico' && (
                        <div>
                          <button
                            onClick={generatePixQR}
                            className="flex items-center gap-2 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition px-3 py-2.5 rounded-xl bg-cyan-500/8 border border-cyan-500/20 hover:bg-cyan-500/12 w-full justify-center font-bold tracking-wider uppercase">
                            <QrCode size={14} /> Gerar QR code + copia e cola
                          </button>

                          <AnimatePresence>
                            {showQR && pixPayload && (
                              <QRImagePanel
                                payload={pixPayload}
                                name={formValues['beneficiary'] || ''}
                                onCopy={() => {
                                  navigator.clipboard.writeText(pixPayload)
                                  toast('success', 'Código copiado!')
                                }}
                              />
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <button onClick={() => save(gw, false)} disabled={saving}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.10] text-zinc-300 hover:bg-white/[0.08] text-[11px] font-mono font-bold tracking-wider uppercase transition-all disabled:opacity-40">
                          <Save size={12} /> Salvar
                        </button>
                        <button onClick={() => save(gw, true)} disabled={saving}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-br from-violet-700 via-purple-500 to-cyan-300 text-white font-black tracking-widest text-sm uppercase shadow-[0_0_20px_rgba(168,85,247,.35)] hover:shadow-[0_0_30px_rgba(168,85,247,.5)] active:scale-95 disabled:opacity-40 transition-all">
                          {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando…</> : <><Check size={13} /> Salvar e Ativar</>}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}

      {!activeGw && creds.length > 0 && !loading && (
        <div className="flex items-center gap-2 mt-5 bg-amber-500/10 border border-amber-500/25 rounded-xl px-4 py-3">
          <AlertCircle size={14} className="text-amber-400 flex-shrink-0" />
          <div className="text-[11px] font-mono text-amber-400">
            Nenhum gateway ativo para esta conta. Configure e ative um para gerar QR codes PIX próprios.
          </div>
        </div>
      )}
    </div>
  )
}
