import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ENCRYPTED · Checkout',
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// useCheckoutUser is exported from ./checkout-context (client component)
// so it can be imported safely by 'use client' pages
