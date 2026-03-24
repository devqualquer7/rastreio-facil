import { query } from './db'

/**
 * Process pending auto-updates for a user's tracking codes.
 * Called lazily when tracking codes are fetched.
 * Checks each tracking code with auto-update enabled and creates
 * any events that should have fired based on the template schedule.
 */
export function processAutoUpdates(userId: string) {
  try {
    const codes = query.getTrackingCodesWithAutoUpdate(userId)
    const now = new Date()

    for (const tc of codes as any[]) {
      if (!tc.autoTemplateId || !tc.autoActivatedAt) continue

      const steps = query.getAutoTemplateSteps(tc.autoTemplateId) as any[]
      if (!steps.length) continue

      const activatedAt = new Date(tc.autoActivatedAt)

      for (const step of steps) {
        const fireDate = new Date(activatedAt)
        fireDate.setDate(fireDate.getDate() + step.dayOffset)
        const [hours, minutes] = (step.time || '08:00').split(':').map(Number)
        fireDate.setHours(hours, minutes, 0, 0)

        if (fireDate > now) continue

        const existingEvents = query.getEventsByCodeId(tc.id) as any[]
        const alreadyExists = existingEvents.some(
          (ev: any) => ev.status === step.status && ev.location === (step.location || null)
            && Math.abs(new Date(ev.date).getTime() - fireDate.getTime()) < 60000
        )

        if (!alreadyExists) {
          query.createTrackingEvent({
            trackingCodeId: tc.id,
            status: step.status,
            location: step.location || null,
            date: fireDate.toISOString(),
          })
        }
      }
    }
  } catch (err) {
    console.error('Error processing auto-update:', err)
  }
}
