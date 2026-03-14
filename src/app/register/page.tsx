'use client'
import { useState } from 'react'
import { MapPin, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', email: '', password: '', key: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao criar conta'); return }
      router.push('/dashboard')
      router.refresh()
    } catch { setError('Erro de conexÃ£o. Tente novamente.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#06060f' }}>
      <div className="w-full max-w-sm">
        <a href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 0 20px rgba(79,70,229,0.4)' }}>
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-extrabold text-white">Rastreio<span style={{ color: '#818cf8' }}>FÃ¡cil</span></span>
        </a>
        {/* Registrar card */}
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
 "†       "ƒ]"R½Û–¹½½·ì‚&İ~J¯šøõETÕIMIQ•I=I}A¹©Í½¸ ¤(€€€€½¹ÍĞ‘…Ñ„€ô…İ…¥ĞÉ•Ì¹©Í½¸ ¤(€€€€¥˜€ …É•Ì¹½¬¤ìÍ•ÑÉÉ½È¡‘…Ñ„¹•ÉÉ½Èñğ€ÉÉ¼…¼É¥…È½¹Ñ„œ¤ìÉ•ÑÕÉ¸ô(€€€€É½ÕÑ•È¹ÁÕÍ  œ½‘…Í¡‰½…Éœ¤(€€€€É½ÕÑ•È¹É•™É•Í  ¤(€€ô…Ñ ìÍ•ÑÉÉ½È ÉÉ¼‘”½¹•ã¼¸Q•¹Ñ”¹½Ù…µ•¹Ñ”¸œ¤ô(€€€™¥¹…±±äìÍ•Ñ1½…‘¥¹œ¡™…±Í”¤ô(€ô(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€(€€€€€€€€€Š<T