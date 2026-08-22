import { NextResponse } from 'next/server'
import { deleteCheckoutSession } from '@/lib/checkout-session'

export async function POST() {
  await deleteCheckoutSession()
  return NextResponse.json({ success: true })
}
