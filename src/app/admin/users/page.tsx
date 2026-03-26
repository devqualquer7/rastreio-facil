'use client'
import { useState, useEffect } from 'react'
import { Users, ToggleLeft, ToggleRight, Plus, Minus, Package, RefreshCw, AlertTriangle, KeyRound } from 'lucide-react'

interface UserRow {
  id: string; username: string; email?: string
  expiresAt?: string; trackingLimit: number; trackingUsed: number
  active: number; createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [daysInput, setDaysInput] = useState('')
  const [trackingsInput, setTrackingsInput] = useState('')
  const [removeDaysInput, setRemoveDaysInput] = useState('')
  const [removeTrackingsInput, setRemoveTrackingsInput] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/admin/users').then(r => r.json()).then(d => { setUsers(d); setLoading(false) })
  }

  useEffect(load, [])

  const action = async (id: string, body: object) => {
    setActionLoading(id)
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    setActionLoading(null); load()
  }

  const now = new Date()

  const getDaysLeft = (expiresAt?: string) => {
    if (!expiresAt) return null
    const diff = Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }
