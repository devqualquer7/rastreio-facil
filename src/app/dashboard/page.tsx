'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, Users, Calendar, Clock, AlertTriangle, LayoutDashboard, ArrowRight } from 'lucide-react'

interface UserData {
  id: string
  username: string
  email: string | null
  expiresAt: string | null
  trackingLimit: number
  trackingUsed: number
  daysLeft: number | null
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [trackingsCount, setTrackingsCount] = useState<number | null>(null)
  const [clientsCount, setClientsCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/user/me').then(r => r.json()),
      fetch('/api/user/tracking-codes').then(r => r.json()),
      fetch('/api/user/clients').then(r => r.json()).catch(() => []),
    ]).then(([userData, codes, clients]) => {
      if (!userData.error) setUser(userData)
      setTrackingsCount(Array.isArray(codes) ? codes.length : 0)
      setClientsCount(Array.isArray(clients) ? clients.length : 0)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const daysWarning = user?.daysLeft !== null && user?.daysLeft !== undefined && user.daysLeft <= 7
  const daysColor = daysWarning ? '#f87171' : '#34d399'

  const S = (x: object) => x as React.CSSProperties

  return (
    <div style={S({ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', padding: '32px 24px', fontFamily: 'system-ui, sans-serif' })}>
      <div style={S({ maxWidth: 900, margin: '0 auto' })}>
        <div style={S({ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 })}>
          <div style={S({ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
            <LayoutDashboard size={22} color="#818cf8" />
          </div>
          <div>
            <h1 style={S({ margin: 0, fontSize: 22, fontWeight: 700, color: '#f1f5f9' })}>
              {loading ? 'Dashboard' : `Olá, ${user?.username || ''} !`}
            </h1>
            <p style={S({ margin: 0, fontSize: 13, color: '#64748b' })}>Visão geral da sua conta</p>
          </div>
        </div>

        {loading ? (
          <div style={S({ textAlign: 'center', padding: '80px 0', color: '#64748b' })}>Carregando...</div>
        ) : (
          <>
            {daysWarning && (
              <div style={S({ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' })}>
                <AlertTriangle size={18} color="#f87171" />
                <span style={S({ fontSize: 14, color: '#fca5a5', flex: 1 })}>
                  {user?.daysLeft !== null && user?.daysLeft !== undefined && user.daysLeft <= 0
                    ? 'Sua assinatura expirou. Renove agora para continuar usando.'
                    : `Sua assinatura expira em ${user?.daysLeft} dia${user?.daysLeft !== 1 ? 's' : ''}. Renove para continuar usando.`}
                </span>
                <Link href="/dashboard/renovar" style={S({ padding: '6px 14px', borderRadius: 8, background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none' })}>
                  Renovar
                </Link>
              </div>
            )}

            <div style={S({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 })}>
              <div style={S({ background: 'rgba(15,14,36,0.6)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, padding: 20 })}>
                <div style={S({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 })}>
                  <div style={S({ width: 36, height: 36, borderRadius: 9, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                    <Package size={18} color="#818cf8" />
                  </div>
                  <span style={S({ fontSize: 13, color: '#94a3b8' })}>Rastreios</span>
                </div>
                <p style={S({ margin: 0, fontSize: 28, fontWeight: 700, color: '#f1f5f9' })}>{trackingsCount ?? '—'}</p>
                <p style={S({ margin: '4px 0 0', fontSize: 12, color: '#64748b' })}>{'de ' + (user?.trackingLimit ?? '—') + ' disponíveis'}</p>
                {user && trackingsCount !== null && user.trackingLimit > 0 && (
                  <div style={S({ marginTop: 12, height: 4, borderRadius: 4, background: 'rgba(99,102,241,0.15)', overflow: 'hidden' })}>
                    <div style={S({ height: '100%', borderRadius: 4, background: '#6366f1', width: Math.min(100, (trackingsCount / user.trackingLimit) * 100) + '%' })} />
                  </div>
                )}
              </div>

              <div style={S({ background: 'rgba(15,14,36,0.6)', border: '1px solid ' + (daysWarning ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.15)'), borderRadius: 14, padding: 20 })}>
                <div style={S({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 })}>
                  <div style={S({ width: 36, height: 36, borderRadius: 9, background: daysWarning ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                    <Calendar size={18} color={daysColor} />
                  </div>
                  <span style={S({ fontSize: 13, color: '#94a3b8' })}>Acesso</span>
                </div>
                <p style={S({ margin: 0, fontSize: 28, fontWeight: 700, color: daysColor })}>
                  {user?.daysLeft !== null && user?.daysLeft !== undefined ? user.daysLeft : '∞'}
                </p>
                <p style={S({ margin: '4px 0 0', fontSize: 12, color: '#64748b' })}>
                  {user?.daysLeft !== null ? 'dias restantes' : 'acesso permanente'}
                </p>
                {user?.expiresAt && (
                  <p style={S({ margin: '6px 0 0', fontSize: 11, color: '#475569' })}>
                    {'Expira em ' + new Date(user.expiresAt).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>

              <div style={S({ background: 'rgba(15,14,36,0.6)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 14, padding: 20 })}>
                <div style={S({ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 })}>
                  <div style={S({ width: 36, height: 36, borderRadius: 9, background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                    <Users size={18} color="#a78bfa" />
                  </div>
                  <span style={S({ fontSize: 13, color: '#94a3b8' })}>Clientes</span>
                </div>
                <p style={S({ margin: 0, fontSize: 28, fontWeight: 700, color: '#f1f5f9' })}>{clientsCount ?? '—'}</p>
                <p style={S({ margin: '4px 0 0', fontSize: 12, color: '#64748b' })}>clientes cadastrados</p>
              </div>
            </div>

            <h2 style={S({ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' })}>Acesso Rápido</h2>
            <div style={S({ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 })}>
              {[
                { href: '/dashboard/rastreios', Icon: Package, color: '#6366f1', bg: 'rgba(99,102,241,0.07)', bd: 'rgba(99,102,241,0.15)', label: 'Rastreios', desc: 'Gerenciar códigos de rastreio' },
                { href: '/dashboard/clientes', Icon: Users, color: '#a78bfa', bg: 'rgba(124,58,237,0.07)', bd: 'rgba(124,58,237,0.15)', label: 'Clientes', desc: 'Ver e cadastrar clientes' },
                { href: '/dashboard/renovar', Icon: Clock, color: '#34d399', bg: 'rgba(52,211,153,0.07)', bd: 'rgba(52,211,153,0.15)', label: 'Renovar / Planos', desc: 'Ampliar acesso e rastreios' },
              ].map(({ href, Icon, color, bg, bd, label, desc }) => (
                <Link key={href} href={href} style={S({ textDecoration: 'none' })}>
                  <div style={S({ background: bg, border: '1px solid ' + bd, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' })}>
                    <div style={S({ width: 38, height: 38, borderRadius: 10, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 })}>
                      <Icon size={18} color={color} />
                    </div>
                    <div style={S({ flex: 1 })}>
                      <p style={S({ margin: 0, fontWeight: 600, fontSize: 14, color: '#f1f5f9' })}>{label}</p>
                      <p style={S({ margin: '2px 0 0', fontSize: 12, color: '#64748b' })}>{desc}</p>
                    </div>
                    <ArrowRight size={16} color="#475569" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
