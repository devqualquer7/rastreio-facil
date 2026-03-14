'use client'
import { useState, useEffect } from 'react'
import { Key, Plus, Trash2, Copy, CheckCircle2, Users } from 'lucide-react'

interface RegKey { id: string; key: string; used: number; usedById: string | null; usedAt: string | null; createdAt: string }

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<RegKey[]>([])
  const [loading, setLoading] = useState(true)
  const [genCount, setGenCount] = useState(1)
  const [generating, setGenerating]u = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/keys').then(r => r.json()).then(d => { setKeys(d); setLoading(false) })
  }

  useEffect(load, [])

  const generate = async () => {
    setGenerating(true)
    await fetch('/api/admin/keys', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: genCount }),
    })
    setGenerating(false); load()
  }

 