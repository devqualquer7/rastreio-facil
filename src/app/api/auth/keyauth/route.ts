import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createUserSession } from '@/lib/session'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const KEYAUTH_NAME = process.env.KEYAUTH_APPNAME || ''
const KEYAUTH_OWNERID = process.env.KEYAUTH_OWNERID || ''
const KEYAUTH_VERSION = process.env.KEYAUTH_VERSION || '1.0'

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json()

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Informe sua licenÃ§a' }, { status: 400 })
    }

    if (!KEYAUTH_NAME || !KEYAUTH_OWNERID) {
      console.error('KeyAuth env vars missing: KEYAUTH_APPNAME, KEYAUTH_OWNERID')
      return NextResponse.json({ error: 'KeyAuth nÃ£o configurado no servidor' }, { status: 500 })
    }

    const trimmedKey = key.trim()

    // Step 1: Initialize KeyAuth session
    const initParams = new URLSearchParams({
      type: 'init',
      ver: KEYAUTH_VERSION,
      name: KEYAUTH_NAME,
      ownerid: KEYAUTH_OWNERID,
    })

    const initRes = await fetch('https://keyauth.win/api/1.2/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: initParams.toString(),
    })
    const initData = await initRes.json()
    console.log('KEYAUTH_DEBUG init:', JSON.stringify(initData))

    if (!initData.success) {
      console.error('KeyAuth init failed:', initData.message)
      return NextResponse.json({ error: 'Erro ao conectar com KeyAuth' }, { status: 500 })
    }

    const sessionId = initData.sessionid

    // Step 2: Validate license key
    const licenseParams = new URLSearchParams({
      type: 'license',
      key: trimmedKey,
      sessionid: sessionId,
      name: KEYAUTH_NAME,
      ownerid: KEYAUTH_OWNERID,
    })

    const licenseRes = await fetch('https://keyauth.win/api/1.2/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: licenseParams.toString(),
    })
    const licenseData = await licenseRes.json()
    console.log('KEYAUTH_DEBUG license:', JSON.stringify(licenseData))
    console.log('KEYAUTH_DEBUG params: name=' + KEYAUTH_NAME + ' ownerid=' + KEYAUTH_OWNERID + ' key=' + trimmedKey)

    if (!licenseData.success) {
      const msg = licenseData.message || 'LicenÃ§a invÃ¡lida'
      return NextResponse.json({ error: msg }, { status: 401 })
    }

    // Step 3: Extract KeyAuth info
    const keyauthUsername = licenseData.info?.username || trimmedKey
    const subscriptions = licenseData.info?.subscriptions || []
    const expiryTimestamp = subscriptions[0]?.expiry
    const expiry = expiryTimestamp
      ? new Date(Number(expiryTimestamp) * 1000).toISOString()
      : null

    // Step 4: Find or create local user
    let user = query.getUserByKeyauthKey(trimmedKey) as any

    if (!user) {
      // Check if username is taken (add suffix if so)
      let username = keyauthUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '')
      if (!username) username = 'user-' + randomUUID().substring(0, 8)
      const existing = query.getUserByUsername(username) as any
      if (existing) username = username + '-' + randomUUID().substring(0, 4)

      // Create new user with random password (not used for login)
      const randomPassword = await bcrypt.hash(randomUUID(), 10)
      user = query.createUser({
        username,
        password: randomPassword,
        expiresAt: expiry || undefined,
        keyauthKey: trimmedKey,
      })
    } else {
      // Existing user - update expiry from KeyAuth subscription
      if (expiry) {
        query.updateUser(user.id, { expiresAt: expiry, active: 1 })
      }
    }

    // Step 5: Create session
    await createUserSession(user.id)

    return NextResponse.json({ success: true, username: user.username })
  } catch (error) {
    console.error('KeyAuth auth error:', error)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
