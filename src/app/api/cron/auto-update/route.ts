import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

// BRT timezone offset (UTC-3)
const BRT_OFFSET = -3

function getNowBrt(): Date {
  const now = new Date()
  return new Date(now.getTime() + BRT_OFFSET * 60 * 60 * 1000)
}

function getStepDateBrt(activatedAt: string, dayOffset: number, time: string): Date {
  // activatedAt is ISO string in UTC. Convert to BRT date.
  const activated = new Date(activatedAt)
  const activatedBrt = new Date(activated.getTime() + BRT_OFFSET * 60 * 60 * 1000)

  // Target date = activation date + dayOffset
  const target = new Date(activatedBrt)
  target.setUTCDate(target.getUTCDate() + dayOffset)

  // Set the time from the step (already in BRT)
  const [hours, minutes] = (time || '09:00').split(':').map(Number)
  target.setUTCHours(hours, minutes, 0, 0)

  return target
}

// This endpoint should be called every minute by an external cron service
// or by the app's built-in scheduler
export async function GET() {
  try {
    const activeUpdates = query.getActiveAutoUpdates() as any[]

    if (activeUpdates.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No active automations' })
    }

    const nowBrt = getNowBrt()
    let totalEventsCreated = 0

    for (const tc of activeUpdates) {
      if (!tc.autoTemplateId || !tc.autoActivatedAt) continue

      const steps = query.getAutoTemplateSteps(tc.autoTemplateId) as any[]
      if (steps.length === 0) continue

      const lastStepIndex = tc.autoUpdateLastStepIndex ?? -1

      for (let i = 0; i < steps.length; i++) {
        // Skip already processed steps
        if (i <= lastStepIndex) continue

        const step = steps[i]
        const stepDateBrt = getStepDateBrt(tc.autoActivatedAt, step.dayOffset, step.time)

        // Check if it's time for this step (step time has passed)
        if (nowBrt >= stepDateBrt) {
          // Convert to proper ISO with BRT offset for storage
          const year = stepDateBrt.getUTCFullYear()
          const month = String(stepDateBrt.getUTCMonth() + 1).padStart(2, '0')
          const day = String(stepDateBrt.getUTCDate()).padStart(2, '0')
          const hrs = String(stepDateBrt.getUTCHours()).padStart(2, '0')
          const mins = String(stepDateBrt.getUTCMinutes()).padStart(2, '0')
          const dateStr = year + '-' + month + '-' + day + 'T' + hrs + ':' + mins + ':00.000-03:00'
          const eventDate = new Date(dateStr)

          // Create the tracking event
          query.createTrackingEvent({
            trackingCodeId: tc.id,
            status: step.status,
            location: step.location || null,
            date: eventDate.toISOString()
          })

          // Update the last processed step index
          query.updateAutoUpdateLastStep(tc.id, i)
          totalEventsCreated++
        } else {
          // Steps are ordered by time, so if this one hasn't passed, stop
          break
        }
      }

      // If all steps have been processed, deactivate the automation
      const newLastIndex = (query.getTrackingCodeById(tc.id) as any)?.autoUpdateLastStepIndex ?? -1
      if (newLastIndex >= steps.length - 1) {
        query.deactivateAutoUpdate(tc.id)
      }
    }

    return NextResponse.json({
      processed: activeUpdates.length,
      eventsCreated: totalEventsCreated,
      timestamp: nowBrt.toISOString()
    })
  } catch (error) {
    console.error('Cron auto-update error:', error)
    return NextResponse.json({ error: 'Erro no cron' }, { status: 500 })
  }
}
