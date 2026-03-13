'use client'

import { useState, useEffect, useRef } from 'react'
import { Trash2, Users, Plus } from 'lucide-react'

type Client = { id: string; name: string; email: string | null; phone: string | null; createdAt: string }

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
        ctx.fillStyle = `rgba(59,130,246,${d.o})`; ctx.fill()
      })
      for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y, dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 80) { ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.strokeStyle = `rgba(59,130,246,${0.08 * (1 - dist / 80)})`; ctx.lineWidth = 0.5; ctx.stroke() }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
}

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchClients = async () => {
    const res = await fetch('/api/clients')
    setClients(await res.json())
  }

  useEffect(() => { fetchClients() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Erro') }
      setName('')
      fetchClients()
    } catch (err: any) {
      alert('Falha: ' + err.message)
    } finally { setLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Isso pode afetar rastreios vinculados. Continuar?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' })
    fetchClients()
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Clientes</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Gerencie os clientes cadastrados</p>
      </div>

      {/* Glass form card with particles */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className="absolute inset-0 bg-[#0d0d18]">
          <Particles />
        </div>
        <div className="relative z-10 border border-blue-500/20 rounded-2xl bg-blue-950/10 backdrop-blur-sm p-6">
          <p className="text-xs font-medium text-blue-400 uppercase tracking-widest mb-4">Novo Cliente</p>
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs text-zinc-500">Nome do cliente</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Ex: Carlos Alberto ou Armazéns LTDA"
                className="w-full h-10 px-3 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_60px] px-5 py-3 border-b border-white/[0.06]">
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Nome</span>
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">Cadastro</span>
          <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider text-right">Ações</span>
        </div>

        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
              <Users className="w-5 h-5 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500">Nenhum cliente cadastrado</p>
          </div>
        ) : (
          clients.map((client, i) => (
            <div
              key={client.id}
              className={`grid grid-cols-[1fr_120px_60px] items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${i < clients.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-400 uppercase">{client.name.charAt(0)}</span>
                </div>
                <span className="text-sm text-zinc-200 font-medium">{client.name}</span>
              </div>
              <span className="text-xs text-zinc-600 font-mono">
                {new Date(client.createdAt).toLocaleDateString('pt-BR')}
              </span>
              <div className="flex justify-end">
                <button
                  onClick={() => handleDelete(client.id)}
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
