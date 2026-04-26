'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Smartphone, Wifi, WifiOff, Sparkles, Copy, Check, Share2,
  RefreshCw, AlertCircle, ChevronDown, ArrowLeft, X,
  Clock, CheckCircle2, XCircle, DollarSign,
  CreditCard, Wallet, Loader2, Search, Banknote, Receipt
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────

type Cred = {
  slot: number
  name: string
  banned: boolean
  health_status: string | null
}

type GeneratedLink = {
  link: string
  reference: string
  preferenceId: string | null
  expiresAt: string | null
  slot: number
  slotName: string
}

type Sale = {
  id: number
  external_reference: string
  slot: number
  slot_name: string
  title: string
  amount: number
  net_amount: number | null
  installments: number | null
  status: string
  status_detail: string | null
  payment_type_id: string | null
  payment_method_id: string | null
  link: string | null
  expires_at: string | null
  approved_at: string | null
  created_at: string
}

type Tab = 'gerar' | 'vendas' | 'extrato'
type Status = 'idle' | 'connecting' | 'online' | 'offline'

const BRIDGE_ID_KEY = 'mobile_bridge_id'

// ─── Helpers ────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtRel(at: string | number) {
  const t = typeof at === 'number' ? at : new Date(at).getTime()
  const d = Date.now() - t
  if (d < 60_000)    return 'agora'
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}min`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`
  return new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const MANAGER_PREFIXES = ['R7', 'KEVEN', 'GUI', 'PABLO']
function getManager(name: string): string {
  const upper = (name || '').toUpperCase()
  for (const p of MANAGER_PREFIXES) {
    if (upper.startsWith(p + ' -') || upper.startsWith(p + '-')) return p
  }
  return 'OUTROS'
}

const STATUS_INFO: Record<string, { label: string; color: string; icon: any }> = {
  approved:     { label: 'Aprovado',  color: '#00e396', icon: CheckCircle2 },
  pending:      { label: 'Pendente',  color: '#ffc83d', icon: Clock },
  rejected:     { label: 'Recusado',  color: '#ff2b4a', icon: XCircle },
  cancelled:    { label: 'Cancelado', color: '#9a9ab5', icon: XCircle },
  in_process:   { label: 'Processando', color: '#ffc83d', icon: Clock },
  in_mediation: { label: 'Em mediação', color: '#ff8c2c', icon: AlertCircle },
  charged_back: { label: 'Chargeback', color: '#ff2b4a', icon: AlertCircle },
  refunded:     { label: 'Reembolsado', color: '#9a9ab5', icon: XCircle },
  gerado:       { label: 'Gerado',    color: '#3b82f6', icon: Clock },
  expirado:     { label: 'Expirado',  color: '#9a9ab5', icon: XCircle },
}

// ─── Page ───────────────────────────────────────────────

