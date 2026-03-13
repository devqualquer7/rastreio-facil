'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Package, Trash2, Search, Plus, ArrowUpRight } from 'lucide-react'

type Client = { id: string; name: string }
type TrackingCode = { id: string; code: string; client: Client | null; createdAt: string; events: any[] }

// Lightweight canvas particles
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const dots: { x: number; y: number; r: number; vx: number; vy: number; o: number }[] = []
    for (let i = 0; i < 40; i++) {
      dots.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.3,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        o: Math.random() * 0.4 + 0.1,
      })
    }

    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      dots.forEach(d => {
        d.x += d.vx
        d.y += d.vy
        if (d.x < 0) d.x = canvas.width
        if (d.x > canvas.width) d.x = 0
        if (d.y < 0) d.y = canvas.height
        if (d.y > canvas.height) d.y = 0
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139,92,246,${d.o})`
        ctx.fill()
      })
      // lines between close dots
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x
          const dy = dots[i].y - dots[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 80) {
            ctx.beginPath()
            ctx.moveTo(dots[i].x, dots[i].y)
            ctx.lineTo(dots[j].x, dots[j].y)
            ctx.strokeStyle = `rgba(139,92,246,${0.08 * (1 - dist / 80)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

export default function AdminTrackingCodes() {
  const [codes, setCodes] = useState<TrackingCode[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [newCode, setNewCode] = useState('')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const fetchData = async () => {
    try {
      const [codesRes, clientsRes] = await Promise.all([
        fetch('/api/tracking-codes'),
        fetch('/api/clients'),
      ])
      if (codesRes.ok) setCodes(await codesRes.json())
      if (clientsRes.ok) setClients(await clientsRes.json())
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('/api/tracking-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newCode, clientId: selectedClientId || null }),
      })
      setNewCode(''); setSelectedClientId('')
      fetchData()
    } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Todos os eventos deste rastreio também serão deletados. Continuar?')) return
    await fetch(`/api/tracking-codes/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const filtered = codes.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.client?.name && c.client.name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Rastreios</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gerencie os códigos de rastreamento</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar código ou cliente..."
            className="h-9 pl-9 pr-4 bg-[#141414] border border-white/[0.06] rounded-lg text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/40 transition-colors w-64"
          />
        </div>
      </div>

      {/* Glass form card with particles */}
      <div className="relative rounded-2xl overflow-hidden">
        {/* Particles layer */}
        <div className="absolute inset-0 bg-[#0d0d14]">
          <Particles />
        </div>
        {/* Glass overlay */}
        <div className="relative z-10 border border-violet-500/20 rounded-2xl bg-violet-950/10 backdrop-blur-sm p-6">
          <p className="text-xs font-medium text-violet-400 uppercase tracking-widest mb-4">Novo Rastreio</p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-zinc-500">Código (deixe vazio para gerar automaticamente)</label>
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase())}
                placeholder="Ex: BR123456789"
                className="w-full h-10 px-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors tracking-widest"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-zinc-500">Cliente (opcional)</label>
              <select
                value={selectedClientId}
                onChange={e => setSelectedClientId(e.target.value)}
                className="w-full h-10 px-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-400 focus:outline-none focus:border-violet-500/50 transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="bg-[#1a1a1a]">Sem cliente</option>
                {clients.map(c => <option key={c.id} value={c.id} className="bg-[#1a1a1a]">{c.name}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Criando...' : 'Criar Rastreio'}
            </button>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_120px_100px] px-5 py-3 border-b border-white/[0.06]">
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Código</span>
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Cliente</span>
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Data</span>
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider text-right">Ações</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
              <Package className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">
              {search ? 'Nenhum resultado encontrado' : 'Nenhum rastreio cadastrado'}
            </p>
            {search && (
              <button onClick={() => setSearch('')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          filtered.map((tc, i) => (
            <div
              key={tc.id}
              className={`grid grid-cols-[1fr_1fr_120px_100px] items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${i < filtered.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-violet-600/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <Package className="w-3 h-3 text-violet-400" />
                </div>
                <span className="text-sm font-mono font-medium text-zinc-200 tracking-wider">{tc.code}</span>
              </div>
              <div>
                {tc.client ? (
                  <span className="text-sm text-zinc-400">{tc.client.name}</span>
                ) : (
                  <span className="text-sm text-zinc-600 italic">Sem cliente</span>
                )}
              </div>
              <span className="text-xs text-zinc-600 font-mono">
                {new Date(tc.createdAt).toLocaleDateString('pt-BR')}
              </span>
              <div className="flex items-center justify-end gap-1.5">
                <Link href={`/admin/tracking-codes/${tc.code}`}>
                  <button className="h-7 w-7 rounded-md bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors text-zinc-500 hover:text-zinc-300">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
                <button
                  onClick={() => handleDelete(tc.id)}
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
