export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAutoUpdateScheduler } = await import('@/lib/auto-update-scheduler')
    startAutoUpdateScheduler()
  }
}
