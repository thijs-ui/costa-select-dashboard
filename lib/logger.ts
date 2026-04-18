type LogLevel = 'info' | 'warn' | 'error'

export type SecurityEvent = {
  action:
    | 'auth_failure'
    | 'forbidden'
    | 'rate_limit_exceeded'
    | 'webhook_auth_failure'
  userId?: string
  path?: string
  ip?: string | null
  reason?: string
  metadata?: Record<string, unknown>
}

export type AuditEvent = {
  action: string
  userId: string
  resource?: string
  metadata?: Record<string, unknown>
}

export function logSecurity(event: SecurityEvent, level: LogLevel = 'warn'): void {
  const entry = { timestamp: new Date().toISOString(), type: 'security', level, ...event }
  const fn = level === 'error' ? console.error : console.warn
  fn('[SECURITY]', JSON.stringify(entry))
}

export function logAudit(event: AuditEvent): void {
  const entry = { timestamp: new Date().toISOString(), type: 'audit', ...event }
  console.log('[AUDIT]', JSON.stringify(entry))
}
