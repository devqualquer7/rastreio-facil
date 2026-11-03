import { NextResponse } from 'next/server'
import { lastSyncStatus } from '@/lib/ec-ledger'

// GET /api/ec/repasses/status — só a hora do último sync e as etapas que falharam, sem valores
export async function GET() {
  return NextResponse.json({ ok: true, ...lastSyncStatus() })
}
