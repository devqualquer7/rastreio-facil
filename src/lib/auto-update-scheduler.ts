// This module self-starts a periodic check for auto-update events
// It runs every 60 seconds and calls the cron logic directly

import { query } from '@/lib/db'

const BRT_OFFSET = -3

function getNowBrt(): Date {
  const now = new Date()
  return new Date(now.getTime() + BRT_OFFSET * 60 * 60 * 1000)
}

function getStepDateBrt(activatedAt: string, dayOffset: number, time: string): Date {
  const activated = new Date(activatedAt)
  const activatedBrt = new Date(activated.getTime() + BRT_OFFSET * 60 * 60 * 1000)
  const target = new Date(activatedBrt)
  target.setUTCDate(target.getUTCDate() + dayOffset)
  const [hours, minutes] = (time || '09:00').split(':').map(Number)
  target.setUTCHours(hours, minutes, 0, 0)
  return target
}

function processAutoUpdates() {
  try {
    const activeUpdates = query.getActiveAutoUpdates() as any[]
    if (activeUpdates.length === 0) return

    const nowBrt = getNowBrt()
    let totalEventsCreated = 0

    for (const tc of activeUpdates) {
      if (!tc.autoTemplateId || !tc.autoUpdateActivatedAt) continue

      const steps = query.getAutoTemplateSteps(tc.autoTemplateId) as any[]
      if (steps.length === 0) continue

      const lastStepIndex = tc.autoUpdateLastStepIndex ?? -1

      for (let i = 0; i < steps.length; i++) {
        if (i <= lastStepIndex) continue

        const step = steps[i]
        const stepDateBrt = getStepDateBrt(tc.autoUpdateActivatedAt, step.dayOffset, step.time)

        if (nowBrt >= stepDateBrt) {
          const year = stepDateBrt.getUTCFullYear()
          const month = String(stepDateBrt.getUTCMonth() + 1).padStart(2, '0')
          const day = String(stepDateBrt.getUTCDate()).padStart(2, '0')
          const hrs = String(stepDateBrt.getUTCHours()).padStart(2, '0')
          const mins = String(stepDateBrt.getUTCMinutes()).padStart(2, '0')
          const dateStr = year + '-' + month + '-' + day + 'T' + hrs + ':' + mins + ':00.000-03:00'
          const eventDate = new Date(dateStr)

          query.createTrackingEvent({
            trackingCodeId: tc.id,
            status: step.status,
            location: step.location || null,
            date: eventDate.toISOString()
          })
          query.updateAutoUpdateLastStep(tc.id, i)
          totalEventsCreated++
        } else {
          break
        }
      }

      // Check if all steps completed
      const newLastIndex = (query.getTrackingCodeById(tc.id) as any)?.autoUpdateLastStepIndex ?? -1
      if (newLastIndex >= steps.length - 1) {
        query.deactivateAutoUpdate(tc.id)
      }
    }

    if (totalEventsCreated > 0) {
      console.log(`[AutoUpdate Scheduler] Created ${totalEventsCreated} events at ${nowBrt.toISOString()}`)
    }
  } catch (error) {
    console.error('[AutoUpdate Scheduler] Error:', error)
  }
}

// Start the scheduler - runs every 60 seconds
let schedulerStarted = false

export function startAutoUpdateScheduler() {
  if (schedulerStarted) return
  schedulerStarted = true
  console.log('[AutoUpdate Scheduler] Started - checking every 60 seconds')
  
  // Run immediately on start
  processAutoUpdates()
  
  // Then every 60 seconds
  setInterval(processAutoUpdates, 60 * 1000)
}
