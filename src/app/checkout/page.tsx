'use client'
import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sidebar, MobileTopBar } from '@/components/ec/Sidebar'
import { Dashboard } from '@/app/checkout/screens/Dashboard'
import { Credentials } from '@/app/checkout/screens/Credentials'
import { Gateways } from '@/app/checkout/screens/Gateways'
import { Extrato } from '@/app/checkout/screens/Extrato'
import { Logs } from '@/app/checkout/screens/Logs'
import { GenerateModal } from '@/components/ec/modals/Generate'
import { SwitchAccountModal } from '@/components/ec/modals/SwitchAccount'
import { SettingsModal } from '@/components/ec/modals/Settings'
import { ToastStack, PaymentNotifications } from '@/components/ec/Toast'
import { useApp } from '@/lib/ec-store'

const SCREENS: Record<string, React.ComponentType> = {
  dashboard:   Dashboard,
  credentials: Credentials,
  gateways:    Gateways,
  extrato:     Extrato,
  logs:        Logs,
}

export default function CheckoutPage() {
  const { screen, modal, closeModal, setUsername, refreshCreds } = useApp()

  useEffect(() => {
    // Load user + creds on mount
    fetch('/api/ec/me')
      .then(r => r.json())
      .then(d => { if (d.ok) setUsername(d.username) })
      .catch(() => {})
    refreshCreds()
  }, [])

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
