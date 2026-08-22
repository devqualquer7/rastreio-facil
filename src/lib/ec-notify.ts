'use client'

// Play cash register sound — real audio file with Web Audio fallback
export function playCashSound() {
  try {
    const audio = new Audio('/cash.mp3')
    audio.volume = 0.85
    audio.play().catch(() => playWebAudioFallback())
  } catch {
    playWebAudioFallback()
  }
}

function playWebAudioFallback() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const t = ctx.currentTime

    // First tone: high ping
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(1800, t)
    osc1.frequency.exponentialRampToValueAtTime(900, t + 0.12)
    gain1.gain.setValueAtTime(0.4, t)
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc1.start(t); osc1.stop(t + 0.12)

    // Second tone: lower ching
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1200, t + 0.06)
    osc2.frequency.exponentialRampToValueAtTime(600, t + 0.22)
    gain2.gain.setValueAtTime(0.3, t + 0.06)
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
    osc2.start(t + 0.06); osc2.stop(t + 0.22)

    setTimeout(() => ctx.close(), 500)
  } catch {
    // AudioContext not available
  }
}

export function fireOSNotification(title: string, body: string, tag: string) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, tag, icon: '/logo.png' })
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification(title, { body, tag, icon: '/logo.png' })
    })
  }
}

export function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
}
