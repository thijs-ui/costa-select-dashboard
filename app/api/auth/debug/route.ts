import { NextResponse } from 'next/server'

export async function GET() {
  const val = process.env.DASHBOARD_PASSWORD
  return NextResponse.json({
    set: !!val,
    length: val?.length ?? 0,
    first3: val?.substring(0, 3) ?? '',
  })
}
