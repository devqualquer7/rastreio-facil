'use client'

import { useState } from 'react'
import { LinkIcon, Copy, Check, Loader2, QrCode } from 'lucide-react'

export default function GenerateLinksPage() {
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{
    qrCode: string
    qrCodeBase64: string
    value: number
  } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)

    try {
      const res = await fetch('/api/admin/generate-link', {
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
        return
      }

      setResult(data)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReset() {
    setResult(null)
    setValue('')
    setDescription('')
    setError('')
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
          <LinkIcon className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Gerar Links de Pagamento</h1>
          <p className="text-sm text-zinc-500">Crie cobranças PIX com valor personalizado</p>
        </div>
      </div>

      {!result ? (
        <form onSubmit={handleGenerate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Valor (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-lg"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Descrição <span className="text-zinc-600">(opcional)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Pagamento consultoria"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.08] rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 text-sm"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !value}
            className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4" />
                Gerar PIX
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="text-center p-4 bg-violet-600/10 border border-violet-500/20 rounded-lg">
            <p className="text-sm text-zinc-400 mb-1">Valor da cobrança</p>
            <p className="text-2xl font-bold text-white">
              R$ {(result.value / 100).toFixed(2).replace('.', ',')}
            </p>
          </div>

          {result.qrCodeBase64 && (
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl">
                <img
                  src={`data:image/png;base64,${result.qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-56 h-56"
                />
              </div>
            </div>
          )}

          {result.qrCode && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Código PIX (copia e cola)
              </label>
              <div className="relative">
                <div className="w-full p-3 pr-12 bg-white/[0.05] border border-white/[0.08] rounded-lg text-zinc-300 text-xs break-all font-mono max-h-24 overflow-y-auto">
                  {result.qrCode}
                </div>
                <button
                  onClick={() => handleCopy(result.qrCode)}
                  className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors"
                  title="Copiar código"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleReset}
            className="w-full py-3 px-4 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-zinc-300 font-medium text-sm transition-colors"
          >
            Gerar novo link
          </button>
        </div>
      )}
    </div>
  )
}
