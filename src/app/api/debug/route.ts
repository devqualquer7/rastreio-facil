import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const results: any = {}
    
    // Check User table columns
    try {
      const cols = (query as any).db.prepare("PRAGMA table_info(User)").all()
      results.userColumns = cols.map((c: any) => c.name)
    } catch (e: any) {
      results.userColumnsError = e.message
    }
    
    // Check env vars (just presence, not values)
    results.envVars = {
      KEYAUTH_APPNAME: !!process.env.KEYAUTH_APPNAME,
      KEYAUTH_OWNERID: !!process.env.KEYAUTH_OWNERID,
      KEYAUTH_VERSION: process.env.KEYAUTH_VERSION || 'not set',
      DATABASE_URL: !!process.env.DATABASE_URL,
    }
    
    // Try creating a test user to see the actual error
    try {
      // Just test the INSERT statement without actually running it
      const testInsert = (query as any).db.prepare(
        'INSERT INTO User (id, username, email, password, keyauthKey, planExpiry) VALUES (?, ?, ?, ?, ?, ?)'
      )
      results.insertTest = 'Statement prepared OK'
    } catch (e: any) {
      results.insertError = e.message
    }
    
    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack?.substring(0, 500) })
  }
}
