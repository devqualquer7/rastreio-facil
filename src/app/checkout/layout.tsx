import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'ENCRYPTED · Checkout',
  appleWebApp: { capable: true, title: 'Checkout', statusBarStyle: 'black-translucent' },
}

// Cor da barra do navegador / do app instalado no celular
export const viewport: Viewport = {
  themeColor: '#060610',
}

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// useCheckoutUser is exported from ./checkout-context (client component)
// so it can be imported safely by 'use client' pages
