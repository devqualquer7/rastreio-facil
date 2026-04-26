/**
 * Bridge state — in-memory request correlation.
 *
 * When the mobile sends a command, we publish via Pusher to the desktop
 * and create a pending Promise. When the desktop POSTs the response back,
 * we resolve that Promise.
 *
 * State lives only in memory on the Render server — a server restart kills
 * pending requests but that's OK (clients retry).
 */

type Pending = {
  resolve: (data: any) => void
  reject: (err: Error) => void
  timeout: NodeJS.Timeout
}

const pending = new Map<string, Pending>()

const DEFAULT_TIMEOUT_MS = 20_000

export function awaitResponse(reqId: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(reqId)
      reject(new Error('PC offline ou tempo esgotado.'))
    }, timeoutMs)

    pending.set(reqId, { resolve, reject, timeout })
  })
}

export function deliverResponse(reqId: string, payload: any): boolean {
  const p = pending.get(reqId)
  if (!p) return false
  clearTimeout(p.timeout)
  pending.delete(reqId)
  p.resolve(payload)
  return true
}

export function deliverError(reqId: string, message: string): boolean {
  const p = pending.get(reqId)
  if (!p) return false
  clearTimeout(p.timeout)
  pending.delete(reqId)
  p.reject(new Error(message))
  return true
}

export function getPendingCount(): number {
  return pending.size
}
