'use client'
import { useState, useEffect } from 'react'
import { MapPin, Package, RefreshCw, LogOut, Menu, X, AlertTriangle, Clock } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

interface UserInfo {
  id: string; username: string; email?: string
  expiresAt?: string; trackingLimit: number; trackingUsed: number
  active: number; daysLeft: number | null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    fetch('/api/user/me').then(r => r.json()).then(d => {
      if (d.error) router.push('/login')
      else setUser(d)
    }).catch(() => router.push('/login'))
  }, [router])

  const logout = async () => {
    await fetch('/api/user/logout', { method: 'POST' })
    router.push('/login')
  }

  const nav = [
    { href: '/dashboard', label: 'Meus Rastreios', Icon: Package },
    { href: '/dashboard/renovar', label: 'Renovar / Planos', Icon: RefreshCw },
  ]

  const isExpiringSoon = user?.daysLeft !== null && user?.daysLeft !== undefined && user.daysLeft <= 7 && user.daysLeft > 0
  const isExpired = user?.daysLeft !== null && user?.daysLeft !== undefined && user.daysLeft <= 0

  return (
    <div className="min-h-screen flex" style={{ background: '#06060f', color: '#e2e8f0' }}>
      {/* Sidebar desktop */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0" style={{ background: '#09090f', borderRight: '1px solid rgba(99,102,241,0.12)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
          <a href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-white text-sm">Rastreio<span style={{ color: '#818cf8' }}>F√°cil</span></span>
          </a>
        </div>

        {/* User info */}
        {user && (
          <div className="px-4 py-3 mx-3 mt-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <p className="text-xs font-semibold text-white">{user.username}</p>
            <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{user.trackingUsed}/{user.trackingLimit} rastreios'>
            {user.expiresAt && (
              <p className="text-xs mt-0.5" style={{ color: isExpired ? '#ef4444' : isExpiringSoon ? '#f97316' : '#64748b' }}>
                {isExpired ? '‚ùÑ Expirado' : `Expira em ${user.daysLeft}d`@}
              </p>
            )}
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, label, Icon }) => (
            <a key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: pathname === href ? 'rgba(99,102,241,0.15)' : 'transparent',
                color: pathname === href ? '#a5b4fc' : '#94a3b8',
                border: pathname === href ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
              }}>
              <Icon className="w-4 h-4" /> {label}
            </a>
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
(ÄÄÄÄÄÄÄä<TÄÄÄÄÄ÷Tÿ¯((ÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâ¿¥ÃÅâΩ…ëï»µ–àÅÕ—Â±îıÌÏÅâΩ…ëï…Ω±Ω»ËÄù…ùâÑ†‰‰∞ƒ¿»∞»–ƒ∞¿∏ƒ»§úÅıÙ¯(ÄÄÄÄÄÄÄÄÄÄÒâ’——Ω∏ÅΩπ±•ç¨ıÌ±ΩùΩ’—Ù(ÄÄÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîÙâô±ï‡Å•—ïµÃµçïπ—ï»ÅùÖ¿¥ÃÅ‹µô’±∞Å¡‡¥ÃÅ¡‰¥»∏‘Å…Ω’πëïêµ·∞Å—ï·–µÕ¥ÅôΩπ–µµïë•’¥Å—…ÖπÕ•—•Ω∏µÖ±∞à(ÄÄÄÄÄÄÄÄÄÄÄÅÕ—Â±îıÌÏÅçΩ±Ω»ËÄúåÿ–‹–·àúÅıÙ(ÄÄÄÄÄÄÄÄÄÄÄÅΩπ5Ω’Õïπ—ï»ıÌîÄÙ¯Ä°îπç’……ïπ—QÖ…ùï–πÕ—Â±îπçΩ±Ω»ÄÙÄúçò≈ò’ò‰ú•Ù(ÄÄÄÄÄÄÄÄÄÄÄÅΩπ5Ω’Õï1ïÖŸîıÌîÄÙ¯Ä°îπç’……ïπ—QÖ…ùï–πÕ—Â±îπçΩ±Ω»ÄÙÄúåÿ–‹–·àú•Ù¯(ÄÄÄÄÄÄÄÄÄÄÄÄÒ1Ωù=’–Åç±ÖÕÕ9ÖµîÙâ‹¥–Å†¥–àÄº¯ÅMÖ•»(ÄÄÄÄÄÄÄÄÄÄΩâ’——Ω∏¯(ÄÄÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄΩÖÕ•ëî¯((ÄÄÄÄÄÅÏº®Å5Ωâ•±îÅ°ïÖëï»Ä®ΩÙ(ÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâµêÈ°•ëëï∏Åô•·ïêÅ—Ω¿¥¿Å±ïô–¥¿Å…•ù°–¥¿ÅË¥‘¿Åô±ï‡Å•—ïµÃµçïπ—ï»Å©’Õ—•ô‰µâï—›ïï∏Å¡‡¥–Å†¥ƒ–à(ÄÄÄÄÄÄÄÅÕ—Â±îıÌÏÅâÖç≠ù…Ω’πêËÄù…ùâÑ†‰∞‰∞ƒ‘∞¿∏‰‘§ú∞ÅâΩ…ëï…	Ω——Ω¥ËÄú≈¡‡ÅÕΩ±•êÅ…ùâÑ†‰‰∞ƒ¿»∞»–ƒ∞¿∏ƒ»§ú∞ÅâÖç≠ë…Ω¡•±—ï»ËÄùâ±’»†ƒ¡¡‡§úÅıÙ¯(ÄÄÄÄÄÄÄÄÒÑÅ°…ïòÙàºàÅç±ÖÕÕ9ÖµîÙâô±ï‡Å•—ïµÃµçïπ—ï»ÅùÖ¿¥»à¯(ÄÄÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâ‹¥‹Å†¥‹Å…Ω’πëïêµ±úÅô±ï‡Å•—ïµÃµçïπ—ï»Å©’Õ—•ô‰µçïπ—ï»àÅÕ—Â±îıÌÏÅâÖç≠ù…Ω’πêËÄù±•πïÖ»µù…Öë•ïπ–†ƒÃ’ëïú∞å—ò–Ÿî‘∞å›åÕÖïê§úÅıÙ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÒ5Ö¡A•∏Åç±ÖÕÕ9ÖµîÙâ‹¥Ã∏‘Å†¥Ã∏‘Å—ï·–µ›°•—îàÄº¯(ÄÄÄÄÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄÄÄÄÄÒÕ¡Ö∏Åç±ÖÕÕ9ÖµîÙâôΩπ–µï·—…ÖâΩ±êÅ—ï·–µ›°•—îÅ—ï·–µÕ¥à˘IÖÕ—…ï•ºÒÕ¡Ö∏ÅÕ—Â±îıÌÏÅçΩ±Ω»ËÄúå‡ƒ·çò‡úÅıÙ˘Öç•∞ΩÕ¡Ö∏¯ΩÕ¡Ö∏¯(ÄÄÄÄÄÄÄÄΩÑ¯(ÄÄÄÄÄÄÄÄÒâ’——Ω∏ÅΩπ±•ç¨ıÏ†§ÄÙ¯ÅÕï—5Ωâ•±ï=¡ï∏°¿ÄÙ¯ÄÖ¿•ÙÅÕ—Â±îıÌÏÅçΩ±Ω»ËÄúå‰—ÑÕà‡úÅıÙ¯(ÄÄÄÄÄÄÄÄÄÅÌµΩâ•±ï=¡ï∏Ä¸ÄÒ`Åç±ÖÕÕ9ÖµîÙâ‹¥‘Å†¥‘àÄº¯ÄËÄÒ5ïπ‘Åç±ÖÕÕ9ÖµîÙâ‹¥‘Å†¥‘àÄº˘Ù(ÄÄÄÄÄÄÄÄΩâ’——Ω∏¯(ÄÄÄÄÄÄΩë•ÿ¯((ÄÄÄÄÄÅÏº®Å5Ωâ•±îÅµïπ‘Ä®ΩÙ(ÄÄÄÄÄÅÌµΩâ•±ï=¡ï∏ÄòòÄ†(ÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâµêÈ°•ëëï∏Åô•·ïêÅ•πÕï–¥¿ÅË¥–¿Å¡–¥ƒ–àÅÕ—Â±îıÌÏÅâÖç≠ù…Ω’πêËÄúå¿‰¿‰¡òúÅıÙ¯(ÄÄÄÄÄÄÄÄÄÄÒπÖÿÅç±ÖÕÕ9ÖµîÙâ¡‡¥–Å¡‰¥–ÅÕ¡Öçîµ‰¥ƒà¯(ÄÄÄÄÄÄÄÄÄÄÄÅÌπÖÿπµÖ¿†°ÏÅ°…ïò∞Å±Öâï∞∞Å%çΩ∏ÅÙ§ÄÙ¯Ä†(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒÑÅ≠ï‰ıÌ°…ïôÙÅ°…ïòıÌ°…ïôÙÅΩπ±•ç¨ıÏ†§ÄÙ¯ÅÕï—5Ωâ•±ï=¡ï∏°ôÖ±Õî•Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅç±ÖÕÕ9ÖµîÙâô±ï‡Å•—ïµÃµçïπ—ï»ÅùÖ¿¥ÃÅ¡‡¥–Å¡‰¥ÃÅ…Ω’πëïêµ·∞Å—ï·–µÕ¥ÅôΩπ–µµïë•’¥à(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅÕ—Â±îıÌÏÅâÖç≠ù…Ω’πêËÅ¡Ö—°πÖµîÄÙÙÙÅ°…ïòÄ¸Äù…ùâÑ†‰‰∞ƒ¿»∞»–ƒ∞¿∏ƒ‘§úÄËÄù…ùâÑ†»‘‘∞»‘‘∞»‘‘∞¿∏¿Ã§ú∞ÅçΩ±Ω»ËÅ¡Ö—°πÖµîÄÙÙÙÅ°…ïòÄ¸ÄúçÑ’à—ôåúÄËÄúå‰—ÑÕà‡úÅıÙ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ%çΩ∏Åç±ÖÕÕ9ÖµîÙâ‹¥–Å†¥–àÄº¯ÅÌ±Öâï±Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄΩÑ¯(ÄÄÄÄÄÄÄÄÄÄÄÄ§•Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÒâ’——Ω∏ÅΩπ±•ç¨ıÌ±ΩùΩ’—ÙÅç±ÖÕÕ9ÖµîÙâô±ï‡Å•—ïµÃµçïπ—ï»ÅùÖ¿¥ÃÅ‹µô’±∞Å¡‡¥–Å¡‰¥ÃÅ…Ω’πëïêµ·∞Å—ï·–µÕ¥ÅôΩπ–µµïë•’¥Åµ–¥»àÅÕ—Â±îıÌÏÅçΩ±Ω»ËÄúåÿ–‹–·àúÅıÙ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÒ1Ωù=’–Åç±ÖÕÕ9ÖµîÙâ‹¥–Å†¥–àÄº¯ÅMÖ•»(ÄÄÄÄÄÄÄÄÄÄÄÄΩâ’——Ω∏¯(ÄÄÄÄÄÄÄÄÄÄΩπÖÿ¯(ÄÄÄÄÄÄÄÄΩë•ÿ¯(ÄÄÄÄÄÄ•Ù((ÄÄÄÄÄÅÏº®Å5Ö•∏ÅçΩπ—ïπ–Ä®ΩÙ(ÄÄÄÄÄÄÒµÖ•∏Åç±ÖÕÕ9ÖµîÙâô±ï‡¥ƒÅµêÈΩŸï…ô±Ω‹µÖ’—ºà¯(ÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâµêÈ°•ëëï∏Å†¥ƒ–àÄº¯((ÄÄÄÄÄÄÄÅÏº®Å	Öππï…ÃÅëîÅï·¡•…áüçºÄ®ΩÙ(ÄÄÄÄÄÄÄÅÏ°•Õ·¡•…•πùMΩΩ∏ÅÒÅ•Õ·¡•…ïê§ÄòòÄ†(ÄÄÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâ¡‡¥–Å¡–¥–à¯(ÄÄÄÄÄÄÄÄÄÄÄÄÒë•ÿÅç±ÖÕÕ9ÖµîÙâô±ï‡Å•—ïµÃµçïπ—ï»ÅùÖ¿¥ÃÅ¡‡¥‘Å¡‰¥ÃÅ…Ω’πëïêµ·∞Å—ï·–µÕ¥ÅôΩπ–µÕïµ•âΩ±êà(ÄÄÄÄÄÄÄÄÄÄÄÄÄÅÕ—Â±îıÌÏ(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅâÖç≠ù…Ω’πêËÅ•Õ·¡•…ïêÄ¸Äù…ùâÑ†»Ã‰∞ÿ‡∞ÿ‡∞¿∏ƒ»§úÄËÄù…ùâÑ†»–‰∞ƒƒ‘∞»»∞¿∏ƒ»§ú∞(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅâΩ…ëï»ËÅÄ≈¡‡ÅÕΩ±•êÄëÌ•Õ·¡•…ïêÄ¸Äù…ùâÑ†»Ã‰∞ÿ‡∞ÿ‡∞¿∏Ã§úÄËÄù…ùâÑ†»–‰∞ƒƒ‘∞»»∞¿∏Ã§ùıÄ∞(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÅçΩ±Ω»ËÅ•Õ·¡•…ïêÄ¸ÄúçôçÑ’Ñ‘úÄËÄúçôëâÑ‹–ú∞(ÄÄÄÄÄÄÄÄÄÄÄÄÄÅıÙ¯(ÄÄÄÄÄÄÄÄÄÄÄÄÄÅÌ•Õ·¡•…ïêÄ¸ÄÒ±ï…—Q…•Öπù±îÅç±ÖÕÕ9ÖµîÙâ‹¥–Å†¥–Åô±ï‡µÕ°…•π¨¥¿àÄº¯ÄËÄÒ±Ωç¨Åç±ÖÕÕ9ÖµîÙâÿ¥–Å†¥–Åô±ï‡µÕ°…•π¨¥¿àÄº˘Ù(ÄÄÄÄÄÄÄÄÄÄÄÄÄÅÌ•Õ·¡•…ïê(ÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄÄ¸ÄüävÅM’ÑÅÖÕÕ•πÖ—’…ÑÅï·¡•…Ω‘∏ÅIïπΩŸîÅÖùΩ…ÑÅ¡Ö…ÑÅçΩπ—•π◊V«FÚ7&ñ"&7G&Vñ˜2‚p¢¢)™˚àÚ7V76ñÊGW&Wáó&V“G∑W6W#ÚÊFó4∆VgG“FñG∑W6W#ÚÊFó4∆VgB””“Úrr¢w2w“‚&VÊ˜fR&Ï:6ÚW&FW"Ú6W76ÚÊ–¢∆á&Vc“"ˆF6Ü&ˆ&B˜&VÊ˜f""6∆74Ê÷S“&÷¬÷WFÚf∆WÇ◊6á&ñÊ≤”VÊFW&∆ñÊRfˆÁB÷&ˆ∆B#Â&VÊ˜f"v˜&¬ˆ‡¢¬ˆFóc‡¢¬ˆFóc‡¢ó–†¢∆Fób6∆74Ê÷S“'”B÷Cß”Ç#‡¢∂6Üñ∆G&VÁ–¢¬ˆFóc‡¢¬ˆ÷ñ„‡¢¬ˆFóc‡¢êß–†