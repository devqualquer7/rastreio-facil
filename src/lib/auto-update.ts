import { query } from './db'

/**
 * Process pending auto-updates for a user's tracking codes.
 * Called lazily when tracking codes are fetched.
 * Checks each tracking code with auto-update enabled and creates
 * any events that should have fired based on the template schedule.
 *
 * All step times are interpreted as Brasília time (UTC-3).
 * "Dia 0" refers to the Brasília-date when auto-update was activated.
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

      // Convert activation time to Brasília to find the correct calendar date.
      // Brasília = UTC-3, so subtract 3 hours to get BRT representation.
      const activatedBRT = new Date(activatedAt.getTime() - 3 * 60 * 60 * 1000)
      // Start of activation day in BRT (00:00 BRT = 03:00 UTC)
      const dayStartUTC = Date.UTC(
        activatedBRT.getUTCFullYear(),
        activatedBRT.getUTCMonth(),
        activatedBRT.getUTCDate(),
        3, 0, 0, 0
      )

      for (const step of steps) {
        const fireDate = new Date(dayStartUTC)
        // Add the day offset
        fireDate.setUTCDate(fireDate.getUTCDate() + step.dayOffset)

        const [hours, minutes] = (step.time || '08:00').split(':').map(Number)
        // Step times are in Brasília (UTC-3), convert to UTC by adding 3 hours
        fireDate.setUTCHours(hours + 3, minutes, 0, 0)

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
