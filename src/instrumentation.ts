export async function register() {
  // Only run the scheduler on the server (not during build or on edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const INTERVAL_MS = 60_000 // 1 minute

    const runCron = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
        const res = await fetch(`${baseUrl}/api/cron/auto-update`)
        if (res.ok) {
          const data = await res.json()
          if (data.eventsCreated > 0) {
            console.log(`[Auto-Update] Created ${data.eventsCreated} events`)
          }
        }
      } catch (e) {
        // Silently ignore errors during startup (server not ready yet)
      }
    }

    // Wait 10 seconds for the server to fully start, then run every minute
    setTimeout(() => {
      runCron()
      setInterval(runCron, INTERVAL_MS)
    }, 10_000)
  }
}
