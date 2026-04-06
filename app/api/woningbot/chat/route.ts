import { NextResponse } from 'next/server'

export const maxDuration = 120

const WONINGBOT_API_URL = process.env.WONINGBOT_API_URL || 'http://localhost:3001'
const WONINGBOT_API_KEY = process.env.WONINGBOT_API_KEY || ''

export async function POST(request: Request) {
  const { message, sessionId } = await request.json()

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  try {
    const res = await fetch(`${WONINGBOT_API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': WONINGBOT_API_KEY,
      },
      body: JSON.stringify({ message, sessionId }),
    })

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Woningbot niet bereikbaar' }))
      return NextResponse.json(error, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Woningbot proxy error:', error)
    return NextResponse.json(
      { error: 'Kon geen verbinding maken met de woningbot. Is de service actief?' },
      { status: 502 }
    )
  }
}
