'use client'

import { useState, useEffect, useCallback } from 'react'
import { LinkIcon, Copy, Check, Loader2, QrCode, RefreshCw } from 'lucide-react'

interface GeneratedPix {
  id: string
  qrCode: string
  qrCodeBase64: string
  value: number
  status: string
  paid: boolean
}

export default function LinksParadisePage() {
  const [value, setValue] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState<GeneratedPix[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const checkStatuses = useCallback(async () => {
    const pendingIds = results.filter(r => !r.paid).map(r => r.id)
    if (pendingIds.length === 0) return

    try {
      const res = await fetch('/api/admin/check-payment-status-paradise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: pendingIds }),
      })

      if (res.ok) {
        const data = await res.json()
        setResults(prev =>
          prev.map(pix => {
            const updated = data.statuses.find((s: { id: string; status: string; paid: boolean }) => s.id === pix.id)
            if (updated) return { ...pix, status: updated.status, paid: updated.paid }
            return pix
          })
        )
      }
    } catch { /* silently retry on next interval */ }
  }, [results])

  useEffect(() => {
    if (results.length === 0 || results.every(r => r.paid)) return
    const interval = setInterval(checkStatuses, 10000)
    return () => clearInterval(interval)
  }, [results, checkStatuses])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const qty = Math.min(Math.max(parseInt(quantity) || 1, 1), 20)
    const newResults: GeneratedPix[] = []

    try {
      for (let i = 0; i < qty; i++) {
        const res = await fetch('/api/admin/generate-link-paradise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: parseFloat(value.replace(',', '.')),
            description: description || undefined,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Erro ao gerar link')
          break
        }

        newResults.push({ ...data, status: 'pending', paid: false })
      }

      if (newResults.length > 0) {
        setResults(prev => [...newResults, ...prev])
      }
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
          <LinkIcon className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Links Paradise</h1>
          <p className="text-sm text-zinc-500">Gere cobranças PIX via Paradise Pags</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Valor (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">R$</span>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0,00"
                className="w-full pl-10 pr-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Quantidade</label>
            <input
              type="number"
              min="1"
              max="20"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Descrição <span className="text-zinc-600">(opcional)</span></label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Pagamento consultoria"
              className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !value}
          className="w-full py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
          ) : (
            <><QrCode className="w-4 h-4" /> Gerar {parseInt(quantity) > 1 ? quantity + ' PIX' : 'PIX'}</>
          )}
        </button>
      </form>

      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Códigos Gerados ({results.length})</h2>
            <button
              onClick={checkStatuses}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Atualizar status
            </button>
          </div>

          <div className="space-y-3">
            {results.map((pix, i) => (
              <div key={pix.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-zinc-300">#{results.length - i}</span>
                    <span className="text-sm font-bold text-white">
                      R$ {(pix.value / 100).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    pix.paid
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${pix.paid ? 'bg-emerald-400' : 'bg-yellow-400 animate-pulse'}`} />
                    {pix.paid ? 'Pago' : 'Aguardando'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-zinc-400 bg-black/30 rounded px-3 py-2 overflow-x-auto whitespace-nowrap">
                    {pix.qrCode}
                  </code>
                  <button
                    onClick={() => handleCopy(pix.qrCode, pix.id)}
                    className="flex-shrink-0 p-2 hover:bg-white/[0.06] rounded-md transition-colors"
                    title="Copiar código PIX"
                  >
                    {copiedId === pix.id ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
            }
