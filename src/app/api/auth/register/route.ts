import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { createUserSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

const KEYAUTH_NAME = process.env.KEYAUTH_APPNAME || ''
const KEYAUTH_OWNERID = process.env.KEYAUTH_OWNERID || ''
const KEYAUTH_VERSION = process.env.KEYAUTH_VERSION || '1.0'

export async function POST(request: NextRequest) {
  try {
    const { username, password, key } = await request.json()

    // Validate inputs
    const trimUser = String(username || '').trim()
    const trimPass = String(password || '').trim()
    const trimKey = String(key || '').trim()

    if (!trimUser || !trimPass || !trimKey) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
    }
    if (trimUser.length < 3 || trimUser.length > 32) {
      return NextResponse.json({ error: 'Usuário deve ter entre 3 e 32 caracteres' }, { status: 400 })
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimUser)) {
      return NextResponse.json({ error: 'Usuário pode conter apenas letras, números, _ e -' }, { status: 400 })
    }
    if (trimPass.length < 6 || trimPass.length > 128) {
      return NextResponse.json({ error: 'Senha deve ter entre 6 e 128 caracteres' }, { status: 400 })
    }

    // Check if username already taken
    const existingUser = query.getUserByUsername(trimUser) as any
    if (existingUser) {
      return NextResponse.json({ error: 'Este nome de usuário já está em uso' }, { status: 409 })
    }

    // Check if key already used
    const existingKey = query.getUserByKeyauthKey(trimKey) as any
    if (existingKey) {
      return NextResponse.json({ error: 'Esta chave de licença já foi utilizada' }, { status: 409 })
    }

    // Validate key with KeyAuth
    if (!KEYAUTH_NAME || !KEYAUTH_OWNERID) {
      console.error('KeyAuth env vars missing: KEYAUTH_APPNAME, KEYAUTH_OWNERID')
      return NextResponse.json({ error: 'KeyAuth não configurado no servidor' }, { status: 500 })
    }

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
    if (!initData.success) {
      console.error('KeyAuth init failed:', initData.message)
      return NextResponse.json({ error: 'Erro ao conectar com KeyAuth' }, { status: 500 })
    }

    // Step 2: Validate license key
    const licenseParams = new URLSearchParams({
      type: 'license',
      key: trimKey,
      sessionid: initData.sessionid,
      name: KEYAUTH_NAME,
      ownerid: KEYAUTH_OWNERID,
    })
    const licenseRes = await fetch('https://keyauth.win/api/1.2/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: licenseParams.toString(),
    })
    const licenseData = await licenseRes.json()
    if (!licenseData.success) {
      const msg = licenseData.message || 'Licença inválida'
      return NextResponse.json({ error: msg }, { status: 401 })
    }

    // Step 3: Extract subscription info
    const subscriptions = licenseData.info?.subscriptions || []
    const expiryTimestamp = subscriptions[0]?.expiry
    const expiry = expiryTimestamp ? new Date(Number(expiryTimestamp) * 1000).toISOString() : null

    // Step 4: Create user with chosen username and hashed password
    const hashedPassword = await bcrypt.hash(trimPass, 12)
    const user = query.createUser({
      username: trimUser,
      password: hashedPassword,
      expiresAt: expiry || undefined,
      keyauthKey: trimKey,
    })

    // Step 5: Create session and log user in
    await createUserSession((user as any).id)

    return NextResponse.json({ success: true, username: (user as any).username })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
