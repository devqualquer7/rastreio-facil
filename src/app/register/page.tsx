'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/login')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#06060f' }}>
      <p className="text-sm" style={{ color: '#64748b' }}>Redirecionando...</p>
    </div>
  )
}
