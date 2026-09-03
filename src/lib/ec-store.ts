import { create } from 'zustand'

export type Screen = 'dashboard' | 'credentials' | 'gateways' | 'extrato' | 'logs' | 'users' | 'studio'
export type ModalId = 'generate' | 'switch-account' | 'settings' | 'saque' | 'pushover' | 'utmify'

export interface Credential {
  id: number
  slot: number
  name: string
  mp_user_id?: string
  connected: boolean
  is_active: boolean
  health_status: string
  health_message?: string
  last_test_at?: string
  created_at: string
  updated_at: string
}

export interface PendingPayment {
  id: number
  amount: number
  title: string
  slotName: string
  method: string
  saleId: number
}

export interface AppToast {
  id: number
  type: 'info' | 'success' | 'error'
  msg: string
}

interface AppState {
  // Nav
  screen: Screen
  setScreen: (s: Screen) => void

  // Modals
  modal: ModalId | null
  openModal: (id: ModalId) => void
  closeModal: () => void

  // User
  username: string | null
  setUsername: (u: string) => void
  isAdmin: boolean
  setIsAdmin: (v: boolean) => void

  // Credentials
  creds: Credential[]
  setCreds: (c: Credential[]) => void
  refreshCreds: () => Promise<void>
  activeCred: Credential | null
  setActiveCred: (c: Credential | null) => void

  // Payment notifications (floating cards)
  pendingPayments: PendingPayment[]
  pushPayment: (p: Omit<PendingPayment, 'id'>) => void
  dismissPayment: (id: number) => void

  // Toasts
  toasts: AppToast[]
  toast: (type: AppToast['type'], msg: string) => void
  dismissToast: (id: number) => void
}

let toastId = 0
let paymentId = 0

export const useApp = create<AppState>((set, get) => ({
  // Nav
  screen: 'dashboard',
  setScreen: (screen) => set({ screen }),

  // Modals
  modal: null,
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),

  // User
  username: null,
  setUsername: (username) => set({ username }),
  isAdmin: false,
  setIsAdmin: (isAdmin) => set({ isAdmin }),

  // Credentials
  creds: [],
  setCreds: (creds) => {
    const active = creds.find(c => c.is_active) ?? null
    set({ creds, activeCred: active })
  },
  refreshCreds: async () => {
    try {
      const r = await fetch('/api/ec/creds/list')
      const d = await r.json()
      if (d.ok) {
        const creds: Credential[] = d.creds
        const active = creds.find(c => c.is_active) ?? null
        set({ creds, activeCred: active })
      }
    } catch {}
  },
  activeCred: null,
  setActiveCred: (activeCred) => set({ activeCred }),

  // Payment notifications
  pendingPayments: [],
  pushPayment: (p) => {
    const payment: PendingPayment = { ...p, id: ++paymentId }
    set(s => ({ pendingPayments: [...s.pendingPayments, payment] }))
    // Auto-dismiss after 10 seconds
    setTimeout(() => get().dismissPayment(payment.id), 10000)
  },
  dismissPayment: (id) => set(s => ({ pendingPayments: s.pendingPayments.filter(p => p.id !== id) })),

  // Toasts
  toasts: [],
  toast: (type, msg) => {
    const id = ++toastId
    set(s => ({ toasts: [...s.toasts, { id, type, msg }] }))
    setTimeout(() => get().dismissToast(id), 3500)
  },
  dismissToast: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
