import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ENCRYPTED · Checkout',
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/**
 * Legacy stub — old /checkout/admin/* pages import this.
 * Returns null so those pages redirect via their own auth checks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCheckoutUser(): any {
  return null
}
