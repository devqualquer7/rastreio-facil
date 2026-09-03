'use client'
import { useEffect, useRef } from 'react'

const POLL_INTERVAL = 15_000 // 15 segundos — checa os últimos links pagos

export function usePolling(enabled: boolean, fn: () => Promise<void>) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(() => { fnRef.current() }, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [enabled])
}
