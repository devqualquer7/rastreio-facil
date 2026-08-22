'use client'
import { useState } from 'react'
import { CheckCircle2, XCircle, Key, User, Send, RefreshCw, Shield, Lock, Sparkles } from 'lucide-react'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export default function KeyPage() {
  const [status, setStatus] = useState<Status>('idle')
  const [token, setToken] = useState('')
  const [name, setName] = useState('')
  const [result, setResult] = useState<{ slot?: number; name?: string; mpUserId?: string; error?: string }>({})

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setStatus('submitting')
    try {
      const r = await fetch('/api/ec/key', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ accessToken: token.trim(), name: name.trim() })
      })
      const d = await r.json()
      if (d.ok) { setStatus('success'); setResult({ slot: d.slot, name: d.name, mpUserId: d.mpUserId }) }
      else { setStatus('error'); setResult({ error: d.error || 'Falha' }) }
    } catch (e: any) {
      setStatus('error'); setResult({ error: e?.message || 'Erro de rede' })
    }
  }

  function reset() {
    setStatus('idle'); setToken(''); setName(''); setResult({})
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#09090f] relative">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-purple-900/25 blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-cyan-900/15 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-20 h-20 mb-4">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-700 via-purple-500/50 to-cyan-400 opacity-50 blur-2xl animate-pulse" />
            <div className="relative w-full h-full rounded-3xl bg-gradient-to-br from-violet-800 to-purple-600 flex items-center justify-center text-white font-black text-3xl border border-purple-400/20 shadow-[0_0_40px_rgba(168,85,247,.4)]">
              E
            </div>
          </div>
          <div className="font-black text-2xl tracking-tight ec-shimmer-text">ENCRYPTED</div>
          <div className="text-[10px] font-mono text-zinc-600 tracking-[0.35em] mt-1 uppercase">
            Conectar conta MP
          </div>
        </div>

        {/* Card */}
        <div className="relative bg-gradient-to-b from-[#0d0d18]/90 to-[#09090f]/90 backdrop-blur-xl border border-purple-500/20 rounded-3xl p-7 overflow-hidden shadow-[0_0_60px_rgba(168,85,247,.15)]">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
          <div className="absolute -top-24 -right-24 w-52 h-52 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-52 h-52 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

          <div className="relative">
            {(status === 'idle' || status === 'submitting') && (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={14} className="text-purple-400" />
                    <div className="font-bold text-sm text-purple-300 tracking-wide uppercase">Enviar credencial</div>
                  </div>
                  <div className="text-xs font-mono text-zinc-500 leading-relaxed">
                    Cole o <span className="text-zinc-400">Access Token</span> da sua conta Mercado Pago para ativar as vendas no checkout.
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-start gap-2.5">
                  <Shield size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <div className="text-[11px] font-mono text-zinc-500 leading-relaxed">
                    Seu token é <span className="text-emerald-400">criptografado</span> antes de salvar e só pode ser lido pelo administrador do checkout.
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono font-semibold tracking-[0.25em] text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                    <User size={11} /> Nome da conta (opcional)
                  </div>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Ex: MEI Antonio Auto Peças" maxLength={60}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 focus:bg-purple-500/[0.04] transition-all" />
                </div>

                <div>
                  <div className="text-[10px] font-mono font-semibold tracking-[0.25em] text-zinc-500 uppercase mb-2 flex items-center gap-1.5">
                    <Key size={11} /> Access Token
                  </div>
                  <input type="password" value={token} onChange={e => setToken(e.target.value)}
                    placeholder="APP_USR-xxx-xxx-xxx-xxx"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm font-mono text-zinc-100 outline-none focus:border-purple-500/50 focus:bg-purple-500/[0.04] transition-all" />
                  <div className="text-[10px] font-mono text-zinc-600 mt-2 leading-relaxed">
                    <a href="https://www.mercadopago.com.br/developers/panel/app" target="_blank" rel="noopener" className="text-cyan-400 hover:underline">
                      Suas integrações
                    </a>
                    {' '}→ <span className="text-zinc-500">Credenciais de produção</span>
                  </div>
                </div>

                <button type="submit" disabled={status === 'submitting' || !token.trim()}
                  className="relative w-full py-3.5 rounded-xl bg-gradient-to-br from-violet-700 via-purple-500 to-cyan-300 text-white font-black tracking-wide text-sm shadow-[0_0_25px_rgba(168,85,247,.45)] hover:shadow-[0_0_40px_rgba(168,85,247,.6)] active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2 uppercase">
                  {status === 'submitting' ? (
                    <><RefreshCw size={14} className="animate-spin" /> Validando no MP…</>
                  ) : (
                    <><Send size={14} /> Enviar credencial</>
                  )}
                </button>
              </form>
            )}

            {status === 'success' && (
              <div className="text-center py-4">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-2xl animate-pulse" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border-2 border-emerald-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,.3)]">
                    <CheckCircle2 size={38} className="text-emerald-400" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="font-black text-2xl text-emerald-400 tracking-tight mb-1">ENVIADO ✓</div>
                <div className="text-xs font-mono text-zinc-500 mb-5 leading-relaxed">
                  Sua conta foi validada no Mercado Pago e conectada com sucesso.
                </div>
                <div className="relative bg-gradient-to-br from-emerald-500/10 to-purple-500/5 border border-emerald-500/30 rounded-2xl p-4 mb-5 text-left overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
                  <div className="relative flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-mono text-zinc-600 tracking-[0.2em] uppercase">Conta conectada</div>
                      <div className="font-bold text-sm text-zinc-100 truncate">{result.name || '—'}</div>
                      <div className="text-[10px] font-mono text-zinc-500 tabular tracking-wider">MP · {result.mpUserId}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-5 flex items-start gap-2.5">
                  <Lock size={13} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="text-[11px] font-mono text-zinc-500 leading-relaxed text-left">
                    O <span className="text-purple-300">administrador do checkout</span> agora consegue gerar links de pagamento na sua conta. Pode fechar essa página.
                  </div>
                </div>
                <button onClick={reset} className="text-[11px] font-mono text-zinc-600 hover:text-zinc-400 tracking-[0.15em] transition-colors uppercase">
                  ← enviar outra conta
                </button>
              </div>
            )}

            {status === 'error' && (
              <div className="text-center py-4">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="absolute inset-0 rounded-full bg-red-500/40 blur-2xl" />
                  <div className="relative w-full h-full rounded-full bg-gradient-to-br from-red-500/30 to-red-500/10 border-2 border-red-500/50 flex items-center justify-center">
                    <XCircle size={38} className="text-red-400" strokeWidth={2.5} />
                  </div>
                </div>
                <div className="font-black text-2xl text-red-400 tracking-tight mb-2">FALHOU</div>
                <div className="text-xs font-mono text-red-400/80 mb-6 leading-relaxed">{result.error}</div>
                <button onClick={reset}
                  className="relative w-full py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:border-purple-500/30 hover:text-purple-300 font-black tracking-wide text-sm transition-all uppercase inline-flex items-center justify-center gap-2">
                  <RefreshCw size={14} /> Tentar novamente
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-center mt-6 text-[10px] font-mono text-zinc-800 tracking-[0.35em] uppercase">
          Encrypted · Powered by Cloud
        </div>
      </div>
    </div>
  )
}
