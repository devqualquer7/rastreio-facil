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

export default function CheckoutPage() {
  const { screen, modal, closeModal, setUsername, setIsAdmin, refreshCreds, username, pushPayment } = useApp()
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

  // Global polling — fires payment notifications from ANY screen
  async function globalPoll() {
    try {
      // Tick the poll endpoint to sync MP statuses
      await fetch('/api/ec/poll/tick', { method: 'POST' })

      // Then fetch sales to detect new approvals
      const r = await fetch('/api/ec/sales/list', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ limit: 500 }),
      })
      const d = await r.json()
      if (!d.ok) return
      const list: any[] = d.sales || []

      if (initializedRef.current) {
        for (const sale of list) {
          const prev = lastStatusRef.current.get(sale.id)
          if (prev && prev !== 'approved' && sale.status === 'approved') {
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
    <div className="h-screen flex flex-col md:flex-row bg-[#09090f] overflow-hidden">
      {/* Ambient bg */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-purple-900/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-cyan-900/15 blur-[100px]" />
      </div>

      {/* Sidebar (desktop) */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <MobileTopBar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}>
              <Screen />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal === 'generate'       && <GenerateModal />}
        {modal === 'switch-account' && <SwitchAccountModal />}
        {modal === 'settings'       && <SettingsModal />}
      </AnimatePresence>

      {/* Toasts & payment notifications */}
      <ToastStack />
      <PaymentNotifications />
    </div>
  )
}
