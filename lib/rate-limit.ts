import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'
import { logSecurity } from './logger'

const redis = Redis.fromEnv()

const limiters = {
  EXPENSIVE: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'rl:expensive',
  }),
  MEDIUM: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:medium',
  }),
  LIGHT: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'rl:light',
  }),
  GLOBAL: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
    prefix: 'rl:global',
  }),
}

export type RateLimitTier = 'EXPENSIVE' | 'MEDIUM' | 'LIGHT'

export async function checkRateLimit(userId: string, tier: RateLimitTier): Promise<NextResponse | null> {
  const [userResult, globalResult] = await Promise.all([
    limiters[tier].limit(userId),
    limiters.GLOBAL.limit('global'),
  ])

  const failing = !userResult.success ? userResult : !globalResult.success ? globalResult : null
  if (!failing) return null

  const bucket = !userResult.success ? tier : 'GLOBAL'
  logSecurity({ action: 'rate_limit_exceeded', userId, reason: `bucket=${bucket}` })

  const retryAfter = Math.max(1, Math.ceil((failing.reset - Date.now()) / 1000))
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}
