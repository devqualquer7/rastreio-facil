'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Search, Truck, MapPin, CheckCircle2, AlertCircle,
  Clock, ChevronDown, Phone, ArrowRight, ShieldCheck,
  Zap, HeadphonesIcon, PackageCheck, PackageOpen,
  ArrowUpRight, Star, Package
} from 'lucide-react'

// ─── Canvas Particle Effect ──────────────────────────────────────────────────
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const resize = () => { canvas.width = window.innerWidth; canvas.height = canvas.parentElement?.offsetHeight || 600 }
    resize()
    window.addEventListener('resize', resize)
    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = []
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvas.width, y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5, o: Math.random() * 0.5 + 0.1,
      })
    }
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99,102,241,${p.o})`; ctx.fill()
      })
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5; ctx.stroke()
          }
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

// ─── Types ───────────────────────────────────────────────────────────────────
type TrackingEvent = { id: string; status: string; location: string | null; date: string }
type TrackingCode  = { code: string; client?: { name: string } | null; events: TrackingEvent[] }
type StepKey = 'coletado' | 'transito' | 'saiu' | 'entregue'

// ─── Status logic ────────────────────────────────────────────────────────────
function getStepFromStatus(status: string): StepKey {
  const s = status.toLowerCase()
  // Entregue (inclui devolução "entregue à origem")
  if (s.includes('entregue') && !s.includes('tentativa') && !s.includes('frustrad')) return 'entregue'
  // Etapa de entrega: saiu, em rota, tentativa, não atendido, devolvido, frustrado
  if (
    s.includes('saiu') || s.includes('rota de entrega') || s.includes('em rota') ||
    s.includes('tentativa') || s.includes('não foi atendido') || s.includes('nao foi atendido') ||
    s.includes('devolvid') || s.includes('frustrad') || s.includes('aguardando retirada')
  ) return 'saiu'
  // Em trânsito: centros de distribuição, triagem, encaminhado, retido (parado num CD)
  if (
    s.includes('trânsito') || s.includes('transito') || s.includes('transferência') ||
    s.includes('transferencia') || s.includes('triagem') || s.includes('chegou') ||
    s.includes('encaminhado') || s.includes('processamento') || s.includes('distribuição') ||
    s.includes('distribuicao') || s.includes('retido') || s.includes('fiscaliz')
  ) return 'transito'
  return 'coletado'
}

function getStatusConfig(status: string) {
  const s = status.toLowerCase()
  if (s.includes('entregue') && !s.includes('tentativa') && !s.includes('frustrad'))
    return { label: 'Entregue', dot: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', glow: 'shadow-emerald-500/20' }
  if (s.includes('tentativa') || s.includes('não foi atendido') || s.includes('nao foi atendido'))
    return { label: 'Tentativa de Entrega', dot: 'bg-orange-400', badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30', glow: 'shadow-orange-500/20' }
  if (s.includes('retido') || s.includes('fiscalização') || s.includes('devolvid') || s.includes('frustrad'))
    return { label: 'Retido / Devolvido', dot: 'bg-red-400', badge: 'bg-red-500/15 text-red-300 border-red-500/30', glow: 'shadow-red-500/20' }
  if (s.includes('saiu') || s.includes('rota de entrega') || s.includes('em rota'))
    return { label: 'Saiu para Entrega', dot: 'bg-cyan-400', badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', glow: 'shadow-cyan-500/20' }
  if (s.includes('trânsito') || s.includes('transito') || s.includes('transferência') || s.includes('triagem') || s.includes('chegou') || s.includes('processamento'))
    return { label: 'Em Trânsito', dot: 'bg-violet-400', badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30', glow: 'shadow-violet-500/20' }
  return { label: 'Coletado', dot: 'bg-sky-400', badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30', glow: 'shadow-sky-500/20' }
}

function getEventDot(status: string, isFirst: boolean) {
  const s = status.toLowerCase()
  if (s.includes('entregue') && !s.includes('tentativa')) return { bg: 'bg-emerald-500', glow: '0 0 12px rgba(52,211,153,0.6)', Icon: CheckCircle2 }
  if (s.includes('tentativa') || s.includes('não foi atendido') || s.includes('nao foi atendido')) return { bg: 'bg-orange-500', glow: '0 0 12px rgba(249,115,22,0.6)', Icon: AlertCircle }
  if (s.includes('retido') || s.includes('devolvid') || s.includes('frustrad')) return { bg: 'bg-red-500', glow: '0 0 12px rgba(239,68,68,0.6)', Icon: AlertCircle }
  if (s.includes('saiu') || s.includes('em rota')) return { bg: 'bg-cyan-500', glow: '0 0 12px rgba(6,182,212,0.6)', Icon: MapPin }
  if (s.includes('trânsito') || s.includes('transito') || s.includes('transferência') || s.includes('chegou') || s.includes('processamento'))
    return { bg: isFirst ? 'bg-violet-500' : 'bg-zinc-700', glow: isFirst ? '0 0 12px rgba(139,92,246,0.6)' : 'none', Icon: Truck }
  return { bg: isFirst ? 'bg-sky-600' : 'bg-zinc-700', glow: isFirst ? '0 0 12px rgba(14,165,233,0.5)' : 'none', Icon: PackageOpen }
}

const STEP_ORDER: StepKey[] = ['coletado', 'transito', 'saiu', 'entregue']
const STEPS = [
  { key: 'coletado' as StepKey, label: 'Coletado',        Icon: PackageCheck, color: 'sky'     },
  { key: 'transito' as StepKey, label: 'Em Trânsito',     Icon: Truck,        color: 'violet'  },
  { key: 'saiu'     as StepKey, label: 'Saiu p/ Entrega', Icon: MapPin,       color: 'cyan'    },
  { key: 'entregue' as StepKey, label: 'Entregue',        Icon: CheckCircle2, color: 'emerald' },
]

const STEP_COLORS = {
  sky:     { active: 'bg-sky-500 shadow-sky-500/40',     done: 'bg-emerald-500 shadow-emerald-500/40', text: 'text-sky-400',     line: 'bg-sky-500/60'     },
  violet:  { active: 'bg-violet-500 shadow-violet-500/40', done: 'bg-emerald-500 shadow-emerald-500/40', text: 'text-violet-400', line: 'bg-violet-500/60'  },
  cyan:    { active: 'bg-cyan-500 shadow-cyan-500/40',    done: 'bg-emerald-500 shadow-emerald-500/40', text: 'text-cyan-400',    line: 'bg-cyan-500/60'    },
  emerald: { active: 'bg-emerald-500 shadow-emerald-500/40', done: 'bg-emerald-500 shadow-emerald-500/40', text: 'text-emerald-400', line: 'bg-emerald-500/60' },
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'Onde encontro o código de rastreio?', a: 'O código é enviado automaticamente para o seu e-mail após a confirmação da compra. Você também encontra na seção "Minhas Compras" da plataforma, dentro dos detalhes do pedido. O formato padrão é: duas letras + números + "BR".' },
  { q: 'Quanto tempo leva para o status ser atualizado?', a: 'As atualizações ocorrem em até 24 horas após cada movimentação. Em feriados ou fins de semana pode haver atraso de 1 a 2 dias úteis. Caso o status não mude por mais de 5 dias úteis, entre em contato conosco.' },
  { q: 'O que significa "Em Trânsito"?', a: 'Significa que sua encomenda está sendo transportada entre os centros de distribuição. É completamente normal — o pacote está a caminho. A duração varia conforme a distância entre a origem e o destino.' },
  { q: 'O que fazer quando aparece "Tentativa de Entrega"?', a: 'O entregador foi ao endereço mas não conseguiu entregar (ninguém em casa, portão fechado etc.). Normalmente uma nova tentativa é feita no próximo dia útil. Certifique-se de que alguém esteja disponível.' },
  { q: 'O que significa "Retido"?', a: 'Significa que sua encomenda foi retida em algum ponto do percurso — pode ser por fiscalização dos Correios, aguardando documentação ou por alguma irregularidade. Entre em contato com nossa equipe para mais detalhes.' },
  { q: 'Meu rastreio ficou parado há dias. O que devo fazer?', a: 'É comum o status ficar parado por até 5 dias úteis em períodos de alta demanda. Se o prazo estimado já venceu, entre em contato pelo (11) 2543-4155 para abrirmos uma investigação.' },
  { q: 'O código não foi encontrado. O que aconteceu?', a: 'Pode ser que a encomenda ainda não tenha sido postada ou o código tenha sido digitado incorretamente. Confira se está completo e sem espaços. Se persistir, entre em contato com o vendedor.' },
  { q: 'Qual é o prazo médio de entrega?', a: 'Envios expressos: 1 a 3 dias úteis. Envios econômicos: 5 a 15 dias úteis. O prazo estimado é informado no momento da compra e pode ser verificado no status de rastreio.' },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function Home() {
  const [code,    setCode]    = useState('')
  const [result,  setResult]  = useState<TrackingCode | null>(null)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-search from ?code= URL param
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const urlCode = p.get('code')
    if (!urlCode) return
    const trimmed = urlCode.trim().toUpperCase()
    setCode(trimmed)
    setLoading(true); setError(''); setResult(null)
    fetch('/api/track/' + trimmed)
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => { setResult(data); setTimeout(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200) })
      .catch(() => setError('Código não encontrado.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return
    setLoading(true); setError(''); setResult(null)
    try {
      const res = await fetch(`/api/track/${trimmed}`)
      if (res.ok) {
        setResult(await res.json())
        setTimeout(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      } else {
        setError('Código de rastreio não encontrado. Verifique o código e tente novamente.')
      }
    } catch { setError('Erro ao conectar ao servidor. Tente novamente em instantes.') }
    finally { setLoading(false) }
  }

  const realEvs = result?.events.filter((e: any) => !e.status.toLowerCase().startsWith('previs')) ?? []
  const previsEv = result?.events.find((e: any) => e.status.toLowerCase().startsWith('previs'))
  const deliveryDate = previsEv ? previsEv.status.replace(/^Previs[a\u00e3]o de entrega:\s*/i, '') : null
  const currentStep = realEvs.length ? getStepFromStatus(realEvs[0].status) : 'coletado'
  const currentIdx  = STEP_ORDER.indexOf(currentStep)

  return (
    <div className="min-h-screen font-sans" style={{ background: '#06060f', color: '#e2e8f0' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <header style={{ background: 'rgba(6,6,15,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(99,102,241,0.12)' }}
        className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(79,70,229,0.4)' }}>
              <MapPin className="w-4.5 h-4.5 text-white w-5 h-5" />
            </div>
            <span className="text-lg font-extrabold text-white">
              Rastreio<span style={{ color: '#818cf8' }}>Fácil</span>
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {[['#como-funciona','Como Funciona'],['#sobre','Sobre'],['#faq','Dúvidas']].map(([href,label]) => (
              <a key={href} href={href} className="transition-colors" style={{ color: '#94a3b8' }}
                onMouseEnter={e => (e.currentTarget.style.color='#a5b4fc')}
                onMouseLeave={e => (e.currentTarget.style.color='#94a3b8')}>{label}</a>
            ))}
            <a href="#contato" className="px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 16px rgba(79,70,229,0.35)' }}>
              Contato
            </a>
          </nav>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: '88vh', display: 'flex', alignItems: 'center' }}>
        {/* Grid BG */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.06) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }} />
        {/* Particle canvas */}
        <ParticleField />
        {/* Radial glows */}
        <div className="absolute pointer-events-none" style={{ top: '20%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: 'radial-gradient(ellipse, rgba(79,70,229,0.18) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div className="absolute pointer-events-none" style={{ bottom: 0, left: '10%', width: 400, height: 400, background: 'radial-gradient(ellipse, rgba(139,92,246,0.08) 0%, transparent 70%)', borderRadius: '50%' }} />

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center w-full py-24">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full text-xs font-semibold tracking-wide"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Sistema de Rastreamento em Tempo Real
          </div>

          {/* Headline */}
          <h1 className="font-black leading-none tracking-tight mb-5" style={{ fontSize: 'clamp(2.5rem,6vw,4.5rem)' }}>
            <span className="text-white">Acompanhe sua</span>
            <br />
            <span style={{ background: 'linear-gradient(135deg,#818cf8 0%,#c084fc 50%,#38bdf8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              encomenda
            </span>
            <span className="text-white"> passo</span>
            <br />
            <span className="text-white">a </span>
            <span style={{ background: 'linear-gradient(135deg,#34d399,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              passo
            </span>
          </h1>

          <p className="text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed" style={{ color: '#94a3b8' }}>
            Consulte o status da sua encomenda de forma rápida, clara e sem complicações.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12">
            <div className="p-1.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 40px rgba(79,70,229,0.15)' }}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: '#6366f1' }} />
                  <input
                    ref={inputRef}
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="Ex.: AA123456789BR"
                    maxLength={20}
                    className="w-full pl-11 pr-4 py-4 rounded-xl text-base font-semibold tracking-widest placeholder:tracking-normal placeholder:font-normal focus:outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)', color: '#f1f5f9',
                      caretColor: '#818cf8',
                    }}
                  />
                </div>
                <button type="submit" disabled={loading || !code.trim()}
                  className="flex items-center gap-2 px-6 py-4 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-40 whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 24px rgba(79,70,229,0.5)' }}>
                  {loading
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Buscando...</>
                    : <><Search className="w-4 h-4" /> Rastrear</>}
                </button>
              </div>
            </div>
          </form>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-10">
            {[['99%','Precisão','text-violet-400'],['24h','Disponível','text-cyan-400'],['Grátis','Sem cadastro','text-emerald-400']].map(([n,l,c]) => (
              <div key={l} className="text-center">
                <div className={`text-2xl font-black ${c}`}>{n}</div>
                <div className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#64748b' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESULTADO ──────────────────────────────────────────── */}
      <div id="resultado" className="max-w-3xl mx-auto px-4 pb-16">
        {error && (
          <div className="rounded-2xl px-6 py-4 flex items-center gap-3 text-sm font-semibold"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="rounded-3xl overflow-hidden" style={{ background: '#0d0d18', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 0 60px rgba(79,70,229,0.1)' }}>
            {/* Header */}
            <div className="p-6 md:p-8" style={{ background: 'linear-gradient(135deg,rgba(79,70,229,0.12),rgba(124,58,237,0.08))', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#6366f1' }}>Código de Rastreio</p>
                  <p className="text-2xl md:text-3xl font-black tracking-widest font-mono text-white">{result.code}</p>
                  {deliveryDate && <p className="text-sm mt-1" style={{ color: '#64748b' }}>Previsão de entrega: <span style={{ color: '#94a3b8' }}>{deliveryDate}</span></p>}
                </div>
                {result.events.length > 0 && (() => {
                  const cfg = getStatusConfig(result.events[0].status)
                  return (
                    <div className={`self-start flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${cfg.badge}`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} /> {cfg.label}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Progress Steps */}
            {result.events.length > 0 && (
              <div className="px-6 md:px-8 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#475569' }}>Progresso da Entrega</p>
                <div className="flex items-start">
                  {STEPS.map((step, i) => {
                    const isCompleted = i < currentIdx
                    const isActive    = i === currentIdx
                    const isPending   = i > currentIdx
                    const isLast      = i === STEPS.length - 1
                    const latestS    = result.events[0].status.toLowerCase()
                    // Alerta laranja: tentativa de entrega ou entregador não atendido (passo "saiu")
                    const isTentativa = (latestS.includes('tentativa') || latestS.includes('não foi atendido') || latestS.includes('nao foi atendido')) && step.key === 'saiu'
                    // Alerta vermelho: retido ou devolvido (passo "transito" ou "saiu")
                    const isRetido    = (latestS.includes('retido') || latestS.includes('fiscaliz') || latestS.includes('devolvid') || latestS.includes('frustrad')) && (step.key === 'transito' || step.key === 'saiu')
                    const colors  = STEP_COLORS[step.color as keyof typeof STEP_COLORS]
                    // Cor do círculo: especial para tentativa (laranja), retido (vermelho), normal
                    const circleStyle = isCompleted
                      ? { background: '#10b981', boxShadow: '0 0 16px rgba(52,211,153,0.4)' }
                      : isActive && isRetido
                      ? { background: '#ef4444', boxShadow: '0 0 16px rgba(239,68,68,0.5)' }
                      : isActive && isTentativa
                      ? { background: '#f97316', boxShadow: '0 0 16px rgba(249,115,22,0.5)' }
                      : isActive
                      ? { boxShadow: `0 0 16px rgba(99,102,241,0.5)` }
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }

                    const circleClass = isCompleted
                      ? 'bg-emerald-500'
                      : isActive && !isTentativa && !isRetido
                      ? colors.active
                      : ''

                    const labelColor = isCompleted
                      ? 'text-emerald-400'
                      : isActive && isRetido    ? 'text-red-400'
                      : isActive && isTentativa ? 'text-orange-400'
                      : isActive                ? colors.text
                      : 'text-slate-600'

                    const stepLabel = isRetido ? 'Retido' : isTentativa ? 'Tentativa' : step.label

                    return (
                      <div key={step.key} className="flex flex-1 flex-col items-start">
                        <div className="flex w-full items-center">
                          <div
                            className={`relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg ${circleClass}`}
                            style={circleStyle}
                          >
                            {isCompleted
                              ? <CheckCircle2 className="w-5 h-5 text-white" />
                              : (isTentativa || isRetido)
                              ? <AlertCircle className="w-5 h-5 text-white" />
                              : <step.Icon className={`w-5 h-5 ${isPending ? 'text-slate-600' : 'text-white'}`} />
                            }
                            {/* Pulsar apenas no ativo normal (não em estados de erro) */}
                            {isActive && !isTentativa && !isRetido && (
                              <span className={`absolute inset-0 rounded-full ${colors.active} animate-ping opacity-30`} />
                            )}
                            {/* Pulsar laranja para tentativa */}
                            {isActive && isTentativa && (
                              <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-30" />
                            )}
                            {/* Pulsar vermelho para retido */}
                            {isActive && isRetido && (
                              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
                            )}
                          </div>
                          {!isLast && (
                            <div className={`flex-1 h-px mx-1 transition-all ${isCompleted ? colors.line : ''}`}
                              style={!isCompleted ? { background: 'rgba(255,255,255,0.08)' } : undefined} />
                          )}
                        </div>
                        <span className={`mt-2 text-[11px] font-semibold pr-2 leading-tight ${labelColor}`}>
                          {stepLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="px-6 md:px-8 py-6">
              <p className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: '#475569' }}>Histórico de Eventos</p>

              {result.events.length === 0 ? (
                <div className="text-center py-12" style={{ color: '#475569' }}>
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">Nenhum evento registrado ainda.</p>
                </div>
              ) : (
                <div className="relative space-y-3">
                  <div className="absolute left-5 top-5 bottom-5 w-px" style={{ background: 'linear-gradient(to bottom, rgba(99,102,241,0.3), rgba(99,102,241,0.05))' }} />
                  {result.events.filter((e: any) => !e.status.toLowerCase().startsWith('previs')).map((ev, i) => {
                    const { Icon, bg, glow } = getEventDot(ev.status, i === 0)
                    const cfg     = getStatusConfig(ev.status)
                    const dateObj = new Date(ev.date)
                    const dtStr   = dateObj.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric' })
                    const tmStr   = dateObj.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })

                    return (
                      <div key={ev.id} className="flex gap-4 relative">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${bg} flex items-center justify-center z-10 ring-4 ring-black/50`}
                          style={{ boxShadow: glow }}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 rounded-2xl p-4 transition-all"
                          style={i === 0
                            ? { background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(99,102,241,0.2)' }
                            : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                            <span className="text-sm font-bold" style={{ color: i === 0 ? '#f1f5f9' : '#94a3b8' }}>{ev.status}</span>
                            <div className={`inline-flex self-start items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${cfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} /> {cfg.label}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs" style={{ color: '#64748b' }}>
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {dtStr} às {tmStr}</span>
                            {ev.location && (
                              <span className="flex items-center gap-1 font-medium" style={{ color: '#818cf8' }}>
                                <MapPin className="w-3.5 h-3.5" /> {ev.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── SOBRE ──────────────────────────────────────────────── */}
      <section id="sobre" className="py-20 px-4 relative overflow-hidden" style={{ background: '#09090f' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(79,70,229,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(124,58,237,0.04) 0%, transparent 50%)'
        }} />
        <div className="max-w-5xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5"
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8' }}>
                Sobre o RastreioFácil
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-5">
                Rastreamento simples para suas <span style={{ color: '#818cf8' }}>compras online</span>
              </h2>
              <p className="text-base leading-relaxed mb-4" style={{ color: '#64748b' }}>
                O <strong className="text-slate-300">RastreioFácil</strong> foi criado para facilitar o acompanhamento das encomendas
                enviadas pelo serviço de logística integrado ao Mercado Envios. Chega de atualizações confusas.
              </p>
              <p className="text-base leading-relaxed mb-8" style={{ color: '#64748b' }}>
                Aqui você vê o caminho completo da sua encomenda — da coleta até a entrega —
                com informações claras, datas e localização em cada etapa.
              </p>
              <a href="#contato" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white font-semibold text-sm transition-all"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(79,70,229,0.3)' }}>
                Fale Conosco <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { Icon: Zap,            title: 'Rápido e Preciso',  desc: 'Resultado imediato sem esperar',       gradient: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.2)',  icon: '#facc15' },
                { Icon: ShieldCheck,    title: '100% Gratuito',     desc: 'Sem cadastro e sem cobrança',          gradient: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)', icon: '#34d399' },
                { Icon: Package,        title: 'Status Detalhado',  desc: 'Cada etapa explicada com ícones',      gradient: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.2)', icon: '#818cf8' },
                { Icon: HeadphonesIcon, title: 'Suporte Humano',    desc: 'Atendimento disponível por telefone',  gradient: 'rgba(192,132,252,0.1)',border: 'rgba(192,132,252,0.2)',icon: '#c084fc' },
              ].map(({ Icon, title, desc, gradient, border, icon }) => (
                <div key={title} className="rounded-2xl p-5 transition-all hover:-translate-y-1"
                  style={{ background: gradient, border: `1px solid ${border}`, backdropFilter: 'blur(8px)' }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${gradient}`, border: `1px solid ${border}` }}>
                    <Icon className="w-4.5 h-4.5 w-5 h-5" style={{ color: icon }} />
                  </div>
                  <p className="font-bold text-sm mb-1 text-white">{title}</p>
                  <p className="text-xs leading-snug" style={{ color: '#64748b' }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ──────────────────────────────────────── */}
      <section id="como-funciona" className="py-20 px-4" style={{ background: '#06060f' }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
            Como Funciona
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Rastreie em 3 passos simples</h2>
          <p className="text-base max-w-md mx-auto mb-14" style={{ color: '#64748b' }}>Acompanhar sua encomenda é rápido e sem complicações.</p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { num: '01', Icon: Search,       title: 'Informe o Código',     desc: 'Digite o código de rastreio no campo de busca. Você encontra esse código no e-mail de confirmação ou em "Minhas Compras".', grad: 'rgba(79,70,229,0.15)', border: 'rgba(99,102,241,0.25)', glow: 'rgba(79,70,229,0.2)' },
              { num: '02', Icon: Package,      title: 'Consulte o Status',    desc: 'Veja todas as atualizações em tempo real, com local, data, horário e ícones para cada etapa do percurso.', grad: 'rgba(124,58,237,0.12)', border: 'rgba(139,92,246,0.25)', glow: 'rgba(124,58,237,0.2)' },
              { num: '03', Icon: CheckCircle2, title: 'Receba com Segurança', desc: 'Acompanhe a jornada completa e saiba quando chegará. Se tiver dúvidas, nossa equipe está disponível por telefone.', grad: 'rgba(20,184,166,0.1)', border: 'rgba(52,211,153,0.2)', glow: 'rgba(52,211,153,0.15)' },
            ].map(({ num, Icon, title, desc, grad, border, glow }) => (
              <div key={num} className="rounded-3xl p-7 text-left transition-all hover:-translate-y-1"
                style={{ background: grad, border: `1px solid ${border}`, boxShadow: `0 0 30px ${glow}` }}>
                <div className="text-5xl font-black mb-5 leading-none"
                  style={{ color: 'rgba(255,255,255,0.06)', letterSpacing: '-0.05em' }}>{num}</div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${grad}`, border: `1px solid ${border}` }}>
                  <Icon className="w-5 h-5" style={{ color: '#a5b4fc' }} />
                </div>
                <h3 className="text-base font-extrabold text-white mb-2">{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATUS LEGEND ──────────────────────────────────────── */}
      <section className="py-16 px-4" style={{ background: '#0a0a14' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-black text-white mb-2">Entenda os status da sua encomenda</h2>
          <p className="text-sm mb-10" style={{ color: '#64748b' }}>Cada ícone representa uma etapa do percurso do seu pedido</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            {[
              { Icon: PackageCheck, bg: '#0ea5e9', glow: 'rgba(14,165,233,0.4)', title: 'Coletado',         desc: 'Encomenda retirada e registrada no sistema',       badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
              { Icon: Truck,        bg: '#8b5cf6', glow: 'rgba(139,92,246,0.4)', title: 'Em Trânsito',      desc: 'A caminho entre os centros de distribuição',       badge: 'bg-violet-500/15 text-violet-300 border-violet-500/30' },
              { Icon: MapPin,       bg: '#06b6d4', glow: 'rgba(6,182,212,0.4)',  title: 'Saiu p/ Entrega',  desc: 'Com o entregador a caminho do seu endereço',       badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
              { Icon: CheckCircle2, bg: '#10b981', glow: 'rgba(16,185,129,0.4)', title: 'Entregue',         desc: 'Entrega concluída com sucesso!',                   badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
              { Icon: AlertCircle,  bg: '#f97316', glow: 'rgba(249,115,22,0.4)', title: 'Tentativa de Entrega', desc: 'Entregador foi mas não conseguiu entregar',     badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
              { Icon: AlertCircle,  bg: '#ef4444', glow: 'rgba(239,68,68,0.4)',  title: 'Retido / Devolvido', desc: 'Encomenda retida, fiscalizada ou em devolução', badge: 'bg-red-500/15 text-red-300 border-red-500/30' },
            ].map(({ Icon, bg, glow, title, desc, badge }) => (
              <div key={title} className="rounded-2xl p-5 text-center transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: bg, boxShadow: `0 0 16px ${glow}` }}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-white font-bold text-sm mb-1">{title}</p>
                <p className="text-xs leading-snug" style={{ color: '#64748b' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-4" style={{ background: '#06060f' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
              Perguntas Frequentes
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Dúvidas que mais recebemos</h2>
            <p className="text-base" style={{ color: '#64748b' }}>Respostas rápidas para as perguntas mais comuns.</p>
          </div>

          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: openFaq === i ? 'rgba(79,70,229,0.08)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${openFaq === i ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left">
                  <span className="text-sm font-semibold leading-snug" style={{ color: openFaq === i ? '#c7d2fe' : '#94a3b8' }}>{item.q}</span>
                  <ChevronDown className="w-4 h-4 flex-shrink-0 transition-transform duration-300"
                    style={{ color: '#6366f1', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: openFaq === i ? '300px' : '0px' }}>
                  <p className="px-5 pb-5 text-sm leading-relaxed" style={{ color: '#64748b', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center text-sm" style={{ color: '#64748b' }}>
            Não encontrou sua dúvida?{' '}
            <a href="#contato" className="font-semibold hover:underline" style={{ color: '#818cf8' }}>Fale com a gente</a>
          </div>
        </div>
      </section>

      {/* ── CONTATO ────────────────────────────────────────────── */}
      <section id="contato" className="py-20 px-4 relative overflow-hidden" style={{ background: '#09090f' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(ellipse at 50% 100%, rgba(79,70,229,0.12) 0%, transparent 60%)'
        }} />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-5"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8' }}>
            Atendimento
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Precisa de ajuda?</h2>
          <p className="text-base max-w-lg mx-auto mb-12" style={{ color: '#64748b' }}>
            Nossa equipe está pronta para resolver qualquer dúvida sobre o rastreamento da sua encomenda.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="tel:+551125434155"
              className="flex items-center gap-5 p-6 rounded-2xl transition-all hover:-translate-y-1 group"
              style={{ background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(99,102,241,0.25)', boxShadow: '0 0 30px rgba(79,70,229,0.1)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(79,70,229,0.5)' }}>
                <Phone className="w-7 h-7 text-white" />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#6366f1' }}>Telefone de Atendimento</p>
                <p className="text-2xl font-black text-white group-hover:text-violet-300 transition-colors">(11) 2543-4155</p>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Segunda a Sexta, horário comercial</p>
              </div>
              <ArrowUpRight className="w-5 h-5 ml-2 opacity-40 group-hover:opacity-80 transition-opacity" style={{ color: '#818cf8' }} />
            </a>

            <div className="flex items-center gap-5 p-6 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}>
                <Star className="w-7 h-7" style={{ color: '#fbbf24' }} />
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#64748b' }}>Atendimento Especializado</p>
                <p className="text-base font-bold text-white">Suporte prioritário</p>
                <p className="text-xs mt-0.5" style={{ color: '#475569' }}>Para reclamações e investigações</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="py-10 px-4" style={{ background: '#03030a', borderTop: '1px solid rgba(99,102,241,0.08)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="font-extrabold text-white">Rastreio<span style={{ color: '#818cf8' }}>Fácil</span></span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm" style={{ color: '#475569' }}>
              {[['#','Início'],['#sobre','Sobre'],['#como-funciona','Como Funciona'],['#faq','Dúvidas'],['#contato','Contato']].map(([href,label]) => (
                <a key={href} href={href} className="transition-colors hover:text-slate-300">{label}</a>
              ))}
            </nav>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#334155' }}>
            <p>© {new Date().getFullYear()} RastreioFácil · Todos os direitos reservados</p>
            <a href="tel:+551125434155" className="flex items-center gap-1.5 hover:text-slate-400 transition-colors">
              <Phone className="w-3.5 h-3.5" /> (11) 2543-4155
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}