export default function MobilePage() {
  const [bridgeId, setBridgeId] = useState<string>('')
  const [status, setStatus]     = useState<Status>('idle')
  const [creds, setCreds]       = useState<Cred[]>([])
  const [sales, setSales]       = useState<Sale[]>([])
  const [tab, setTab]           = useState<Tab>('gerar')
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' | 'info' } | null>(null)
  const [showPair, setShowPair] = useState(false)

  // Load saved bridge ID on mount
  useEffect(() => {
    const saved = (typeof window !== 'undefined') ? localStorage.getItem(BRIDGE_ID_KEY) : null
    if (saved) {
      setBridgeId(saved)
    } else {
      setShowPair(true)
    }
  }, [])

  // Show toast
  const showToast = useCallback((msg: string, type: 'ok' | 'err' | 'info' = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }, [])

  // Send command to bridge
  async function sendCommand(command: string, args?: any, timeoutMs = 15000): Promise<any> {
    if (!bridgeId) throw new Error('Pareie o PC primeiro.')

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs + 5000)
    try {
      const res = await fetch('/api/admin/mobile/cmd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bridgeId, command, args }),
        signal: ctrl.signal,
        cache: 'no-store',
      })
      clearTimeout(timer)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      return data.data
    } catch (e: any) {
      clearTimeout(timer)
      if (e.name === 'AbortError') throw new Error('Tempo esgotado.')
      throw e
    }
  }

  // Ping check
  async function checkConnection() {
    if (!bridgeId) {
      setStatus('idle')
      return
    }
    setStatus('connecting')
    try {
      await sendCommand('ping', undefined, 8_000)
      setStatus('online')
    } catch (e: any) {
      setStatus('offline')
    }
  }

  // Load creds
  async function loadCreds() {
    try {
      const data = await sendCommand('mp:list-creds')
      setCreds(data || [])
    } catch (e: any) {
      showToast('Não foi possível carregar contas: ' + e.message, 'err')
    }
  }

  // Load sales
  async function loadSales() {
    try {
      const data = await sendCommand('mp:list-sales', { limit: 30 })
      setSales(data || [])
    } catch (e: any) {
      showToast(e.message, 'err')
    }
  }

  // On bridgeId set, ping immediately + every 30s
  useEffect(() => {
    if (!bridgeId) return
    checkConnection()
    const t = setInterval(checkConnection, 30_000)
    return () => clearInterval(t)
  }, [bridgeId])

  // When status flips to online, prefetch creds
  useEffect(() => {
    if (status === 'online' && creds.length === 0) {
      loadCreds()
    }
  }, [status])

  // ─── Pairing ──────────────────────

  if (showPair || !bridgeId) {
    return <PairScreen onPaired={(id) => {
      localStorage.setItem(BRIDGE_ID_KEY, id)
      setBridgeId(id)
      setShowPair(false)
    }} />
  }

  // ─── Main UI ──────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0a0a14]/85 border-b border-white/10">
        <div className="px-4 pt-3 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff2b4a]/30 to-[#ff2b4a]/10 border border-[#ff2b4a]/40 flex items-center justify-center">
              <Smartphone size={16} className="text-[#ff2b4a]" />
            </div>
            <div>
              <div className="font-mono text-[11px] font-bold tracking-widest text-white">
                ENCRYPTED MOBILE
              </div>
              <ConnectionDot status={status} />
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem(BRIDGE_ID_KEY)
              setBridgeId('')
              setShowPair(true)
            }}
            className="text-[10px] font-mono text-white/50 hover:text-white px-2 py-1"
            title="Trocar PC"
          >
            ⋯
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pb-2 flex items-center gap-1.5">
          <TabBtn active={tab === 'gerar'} onClick={() => setTab('gerar')} icon={<Sparkles size={11} />}>GERAR</TabBtn>
          <TabBtn active={tab === 'vendas'} onClick={() => { setTab('vendas'); loadSales() }} icon={<Receipt size={11} />}>VENDAS</TabBtn>
          <TabBtn active={tab === 'extrato'} onClick={() => setTab('extrato')} icon={<DollarSign size={11} />}>EXTRATO</TabBtn>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {status === 'offline' && (
          <div className="mb-4 p-3 rounded-xl bg-[#ff2b4a]/10 border border-[#ff2b4a]/30 flex items-center gap-2.5">
            <WifiOff size={16} className="text-[#ff2b4a] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-mono font-bold text-[#ff2b4a]">PC OFFLINE</div>
              <div className="text-[10px] font-mono text-white/60">
                Verifique se está ligado e o Modo Mobile ativo.
              </div>
            </div>
            <button
              onClick={checkConnection}
              className="p-2 rounded-lg bg-[#ff2b4a]/20 text-[#ff2b4a] hover:bg-[#ff2b4a]/30"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        )}

        {tab === 'gerar' && (
          <GerarTab
            creds={creds}
            online={status === 'online'}
            sendCommand={sendCommand}
            showToast={showToast}
            onReloadCreds={loadCreds}
          />
        )}

        {tab === 'vendas' && (
          <VendasTab
            sales={sales}
            online={status === 'online'}
            onReload={loadSales}
            showToast={showToast}
          />
        )}

        {tab === 'extrato' && (
          <ExtratoTab
            creds={creds}
            online={status === 'online'}
            sendCommand={sendCommand}
            showToast={showToast}
          />
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 left-4 right-4 z-50 rounded-xl px-4 py-3 backdrop-blur-xl shadow-2xl border font-mono text-[13px] ${
          toast.type === 'ok'  ? 'bg-[#00e396]/15 border-[#00e396]/40 text-[#00e396]' :
          toast.type === 'err' ? 'bg-[#ff2b4a]/15 border-[#ff2b4a]/40 text-[#ff2b4a]' :
                                 'bg-white/10 border-white/20 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

// ─── Pair screen ────────────────────────────────────────

function PairScreen({ onPaired }: { onPaired: (id: string) => void }) {
  const [code, setCode] = useState('')
  const [err, setErr]   = useState('')

  function submit() {
    const cleaned = code.trim().toLowerCase()
    if (!/^[a-f0-9]{16,}$/.test(cleaned)) {
      setErr('Código inválido. Cole o código que aparece no software.')
      return
    }
    onPaired(cleaned)
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ff2b4a]/30 to-[#ff2b4a]/10 border border-[#ff2b4a]/40 items-center justify-center mb-4">
              <Smartphone size={28} className="text-[#ff2b4a]" />
            </div>
            <div className="font-mono text-lg font-bold tracking-widest mb-2">PAREAR PC</div>
            <div className="text-[12px] font-mono text-white/60 leading-relaxed">
              Cole o ID do PC que aparece no software<br />
              em <span className="text-[#ff2b4a]">Modo Mobile → Código</span>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={(e) => { setCode(e.target.value); setErr('') }}
              placeholder="abc123..."
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 font-mono text-sm text-white placeholder-white/30 focus:border-[#ff2b4a] focus:outline-none focus:bg-white/10"
            />
            {err && (
              <div className="text-[11px] font-mono text-[#ff2b4a]">{err}</div>
            )}
            <button
              onClick={submit}
              disabled={!code.trim()}
              className="w-full bg-gradient-to-r from-[#ff2b4a] to-[#ff2b4a]/80 hover:from-[#ff2b4a]/90 hover:to-[#ff2b4a]/70 disabled:opacity-30 disabled:cursor-not-allowed text-white font-mono font-bold tracking-widest text-[12px] py-3.5 rounded-xl transition"
            >
              CONECTAR
            </button>
          </div>

          <div className="mt-8 text-center">
            <div className="text-[10px] font-mono text-white/30 leading-loose">
              O ID do PC pode ser pareado uma vez aqui.<br />
              Funciona enquanto o PC estiver ligado.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Components ─────────────────────────────────────────

function ConnectionDot({ status }: { status: Status }) {
  const cfg = {
    idle:       { color: 'bg-white/30', label: 'Aguardando' },
    connecting: { color: 'bg-yellow-400 animate-pulse', label: 'Conectando' },
    online:     { color: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]', label: 'PC Online' },
    offline:    { color: 'bg-[#ff2b4a]', label: 'PC Offline' },
  }[status]
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-1.5 h-1.5 rounded-full ${cfg.color}`} />
      <span className="text-[9px] font-mono text-white/50 tracking-widest">{cfg.label}</span>
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold tracking-widest transition ${
        active
          ? 'bg-[#ff2b4a]/20 border border-[#ff2b4a]/40 text-[#ff2b4a]'
          : 'border border-white/10 text-white/50 hover:bg-white/5'
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

// ─── Gerar tab ──────────────────────────────────────────

function GerarTab({
  creds, online, sendCommand, showToast, onReloadCreds
}: {
  creds: Cred[]
  online: boolean
  sendCommand: (cmd: string, args?: any) => Promise<any>
  showToast: (m: string, t?: any) => void
  onReloadCreds: () => void
}) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [accountPicker, setAccountPicker] = useState(false)
  const [search, setSearch] = useState('')
  const [title, setTitle]   = useState('')
  const [amount, setAmount] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated]   = useState<GeneratedLink | null>(null)
  const [copied, setCopied] = useState(false)

  const selectedCred = creds.find(c => c.slot === selectedSlot)

  // Filter creds by search
  const filtered = creds.filter(c =>
    !search.trim() ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    String(c.slot).includes(search)
  )

  // Group by manager
  const grouped: Record<string, Cred[]> = { R7: [], KEVEN: [], GUI: [], PABLO: [], OUTROS: [] }
  for (const c of filtered) {
    if (!c.banned) grouped[getManager(c.name)].push(c)
  }

  async function handleGenerate() {
    if (!selectedSlot) {
      showToast('Selecione uma conta', 'err')
      return
    }
    if (!title.trim()) {
      showToast('Digite o título', 'err')
      return
    }
    const amountNum = parseFloat(amount.replace(',', '.'))
    if (!isFinite(amountNum) || amountNum < 1) {
      showToast('Valor inválido', 'err')
      return
    }

    setGenerating(true)
    setGenerated(null)
    try {
      const data = await sendCommand('mp:create-link', {
        slot:   selectedSlot,
        title:  title.trim(),
        amount: amountNum,
      })
      setGenerated(data)
      showToast('Link gerado!', 'ok')
    } catch (e: any) {
      showToast(e.message, 'err')
    } finally {
      setGenerating(false)
    }
  }

  async function copyLink() {
    if (!generated) return
    await navigator.clipboard.writeText(generated.link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
    showToast('Link copiado', 'ok')
  }

  function shareWhatsApp() {
    if (!generated) return
    const msg = `${title}\n\n${generated.link}`
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  function reset() {
    setGenerated(null)
    setTitle('')
    setAmount('')
  }

  // ─── Render ───

  if (generated) {
    return (
      <div className="space-y-4">
        <div className="text-center py-6">
          <div className="inline-flex w-14 h-14 rounded-full bg-[#00e396]/15 border border-[#00e396]/40 items-center justify-center mb-3">
            <Check size={26} className="text-[#00e396]" />
          </div>
          <div className="font-mono text-sm font-bold text-[#00e396] tracking-widest mb-1">
            LINK GERADO
          </div>
          <div className="text-[11px] font-mono text-white/50">
            {generated.slotName}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="text-[9px] font-mono text-white/40 tracking-widest mb-2">
            LINK DE PAGAMENTO
          </div>
          <div className="text-[11px] font-mono text-white break-all leading-relaxed mb-3">
            {generated.link}
          </div>
          <div className="text-[10px] font-mono text-white/40 pt-2 border-t border-white/5">
            Ref: {generated.reference.slice(0, 24)}…
          </div>
          {generated.expiresAt && (
            <div className="text-[10px] font-mono text-white/40 mt-1">
              Expira em: {new Date(generated.expiresAt).toLocaleString('pt-BR')}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={copyLink}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl border transition font-mono text-[11px] font-bold tracking-widest ${
              copied
                ? 'bg-[#00e396]/15 border-[#00e396]/40 text-[#00e396]'
                : 'bg-[#ff2b4a]/15 border-[#ff2b4a]/40 text-[#ff2b4a] hover:bg-[#ff2b4a]/25'
            }`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'COPIADO' : 'COPIAR'}
          </button>
          <button
            onClick={shareWhatsApp}
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#25D366]/15 border border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/25 transition font-mono text-[11px] font-bold tracking-widest"
          >
            <Share2 size={13} />
            WHATSAPP
          </button>
        </div>

        <button
          onClick={reset}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-white/60 hover:bg-white/5 transition font-mono text-[10px] font-bold tracking-widest"
        >
          <ArrowLeft size={12} />
          GERAR OUTRO
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Account picker */}
      <div>
        <label className="block text-[10px] font-mono text-white/50 tracking-widest mb-1.5">
          CONTA MERCADO PAGO
        </label>
        <button
          onClick={() => setAccountPicker(true)}
          disabled={!online}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl border transition ${
            selectedCred
              ? 'bg-[#ff2b4a]/10 border-[#ff2b4a]/40'
              : 'bg-white/5 border-white/10'
          } ${online ? 'hover:bg-white/10' : 'opacity-40 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
              selectedCred ? 'bg-[#ff2b4a]/20' : 'bg-white/5'
            }`}>
              <CreditCard size={15} className={selectedCred ? 'text-[#ff2b4a]' : 'text-white/40'} />
            </div>
            <div className="text-left min-w-0">
              {selectedCred ? (
                <>
                  <div className="font-mono text-sm font-bold truncate">{selectedCred.name}</div>
                  <div className="text-[10px] font-mono text-white/50">Slot {String(selectedCred.slot).padStart(2, '0')}</div>
                </>
              ) : (
                <>
                  <div className="font-mono text-sm text-white/60">Selecionar conta</div>
                  <div className="text-[10px] font-mono text-white/30">{creds.length} disponíveis</div>
                </>
              )}
            </div>
          </div>
          <ChevronDown size={15} className="text-white/40 flex-shrink-0" />
        </button>
      </div>

      {/* Title */}
      <div>
        <label className="block text-[10px] font-mono text-white/50 tracking-widest mb-1.5">
          TÍTULO / DESCRIÇÃO
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Ex: Antonio Auto Peças"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 font-mono text-sm text-white placeholder-white/25 focus:border-[#ff2b4a] focus:outline-none focus:bg-white/10"
        />
      </div>

      {/* Amount */}
      <div>
        <label className="block text-[10px] font-mono text-white/50 tracking-widest mb-1.5">
          VALOR
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-white/40 text-sm">R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            placeholder="0,00"
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 font-mono text-2xl font-bold text-white placeholder-white/25 focus:border-[#ff2b4a] focus:outline-none focus:bg-white/10"
          />
        </div>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!online || generating || !selectedSlot || !title.trim() || !amount.trim()}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-[#ff2b4a] to-[#ff2b4a]/80 hover:from-[#ff2b4a]/90 disabled:from-white/10 disabled:to-white/10 disabled:text-white/30 disabled:cursor-not-allowed text-white font-mono text-[12px] font-bold tracking-widest transition"
      >
        {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {generating ? 'GERANDO...' : 'GERAR LINK'}
      </button>

      {/* Account picker modal */}
      {accountPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setAccountPicker(false)}>
          <div
            className="w-full sm:max-w-md bg-[#0a0a14] border border-white/10 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="font-mono text-sm font-bold tracking-widest">SELECIONAR CONTA</div>
              <button onClick={() => setAccountPicker(false)} className="p-1.5 rounded text-white/50 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-white/10">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 font-mono text-xs text-white placeholder-white/25 focus:border-[#ff2b4a] focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-2 py-2">
              {Object.entries(grouped).map(([prefix, list]) => list.length === 0 ? null : (
                <div key={prefix} className="mb-3">
                  <div className="px-3 py-1.5 text-[9px] font-mono font-bold tracking-widest text-white/40">
                    {prefix} ({list.length})
                  </div>
                  {list.map(c => (
                    <button
                      key={c.slot}
                      onClick={() => {
                        setSelectedSlot(c.slot)
                        setAccountPicker(false)
                        setSearch('')
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                        selectedSlot === c.slot ? 'bg-[#ff2b4a]/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-white/50 flex-shrink-0">
                        {String(c.slot).padStart(2, '0')}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-mono text-sm font-bold truncate">{c.name}</div>
                      </div>
                      {selectedSlot === c.slot && (
                        <Check size={14} className="text-[#ff2b4a] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-12 text-white/40 font-mono text-xs">
                  Nenhuma conta {search ? 'encontrada' : 'conectada'}.
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-3">
              <button
                onClick={onReloadCreds}
                className="w-full py-2 rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/5 font-mono text-[10px] tracking-widest transition flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={11} /> RECARREGAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Vendas tab ─────────────────────────────────────────

function VendasTab({
  sales, online, onReload, showToast
}: {
  sales: Sale[]
  online: boolean
  onReload: () => void
  showToast: (m: string, t?: any) => void
}) {
  const [refreshing, setRefreshing] = useState(false)

  async function handleReload() {
    setRefreshing(true)
    try {
      await onReload()
    } finally { setRefreshing(false) }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-mono text-[10px] tracking-widest text-white/40">ÚLTIMAS</div>
          <div className="font-mono text-sm font-bold">VENDAS</div>
        </div>
        <button
          onClick={handleReload}
          disabled={!online}
          className="p-2 rounded-lg border border-white/10 text-white/50 hover:text-white disabled:opacity-30 transition"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {sales.length === 0 ? (
        <div className="text-center py-16">
          <Receipt size={28} className="mx-auto text-white/15 mb-3" />
          <div className="font-mono text-xs text-white/40">
            {online ? 'Toque em ↻ pra carregar' : 'PC offline'}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {sales.map(s => <SaleRow key={s.id} sale={s} />)}
        </div>
      )}
    </div>
  )
}

function SaleRow({ sale }: { sale: Sale }) {
  const info = STATUS_INFO[sale.status] || STATUS_INFO.gerado
  const Icon = info.icon

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{
            backgroundColor: info.color + '20',
            borderColor: info.color + '60',
            borderWidth: '1px',
          }}
        >
          <Icon size={13} style={{ color: info.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <div className="font-mono text-sm font-bold truncate">{sale.title}</div>
            <div className="font-mono text-sm font-bold flex-shrink-0">{fmtBRL(sale.amount)}</div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-[9px] font-mono tracking-widest" style={{ color: info.color }}>
              {info.label.toUpperCase()}
            </div>
            <div className="text-[9px] text-white/20">·</div>
            <div className="text-[9px] font-mono text-white/50 truncate">{sale.slot_name}</div>
            <div className="text-[9px] text-white/20">·</div>
            <div className="text-[9px] font-mono text-white/40 flex-shrink-0">{fmtRel(sale.created_at)}</div>
          </div>
          {sale.net_amount && sale.status === 'approved' && (
            <div className="text-[10px] font-mono text-[#00e396]/80 mt-1">
              Líquido: {fmtBRL(sale.net_amount)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Extrato tab ────────────────────────────────────────

function ExtratoTab({
  creds, online, sendCommand, showToast
}: {
  creds: Cred[]
  online: boolean
  sendCommand: (cmd: string, args?: any) => Promise<any>
  showToast: (m: string, t?: any) => void
}) {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [picker, setPicker] = useState(false)
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  const selected = creds.find(c => c.slot === selectedSlot)

  const filteredCreds = creds.filter(c =>
    !search.trim() ||
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const grouped: Record<string, Cred[]> = { R7: [], KEVEN: [], GUI: [], PABLO: [], OUTROS: [] }
  for (const c of filteredCreds) {
    if (!c.banned) grouped[getManager(c.name)].push(c)
  }

  async function loadExtrato(slot: number) {
    setLoading(true)
    try {
      const data = await sendCommand('mp:list-extrato', { slot, limit: 50 })
      setPayments(data || [])
    } catch (e: any) {
      showToast(e.message, 'err')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <div className="mb-3">
        <button
          onClick={() => setPicker(true)}
          disabled={!online}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition ${
            selected
              ? 'bg-[#ff2b4a]/10 border-[#ff2b4a]/40'
              : 'bg-white/5 border-white/10'
          } ${online ? 'hover:bg-white/10' : 'opacity-40 cursor-not-allowed'}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Wallet size={15} className={selected ? 'text-[#ff2b4a]' : 'text-white/40'} />
            <div className="text-left min-w-0">
              <div className="font-mono text-sm truncate">
                {selected ? selected.name : 'Selecionar conta'}
              </div>
            </div>
          </div>
          <ChevronDown size={15} className="text-white/40 flex-shrink-0" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-white/40" />
        </div>
      ) : payments.length > 0 ? (
        <div className="space-y-2">
          {payments.map((p: any) => <ExtratoRow key={p.id} payment={p} />)}
        </div>
      ) : selected ? (
        <div className="text-center py-12 text-white/40 font-mono text-xs">
          Nenhum pagamento encontrado.
        </div>
      ) : (
        <div className="text-center py-12 text-white/40 font-mono text-xs">
          Selecione uma conta acima.
        </div>
      )}

      {picker && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setPicker(false)}>
          <div
            className="w-full sm:max-w-md bg-[#0a0a14] border border-white/10 rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="font-mono text-sm font-bold tracking-widest">CONTA</div>
              <button onClick={() => setPicker(false)} className="p-1.5 text-white/50 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto px-2 py-2">
              {Object.entries(grouped).map(([prefix, list]) => list.length === 0 ? null : (
                <div key={prefix} className="mb-3">
                  <div className="px-3 py-1.5 text-[9px] font-mono font-bold tracking-widest text-white/40">{prefix}</div>
                  {list.map(c => (
                    <button
                      key={c.slot}
                      onClick={() => {
                        setSelectedSlot(c.slot)
                        setPicker(false)
                        loadExtrato(c.slot)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                        selectedSlot === c.slot ? 'bg-[#ff2b4a]/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-mono text-white/50 flex-shrink-0">
                        {String(c.slot).padStart(2, '0')}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-mono text-sm font-bold truncate">{c.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ExtratoRow({ payment }: { payment: any }) {
  const status = (payment.status || '').toLowerCase()
  const info = STATUS_INFO[status] || STATUS_INFO.gerado
  const amount = Number(payment.transaction_amount || 0)

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-bold truncate">{fmtBRL(amount)}</div>
          <div className="text-[10px] font-mono text-white/40 truncate mt-0.5">
            {payment.description || 'Sem descrição'}
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-[9px] font-mono tracking-widest" style={{ color: info.color }}>
              {info.label.toUpperCase()}
            </span>
            {payment.payment_method_id && (
              <>
                <span className="text-[9px] text-white/20">·</span>
                <span className="text-[9px] font-mono text-white/50">{payment.payment_method_id}</span>
              </>
            )}
            {payment.installments && payment.installments > 1 && (
              <>
                <span className="text-[9px] text-white/20">·</span>
                <span className="text-[9px] font-mono text-white/50">{payment.installments}x</span>
              </>
            )}
          </div>
        </div>
        <div className="text-[9px] font-mono text-white/30 flex-shrink-0">
          {payment.date_created && fmtRel(payment.date_created)}
        </div>
      </div>
    </div>
  )
}
