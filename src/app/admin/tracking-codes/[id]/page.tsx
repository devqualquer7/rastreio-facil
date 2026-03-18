'use client'

import { useState, useEffect, use, useRef } from 'react'
import { Trash2, ArrowLeft, Activity, MapPin, Clock, Plus } from 'lucide-react'
import Link from 'next/link'

type TrackingEvent = { id: string; status: string; location: string | null; date: string }

function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    const dots: { x: number; y: number; r: number; vx: number; vy: number; o: number }[] = []
    for (let i = 0; i < 40; i++) dots.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.2 + 0.3, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15, o: Math.random() * 0.4 + 0.1 })
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0) d.x = canvas.width; if (d.x > canvas.width) d.x = 0
        if (d.y < 0) d.y = canvas.height; if (d.y > canvas.height) d.y = 0
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139,92,246,${d.o})`; ctx.fill()
      })
      for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y, dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 80) { ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.strokeStyle = `rgba(139,92,246,${0.08 * (1 - dist / 80)})`; ctx.lineWidth = 0.5; ctx.stroke() }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

const STATUS_PRESETS = [
  { label: 'Coletado',       value: 'Pedido coletado',                                      color: 'sky'     },
  { label: 'Chegou ao CD',   value: 'Chegou ao centro de distribuição',                     color: 'violet'  },
  { label: 'Em Trânsito',    value: 'Objeto em trânsito entre unidades',                    color: 'violet'  },
  { label: 'Em Processamento', value: 'Objeto em processamento na unidade',                 color: 'violet'  },
  { label: 'Saiu p/ Entrega', value: 'Objeto saiu para entrega ao destinatário',            color: 'cyan'    },
  { label: 'Ag. Retirada',   value: 'Aguardando retirada na unidade',                       color: 'amber'   },
  { label: 'Não Atendido',   value: 'Entregador não foi atendido - nova tentativa prevista', color: 'orange'  },
  { label: 'Retido',         value: 'Objeto retido para fiscalização ou regularização',      color: 'red'     },
  { label: 'Entregue',       value: 'Objeto entregue com sucesso',                          color: 'emerald' },
]

const PRESET_COLORS: Record<string, string> = {
  sky:     'bg-sky-500/15 border-sky-500/40 text-sky-300 data-[active=true]:bg-sky-500/30 data-[active=true]:border-sky-400/60',
  violet:  'bg-violet-500/15 border-violet-500/40 text-violet-300 data-[active=true]:bg-violet-500/30 data-[active=true]:border-violet-400/60',
  cyan:    'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 data-[active=true]:bg-cyan-500/30 data-[active=true]:border-cyan-400/60',
  amber:   'bg-amber-500/15 border-amber-500/40 text-amber-300 data-[active=true]:bg-amber-500/30 data-[active=true]:border-amber-400/60',
  orange:  'bg-orange-500/15 border-orange-500/40 text-orange-300 data-[active=true]:bg-orange-500/30 data-[active=true]:border-orange-400/60',
  red:     'bg-red-500/15 border-red-500/40 text-red-300 data-[active=true]:bg-red-500/30 data-[active=true]:border-red-400/60',
  emerald: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 data-[active=true]:bg-emerald-500/30 data-[active=true]:border-emerald-400/60',
}

export default function AdminTrackingEvents({ params }: { params: Promise<{ id: string }> }) {
  const { id: code } = use(params)
  const [details, setDetails] = useState<any>(null)
  const [status, setStatus] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchDetails = async () => {
    // Resolve DB id to tracking code string first
    const tcRes = await fetch(`/api/tracking-codes/${code}`)
    if (!tcRes.ok) return
    const { code: trackingCode } = await tcRes.json()
    const res = await fetch(`/api/track/${trackingCode}`)
    if (res.ok) setDetails(await res.json())
  }

  useEffect(() => {
    fetchDetails()
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    setDate(new Date(now.getTime() - offset).toISOString().slice(0, 16))
  }, [code])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/tracking-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingCodeId: details.id, status, location, date: new Date(date).toISOString() }),
      })
      setStatus(''); setLocation('')
      fetchDetails()
    } finally { setLoading(false) }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Apagar este evento?')) return
    await fetch(`/api/tracking-events/${eventId}`, { method: 'DELETE' })
    fetchDetails()
  }

  if (!details) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/tracking-codes">
          <button className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition-colors text-zinc-400 hover:text-zinc-200">
            <ArrowLeft className="w-4 h-4" />
          </button>
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white font-mono tracking-wider">{details.code}</h1>
            {details.client && (
              <span className="text-xs text-zinc-500 bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded-md">
                {details.client.name}
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-500 mt-0.5">Timeline de eventos</p>
        </div>
      </div>

      {/* Glass form card with particles */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[#0d0d14]">
          <Particles />
        </div>
        <div className="relative z-10 border border-violet-500/20 rounded-2xl bg-violet-950/10 backdrop-blur-sm p-6 space-y-4">
          <p className="text-xs font-medium text-violet-400 uppercase tracking-widest">Registrar Evento</p>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {STATUS_PRESETS.map((opt) => {
              const isActive = status === opt.value
              const colorClass = PRESET_COLORS[opt.color] || PRESET_COLORS.violet
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  data-active={isActive}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${colorClass} ${
                    isActive ? 'ring-1 ring-white/20 scale-105' : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-zinc-500">Status *</label>
              <input
                value={status}
                onChange={e => setStatus(e.target.value)}
                required
                placeholder="Ex: Objeto em trânsito"
                className="w-full h-10 px-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-zinc-500">Localização</label>
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Ex: São Paulo, SP"
                className="w-full h-10 px-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-zinc-500">Data e hora *</label>
              <input
                type="datetime-local"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="w-full h-10 px-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Salvando...' : 'Registrar'}
            </button>
          </form>
        </div>
      </div>

      {/* Events table */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[140px_1fr_1fr_60px] px-5 py-3 border-b border-white/[0.06]">
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Data / Hora</span>
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Status</span>
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Localização</span>
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider text-right">Ação</span>
        </div>

        {!details.events || details.events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
              <Activity className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">Nenhum evento registrado</p>
          </div>
        ) : (
          details.events.map((ev: TrackingEvent, i: number) => (
            <div
              key={ev.id}
              className={`grid grid-cols-[140px_1fr_1fr_60px] items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${i < details.events.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
            >
              <div className="flex items-center gap-1.5 text-xs text-zinc-600 font-mono">
                <Clock className="w-3 h-3 flex-shrink-0" />
                {new Date(ev.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                {ev.status}
              </span>
              <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                {ev.location && <MapPin className="w-3 h-3 text-zinc-600 flex-shrink-0" />}
                {ev.location || <span className="text-zinc-700">—</span>}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="h-7 w-7 rounded-md hover:bg-red-500/10 flex items-center justify-center transition-colors text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
