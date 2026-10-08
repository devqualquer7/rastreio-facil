import type { MetadataRoute } from 'next'

// Permite "Adicionar à tela inicial" no celular: o painel abre em tela cheia, como um app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Encrypted Checkout',
    short_name: 'Checkout',
    description: 'Painel de vendas — Mercado Pago',
    start_url: '/checkout',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#060610',
    theme_color: '#060610',
    icons: [
      { src: '/logo.png', sizes: 'any', type: 'image/png', purpose: 'any' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
