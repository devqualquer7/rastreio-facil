'use client'
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar, MobileTopBar } from '@/components/ec/Sidebar'
import { Dashboard } from '@/app/checkout/screens/Dashboard'
import { Credentials } from '@/app/checkout/screens/Credentials'
import { Gateways } from '@/app/checkout/screens/Gateways'
import { Extrato } from '@/app/checkout/screens/Extrato'
import { Logs } from '@/app/checkout/screens/Logs'
import { Users } from '@/app/checkout/screens/Users'
import { GenerateModal } from '@/components/ec/modals/Generate'
import { SwitchAccountModal } from '@/components/ec/modals/SwitchAccount'
import { SettingsModal } from '@/components/ec/modals/Settings'
import { SaqueModal } from '@/components/ec/modals/Saque'
import { PushoverModal } from '@/components/ec/modals/Pushover'
import { UtmifyModal } from '@/components/ec/modals/Utmify'
import { ToastStack, PaymentNotifications } from '@/components/ec/Toast'
import { useApp } from '@/lib/ec-store'
import { usePolling } from '@/hooks/ec-polling'
import { playCashSound, fireOSNotification } from '@/lib/ec-notify'
import { fmtBRL } from '@/lib/ec-utils'

const SCREENS: Record<string, React.ComponentType> = {
  dashboard:   Dashboard,
  credentials: Credentials,
  gateways:    Gateways,
  extrato:     Extrato,
  logs:        Logs,
  users:       Users,
}

// Health check fires on mount + every 5 minutes
const HEALTH_MS = 5 * 60 * 1000

export default function CheckoutPage() {
  const { screen, modal, closeModal, setUsername, setIsAdmin, refreshCreds, username, isAdmin, pushPayment, toast } = useApp()
  const lastStatusRef = useRef<Map<number, string>>(new Map())
  const initializedRef = useRef(false)

  useEffect(() => {
    // Load user + creds on mount
    fetch('/api/ec/me')
      .then(r => r.json())
      .then(d => { if (d.ok) { setUsername(d.username); setIsAdmin(d.is_admin ?? false) } })
      .catch(() => {})
    refreshCreds()
  }, [])

  // Automatic account health check — every 5 minutes
  useEffect(() => {
    if (!username) return

    async function runHealthCheck() {
      try {
        const r = await fetch('/api/ec/health/check', { method: 'POST' })
        const d = await r.json()
        if (!d.ok) return

        if (d.newlyBanned?.length > 0) {
          for (const slot of d.newlyBanned) {
            toast('error', `⚠ Conta banida — Slot #${slot}`)
            fireOSNotification(
              '⚠ Conta MP Suspensa',
              `Slot #${slot} foi banido pelo Mercado Pago. Reconecte via OAuth.`,
              `banned-slot-${slot}`
            )
          }
          refreshCreds()
        }
      } catch {}
    }

    runHealthCheck() // immediate check on login
    const interval = setInterval(runHealthCheck, HEALTH_MS)
    return () => clearInterval(interval)
  }, [username])

  // Global polling — fires payment notifications from ANY screen
  async function globalPoll() {
    try {
      // Tick and list run in parallel — list may miss this tick's writes but catches them next cycle (30s)
      const [, listResp] = await Promise.all([
        fetch('/api/ec/poll/tick', { method: 'POST' }),
        fetch('/api/ec/sales/list', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ limit: 500 }),
        }),
      ])
      const d = await listResp.json()
      if (!d.ok) return
      const list: any[] = d.sales || []

      if (initializedRef.current) {
        for (const sale of list) {
          const prev = lastStatusRef.current.get(sale.id)
          // Notifica na tela se o link foi gerado por ESTE usuário — OU se sou ADMIN
          // (admin vê todas as vendas do sistema). created_by vem do sales/list.
          const isMine = isAdmin || (sale.created_by && sale.created_by === username)
          if (isMine && prev && prev !== 'approved' && sale.status === 'approved') {
            const amount = Number(sale.amount || 0)
            pushPayment({ amount, title: sale.title, slotName: sale.slot_name, method: sale.payment_type_id, saleId: sale.id })
            playCashSound()
            if (typeof document !== 'undefined' && document.hidden) {
              fireOSNotification(`💰 Pagamento aprovado — ${fmtBRL(amount)}`, `${sale.title}\n${sale.slot_name}`, `payment-${sale.id}`)
            }
          }
        }
      }

      const map = new Map<number, string>()
      for (const s of list) map.set(s.id, s.status)
      lastStatusRef.current = map
      initializedRef.current = true
    } catch {}
  }

  usePolling(!!username, globalPoll)

  const Screen = SCREENS[screen] || Dashboard

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden" style={{ background: '#060610', color: '#e4e4f4', fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace" }}>
      {/* Ambient bg — desktop (grid + spotlight) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="ec-grid-pattern absolute inset-0" style={{ opacity: 0.3 }} />
        <div className="ec-spotlight absolute inset-0" />
        <div className="absolute top-0 left-0 right-0 h-64" style={{ background: 'linear-gradient(to bottom, rgba(255,43,74,.04), transparent)' }} />
      </div>

      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <MobileTopBar />
        {screen === 'studio' ? (
          <iframe
            src="/studio/editor.html"
            className="flex-1 w-full border-none"
            style={{ minHeight: 0 }}
            allow="clipboard-write; downloads"
          />
        ) : (
          <main className="flex-1 overflow-y-auto p-4 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}>
                <div className="max-w-[1500px] mx-auto"><Screen /></div>
              </motion.div>
            </AnimatePresence>
          </main>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal === 'generate'       && <GenerateModal />}
        {modal === 'switch-account' && <SwitchAccountModal />}
        {modal === 'settings'       && <SettingsModal />}
        {modal === 'saque'          && <SaqueModal />}
        {modal === 'pushover'       && <PushoverModal />}
        {modal === 'utmify'         && <UtmifyModal />}
      </AnimatePresence>

      {/* Toasts & payment notifications */}
      <ToastStack />
      <PaymentNotifications />
    </div>
  )
}
